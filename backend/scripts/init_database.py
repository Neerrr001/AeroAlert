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


def find_demo_event(df: pd.DataFrame, service: AnomalyService, anomaly_type: str):
    """Find an event the live detector can actually evaluate for the demo."""
    matches = df.index[df["anomaly_type"].astype(str) == anomaly_type]
    best = None

    for raw_index in matches:
        event_index = int(raw_index)
        if event_index < 48:
            continue

        context = df.iloc[event_index - 48:event_index + 1].copy()
        result = service.detect(context)

        if not result.get("is_anomaly", False):
            continue

        # Prefer a detection whose predicted type matches the injected type.
        if str(result.get("type")) == anomaly_type:
            return event_index, context, result

        # Keep the strongest anomaly as a fallback if the model labels the
        # event differently. This still gives the operator useful evidence.
        confidence = float(result.get("confidence", 0.0))
        if best is None or confidence > best[2]:
            best = (event_index, context, confidence, result)

    if best is not None:
        return best[0], best[1], best[3]

    return None


def seed_demo(session, service):
    df = pd.read_csv(SIMULATED_PATH)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    station_id = STATIONS[0][0]

    # Re-seeding should produce exactly five deterministic demo anomalies.
    session.execute(delete(Anomaly).where(Anomaly.station_id == station_id))

    for anomaly_type in DEMO_TYPES:
        selected = find_demo_event(df, service, anomaly_type)
        if selected is None:
            continue

        event_index, context, result = selected
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
