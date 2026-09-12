from datetime import datetime
from pathlib import Path
import json
import os
from threading import Lock, Thread

import pandas as pd
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, desc, func

from app.db import Base, SessionLocal, engine
from app.models import Anomaly, Station, TelemetryReading
from app.ml.feature_engineering import create_features
from app.ml.random_forest import FEATURE_COLUMNS, train_random_forest
from app.services.anomaly_service import AnomalyService
from app.services.connection_manager import ConnectionManager
from app.services.station_history import StationHistory

app = FastAPI(title="AeroAlert API", description="Intelligent anomaly detection for weather stations", version="0.8.1")

# Allow local development plus Vercel deployment URLs. Vercel creates
# deployment-specific hostnames, so an exact FRONTEND_URL alone is not enough.
origins = ["http://localhost:3000"]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WeatherReading(BaseModel):
    timestamp: datetime
    station_id: str
    temperature: float | None
    pressure: float | None
    humidity: float | None

class OperatorDecision(BaseModel):
    decision: str

BASE_DIR = Path(__file__).resolve().parent.parent
TRAIN_PATH = BASE_DIR / "data" / "simulated" / "training_data.csv"
_model = None
_anomaly_service = None
_model_lock = Lock()

def get_anomaly_service() -> AnomalyService:
    global _model, _anomaly_service
    if _anomaly_service is not None:
        return _anomaly_service
    with _model_lock:
        if _anomaly_service is None:
            print("Loading training data...")
            training_df = pd.read_csv(TRAIN_PATH)
            training_df["timestamp"] = pd.to_datetime(training_df["timestamp"], utc=True)
            training_df = create_features(training_df)
            ml_data = training_df.dropna(subset=FEATURE_COLUMNS)
            print("Training Random Forest...")
            _model = train_random_forest(ml_data[FEATURE_COLUMNS], ml_data["anomaly_type"])
            _anomaly_service = AnomalyService(_model)
            print("Model ready.")
    return _anomaly_service

station_history = StationHistory(max_length=48)
connection_manager = ConnectionManager()
Base.metadata.create_all(engine)

def ensure_station(session, station_id: str):
    station = session.scalar(select(Station).where(Station.station_id == station_id))
    if station is None:
        station = Station(station_id=station_id, name=f"{station_id} AWS")
        session.add(station)
        session.flush()
    return station

def seed_demo_if_empty():
    try:
        with SessionLocal() as session:
            count = session.scalar(select(func.count(TelemetryReading.id)).where(TelemetryReading.station_id == "LUCKNOW_001")) or 0
        if count > 0:
            print("Demo telemetry already exists; skipping seed.")
            return
        print("No demo telemetry found; seeding public demo in background...")
        from scripts.init_database import STATIONS, build_service, seed_demo, seed_station
        service = build_service()
        with SessionLocal() as session:
            for station_id, name in STATIONS:
                seed_station(session, station_id, name)
            seed_demo(session, service)
            session.commit()
        print("Public demo data seeded successfully.")
    except Exception as exc:
        print(f"Demo seed failed: {exc}")

def anomaly_to_dict(anomaly: Anomaly):
    readings = []
    class_probabilities = {}
    if anomaly.telemetry_context:
        try:
            payload = json.loads(anomaly.telemetry_context)
            if isinstance(payload, dict):
                readings = payload.get("readings", [])
                class_probabilities = payload.get("class_probabilities", {})
            elif isinstance(payload, list):
                readings = payload
        except json.JSONDecodeError:
            readings = []
    return {
        "station_id": anomaly.station_id,
        "timestamp": anomaly.timestamp.isoformat(),
        "temperature": anomaly.temperature,
        "pressure": anomaly.pressure,
        "humidity": anomaly.humidity,
        "history_size": len(readings),
        "detection": {"is_anomaly": True, "type": anomaly.type, "severity": anomaly.severity, "confidence": anomaly.confidence, "reason": anomaly.reason, "class_probabilities": class_probabilities},
        "telemetry_context": readings,
        "operator_decision": anomaly.operator_decision,
    }

@app.on_event("startup")
def startup():
    with SessionLocal() as session:
        station_ids = session.scalars(select(Station.station_id)).all()
        for station_id in station_ids:
            readings = session.scalars(select(TelemetryReading).where(TelemetryReading.station_id == station_id).order_by(desc(TelemetryReading.timestamp)).limit(48)).all()
            for item in reversed(readings):
                station_history.add(station_id, {"timestamp": item.timestamp, "station_id": item.station_id, "temperature": item.temperature, "pressure": item.pressure, "humidity": item.humidity})
    Thread(target=seed_demo_if_empty, daemon=True).start()

@app.get("/")
def root():
    return {"message": "AeroAlert API is running"}

@app.get("/health")
def health():
    with SessionLocal() as session:
        stations = session.scalar(select(func.count(Station.id))) or 0
        anomalies = session.scalar(select(func.count(Anomaly.id))) or 0
    return {"status": "healthy", "stations": stations, "websocket_clients": len(connection_manager.active_connections), "anomalies": anomalies}

@app.get("/model/feature-importance")
def feature_importance():
    service = get_anomaly_service()
    ranked = sorted(zip(FEATURE_COLUMNS, service.model.feature_importances_), key=lambda item: item[1], reverse=True)
    return {"algorithm": "Random Forest Classifier", "method": "impurity-based feature importance", "features": [{"feature": f, "importance": float(i)} for f, i in ranked]}

@app.post("/telemetry")
async def ingest_telemetry(reading: WeatherReading):
    anomaly_service = get_anomaly_service()
    reading_data = reading.model_dump()
    station_history.add(reading.station_id, reading_data)
    history = station_history.get(reading.station_id)
    result = anomaly_service.detect(pd.DataFrame(history))
    with SessionLocal() as session:
        ensure_station(session, reading.station_id)
        existing_reading = session.scalar(select(TelemetryReading).where(TelemetryReading.station_id == reading.station_id, TelemetryReading.timestamp == reading.timestamp))
        if existing_reading is None:
            session.add(TelemetryReading(**reading_data))
        if result.get("is_anomaly"):
            existing_anomaly = session.scalar(select(Anomaly).where(Anomaly.station_id == reading.station_id, Anomaly.timestamp == reading.timestamp))
            if existing_anomaly is None:
                evidence = [{"timestamp": r["timestamp"].isoformat() if isinstance(r["timestamp"], datetime) else str(r["timestamp"]), "temperature": r["temperature"], "pressure": r["pressure"], "humidity": r["humidity"]} for r in history[-12:]]
                session.add(Anomaly(station_id=reading.station_id, timestamp=reading.timestamp, type=result["type"], severity=result["severity"], confidence=float(result["confidence"]), reason=result["reason"], temperature=reading.temperature, pressure=reading.pressure, humidity=reading.humidity, telemetry_context=json.dumps({"readings": evidence, "class_probabilities": result.get("class_probabilities", {})})))
        session.commit()
    evidence = [{"timestamp": r["timestamp"].isoformat() if isinstance(r["timestamp"], datetime) else str(r["timestamp"]), "temperature": r["temperature"], "pressure": r["pressure"], "humidity": r["humidity"]} for r in history[-12:]]
    message = {**reading_data, "timestamp": reading.timestamp.isoformat(), "history_size": len(history), "detection": result, "telemetry_context": evidence}
    await connection_manager.broadcast(message, reading.station_id)
    return message

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, station_id: str | None = None):
    await connection_manager.connect(websocket, station_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception:
        connection_manager.disconnect(websocket)

@app.get("/anomalies")
def get_anomalies(station_id: str | None = None):
    with SessionLocal() as session:
        query = select(Anomaly).order_by(desc(Anomaly.timestamp)).limit(100)
        if station_id:
            query = query.where(Anomaly.station_id == station_id)
        anomalies = session.scalars(query).all()
        return {"count": len(anomalies), "anomalies": [anomaly_to_dict(a) for a in anomalies]}

@app.post("/anomalies/{station_id}/{timestamp}/decision")
async def set_operator_decision(station_id: str, timestamp: str, decision: OperatorDecision):
    valid = {"SENSOR_FAULT", "VALID_WEATHER_EVENT", "FALSE_ALARM"}
    if decision.decision not in valid:
        raise HTTPException(status_code=400, detail=f"decision must be one of {sorted(valid)}")
    with SessionLocal() as session:
        try:
            ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid timestamp") from exc
        anomaly = session.scalar(select(Anomaly).where(Anomaly.station_id == station_id, Anomaly.timestamp == ts))
        if anomaly is None:
            raise HTTPException(status_code=404, detail="Anomaly not found")
        anomaly.operator_decision = decision.decision
        session.commit()
    message = {"type": "operator_decision", "station_id": station_id, "timestamp": timestamp, "decision": decision.decision}
    await connection_manager.broadcast(message, station_id)
    return {"station_id": station_id, "timestamp": timestamp, "decision": decision.decision}

@app.get("/anomalies/{station_id}/{timestamp}/decision")
def get_operator_decision(station_id: str, timestamp: str):
    with SessionLocal() as session:
        ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        anomaly = session.scalar(select(Anomaly).where(Anomaly.station_id == station_id, Anomaly.timestamp == ts))
        return {"decision": anomaly.operator_decision if anomaly else None}

@app.get("/telemetry/{station_id}")
def get_station_history(station_id: str):
    with SessionLocal() as session:
        readings = session.scalars(select(TelemetryReading).where(TelemetryReading.station_id == station_id).order_by(desc(TelemetryReading.timestamp)).limit(48)).all()
        items = [{"timestamp": r.timestamp.isoformat(), "station_id": r.station_id, "temperature": r.temperature, "pressure": r.pressure, "humidity": r.humidity} for r in reversed(readings)]
        return {"station_id": station_id, "count": len(items), "readings": items}

@app.get("/stations")
def get_stations():
    with SessionLocal() as session:
        stations = session.scalars(select(Station).order_by(Station.station_id)).all()
        return {"count": len(stations), "stations": [{"station_id": s.station_id, "name": s.name} for s in stations]}

@app.post("/detect")
def detect(reading: WeatherReading):
    anomaly_service = get_anomaly_service()
    history = station_history.get(reading.station_id)
    history.append(reading.model_dump())
    return anomaly_service.detect(pd.DataFrame(history))
