"""Create AeroAlert's Neon PostgreSQL tables and seed a persistent demo dataset."""

import json
from pathlib import Path

import pandas as pd
from sqlalchemy import delete, select

from app.db import Base, SessionLocal, engine
from app.models import Anomaly, Station
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

DEMO_TYPES = ["SPIKE", "FROZEN_SENSOR", "STEP_CHANGE", "DRIFT", "MISSING_DATA"]


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

    # Re-seeding should produce exactly five deterministic demo anomalies.
    session.execute(delete(Anomaly).where(Anomaly.station_id == station_id))

    for anomaly_type in DEMO_TYPES:
        matches = df.index[df["anomaly_type"].astype(str) == anomaly_type]
        # Use a later event so the detector has enough clean history for
        # rolling/24-hour features instead of returning "not enough data".
        valid_matches = [int(i) for i in matches if int(i) >= 48]
        if not valid_matches:
            continue

        event_index = valid_matches[0]
        start = event_index - 48
        end = min(len(df), event_index + 1)
        context = df.iloc[start:end].copy()
        result = service.detect(context)
        row = df.iloc[event_index]

        timestamp = pd.Timestamp(row["timestamp"]).to_pydatetime()
        context_rows = []
        for _, context_row in context.tail(24).iterrows():
            context_rows.append(
                {
                    "timestamp": pd.Timestamp(context_row["timestamp"]).isoformat(),
                    "temperature": None if pd.isna(context_row["temperature"]) else float(context_row["temperature"]),
                    "pressure": None if pd.isna(context_row["pressure"]) else float(context_row["pressure"]),
                    "humidity": None if pd.isna(context_row["humidity"]) else float(context_row["humidity"]),
                }
            )

        # Keep the ground-truth anomaly type, but use the detector's actual
        # confidence/reason when it successfully evaluates the event.
        detected = bool(result.get("is_anomaly", False))
        severity = result.get("severity", "HIGH") if detected else "HIGH"
        confidence = float(result.get("confidence", 0.0)) if detected else 0.0
        reason = result.get("reason") if detected else f"Injected {anomaly_type} demonstration event."

        session.add(
            Anomaly(
                station_id=station_id,
                timestamp=timestamp,
                type=anomaly_type,
                severity=severity,
                confidence=confidence,
                reason=reason,
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
