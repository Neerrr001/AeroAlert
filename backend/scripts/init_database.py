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
    """Choose the strongest correctly classified example for the demo."""
    matches = df.index[df["anomaly_type"].astype(str) == anomaly_type]
    best_match = None

    for raw_index in matches:
        event_index = int(raw_index)
        if event_index < 48:
            continue

        context = df.iloc[event_index - 48:event_index + 1].copy()
        result = service.detect(context)

        if not result.get("is_anomaly", False):
            continue
        if str(result.get("type")) != anomaly_type:
            continue

        confidence = float(result.get("confidence", 0.0))
        candidate = (confidence, event_index, context, result)

        if best_match is None or confidence > best_match[0]:
            best_match = candidate

    if best_match is None:
        return None

    _, event_index, context, result = best_match
    return event_index, context, result


def build_class_probabilities(result: dict) -> dict:
    """Return a JSON-safe copy of the detector's class probabilities."""
    probabilities = result.get("class_probabilities") or {}
    return {str(label): float(value) for label, value in probabilities.items()}


def seed_demo(session, service):
    df = pd.read_csv(SIMULATED_PATH)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    station_id = STATIONS[0][0]

    # Re-seeding should replace only the deterministic Lucknow demo anomalies.
    session.execute(delete(Anomaly).where(Anomaly.station_id == station_id))

    for anomaly_type in DEMO_TYPES:
        if anomaly_type == "MISSING_DATA":
            # Missing-data is a deterministic rule-level case; the other four
            # types are selected by highest correctly-classified RF confidence.
            missing_matches = df.index[df["anomaly_type"].astype(str) == anomaly_type]
            if len(missing_matches) == 0:
                continue
            event_index = int(missing_matches[0])
            context = df.iloc[max(0, event_index - 48):event_index + 1].copy()
            result = service.detect(context)
        else:
            selected = find_demo_event(df, service, anomaly_type)
            if selected is None:
                continue
            event_index, context, result = selected

        row = df.iloc[event_index]
        timestamp = pd.Timestamp(row["timestamp"]).to_pydatetime()

        # Keep 24 hours visible to the dashboard, while the detector used a
        # 48-hour context to make its temporal features as realistic as possible.
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

        # Store probabilities alongside the evidence so a persisted demo event
        # retains the full explainability payload without changing the schema.
        evidence_payload = {
            "readings": context_rows,
            "class_probabilities": build_class_probabilities(result),
        }

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
                telemetry_context=json.dumps(evidence_payload),
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
