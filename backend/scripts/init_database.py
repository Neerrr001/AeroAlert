"""Create AeroAlert's Neon PostgreSQL tables and seed a persistent demo dataset."""

import json
from pathlib import Path

import pandas as pd
from sqlalchemy import select

from app.db import Base, SessionLocal, engine
from app.models import Anomaly, Station, TelemetryReading
from app.ml.feature_engineering import create_features
from app.ml.random_forest import FEATURE_COLUMNS, train_random_forest
from app.services.anomaly_service import AnomalyService

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "simulated" / "training_data.csv"
SIMULATED_PATH = BASE_DIR / "data" / "simulated" / "weather_with_anomalies.csv"

STATIONS = [
    ("LUCKNOW_001", "Lucknow AWS"),
    ("DELHI_001", "Delhi AWS"),
    ("MUMBAI_001", "Mumbai AWS"),
]


def build_service() -> AnomalyService:
    df = pd.read_csv(DATA_PATH)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = create_features(df)
    data = df.dropna(subset=FEATURE_COLUMNS)
    model = train_random_forest(data[FEATURE_COLUMNS], data["anomaly_type"])
    return AnomalyService(model)


def seed_station(session, station_id, name):
    station = session.scalar(select(Station).where(Station.station_id == station_id))
    if station is None:
        session.add(Station(station_id=station_id, name=name))


def seed_demo(session, service):
    df = pd.read_csv(SIMULATED_PATH)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    station_id = STATIONS[0][0]

    # Seed a compact, deterministic set of five anomalies plus their evidence.
    for anomaly_type in ["SPIKE", "FROZEN_SENSOR", "STEP_CHANGE", "DRIFT", "MISSING_DATA"]:
        match = df.index[df["anomaly_type"].astype(str) == anomaly_type]
        if len(match) == 0:
            continue
        event_index = int(match[0])
        start = max(0, event_index - 12)
        end = min(len(df), event_index + 1)
        context = df.iloc[start:end].copy()
        result = service.detect(context)
        row = df.iloc[event_index]

        timestamp = pd.Timestamp(row["timestamp"]).to_pydatetime()
        existing = session.scalar(
            select(Anomaly).where(
                Anomaly.station_id == station_id,
                Anomaly.timestamp == timestamp,
            )
        )
        if existing is not None:
            continue

        context_rows = []
        for _, context_row in context.tail(12).iterrows():
            context_rows.append(
                {
                    "timestamp": pd.Timestamp(context_row["timestamp"]).isoformat(),
                    "temperature": None if pd.isna(context_row["temperature"]) else float(context_row["temperature"]),
                    "pressure": None if pd.isna(context_row["pressure"]) else float(context_row["pressure"]),
                    "humidity": None if pd.isna(context_row["humidity"]) else float(context_row["humidity"]),
                }
            )

        session.add(
            Anomaly(
                station_id=station_id,
                timestamp=timestamp,
                type=anomaly_type,
                severity=result.get("severity", "HIGH"),
                confidence=float(result.get("confidence", 0.0)),
                reason=result.get("reason", f"Injected {anomaly_type} demonstration event."),
                temperature=None if pd.isna(row["temperature"]) else float(row["temperature"]),
                pressure=None if pd.isna(row["pressure"]) else float(row["pressure"]),
                humidity=None if pd.isna(row["humidity"]) else float(row["humidity"]),
                telemetry_context=json.dumps(context_rows),
            )
        )


def main():
    Base.metadata.create_all(engine)
    service = build_service()
    with SessionLocal() as session:
        for station_id, name in STATIONS:
            seed_station(session, station_id, name)
        seed_demo(session, service)
        session.commit()
    print("AeroAlert database initialized and demo data seeded.")


if __name__ == "__main__":
    main()
