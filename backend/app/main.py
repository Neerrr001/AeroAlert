from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.ml.feature_engineering import create_features
from app.ml.random_forest import FEATURE_COLUMNS, train_random_forest
from app.services.anomaly_history import AnomalyHistory
from app.services.anomaly_service import AnomalyService
from app.services.connection_manager import ConnectionManager
from app.services.station_history import StationHistory


app = FastAPI(
    title="AeroAlert API",
    description="Intelligent anomaly detection for weather stations",
    version="0.5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


BASE_DIR = Path(__file__).resolve().parent.parent
TRAIN_PATH = BASE_DIR / "data" / "simulated" / "training_data.csv"

print("Loading training data...")
training_df = pd.read_csv(TRAIN_PATH)
training_df["timestamp"] = pd.to_datetime(training_df["timestamp"], utc=True)
training_df = create_features(training_df)
ml_data = training_df.dropna(subset=FEATURE_COLUMNS)

X_train = ml_data[FEATURE_COLUMNS]
y_train = ml_data["anomaly_type"]

print("Training Random Forest...")
model = train_random_forest(X_train, y_train)
print("Model ready.")


anomaly_service = AnomalyService(model)
station_history = StationHistory(max_length=48)
anomaly_history = AnomalyHistory(max_length=100)
connection_manager = ConnectionManager()


@app.get("/")
def root():
    return {"message": "AeroAlert API is running"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "stations": len(station_history.stations()),
        "websocket_clients": len(connection_manager.active_connections),
        "anomalies": anomaly_history.count(),
    }


@app.post("/telemetry")
async def ingest_telemetry(reading: WeatherReading):
    """Ingest one reading, detect anomalies, retain evidence, and broadcast live."""

    reading_data = reading.model_dump()
    station_history.add(reading.station_id, reading_data)
    history = station_history.get(reading.station_id)
    result = anomaly_service.detect(pd.DataFrame(history))

    # Keep the latest 12 observations as evidence for the review screen.
    evidence = []
    for context_reading in history[-12:]:
        timestamp = context_reading["timestamp"]
        evidence.append(
            {
                "timestamp": timestamp.isoformat() if isinstance(timestamp, datetime) else str(timestamp),
                "temperature": context_reading["temperature"],
                "pressure": context_reading["pressure"],
                "humidity": context_reading["humidity"],
            }
        )

    message = {
        "station_id": reading.station_id,
        "timestamp": reading.timestamp.isoformat(),
        "temperature": reading.temperature,
        "pressure": reading.pressure,
        "humidity": reading.humidity,
        "history_size": len(history),
        "detection": result,
        "telemetry_context": evidence,
    }

    if result.get("is_anomaly"):
        anomaly_history.add(message)

    await connection_manager.broadcast(message, reading.station_id)
    return message


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, station_id: str | None = None):
    """Stream telemetry and anomaly results to dashboard clients."""

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
    """Return recent live anomaly decisions, including telemetry evidence."""

    anomalies = anomaly_history.get(station_id)
    return {
        "count": len(anomalies),
        "anomalies": anomalies,
    }


@app.get("/telemetry/{station_id}")
def get_station_history(station_id: str):
    history = station_history.get(station_id)
    return {
        "station_id": station_id,
        "count": len(history),
        "readings": history,
    }


@app.get("/stations")
def get_stations():
    stations = station_history.stations()
    return {
        "count": len(stations),
        "stations": [
            {
                "station_id": station_id,
                "history_size": station_history.count(station_id),
            }
            for station_id in stations
        ],
    }


@app.post("/detect")
def detect(readings: list[WeatherReading]):
    data = pd.DataFrame([reading.model_dump() for reading in readings])
    return anomaly_service.detect(data)
