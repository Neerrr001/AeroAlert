from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel

from app.ml.feature_engineering import create_features
from app.ml.random_forest import FEATURE_COLUMNS, train_random_forest
from app.rules.anomaly_rules import detect_missing_data
from app.services.anomaly_service import AnomalyService
from app.services.station_history import StationHistory


# =========================================================
# Create FastAPI app
# =========================================================

app = FastAPI(
    title="AeroAlert API",
    description="Intelligent anomaly detection for weather stations",
    version="0.2.0",
)


# =========================================================
# Request model
# =========================================================

class WeatherReading(BaseModel):
    timestamp: datetime
    station_id: str
    temperature: float | None
    pressure: float | None
    humidity: float | None


# =========================================================
# Load training data and train model
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

TRAIN_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "training_data.csv"
)

print("Loading training data...")

training_df = pd.read_csv(TRAIN_PATH)

training_df["timestamp"] = pd.to_datetime(
    training_df["timestamp"],
    utc=True
)

training_df = create_features(training_df)

ml_data = training_df.dropna(
    subset=FEATURE_COLUMNS
)

X_train = ml_data[FEATURE_COLUMNS]
y_train = ml_data["anomaly_type"]

print("Training Random Forest...")

model = train_random_forest(
    X_train,
    y_train
)

print("Model ready.")


# =========================================================
# Create services
# =========================================================

anomaly_service = AnomalyService(model)
station_history = StationHistory(max_length=48)


# =========================================================
# Health check
# =========================================================

@app.get("/")
def root():
    return {
        "message": "AeroAlert API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "stations": len(station_history.stations())
    }


# =========================================================
# Real-time telemetry ingestion
# =========================================================

@app.post("/telemetry")
def ingest_telemetry(reading: WeatherReading):
    """
    Receive one weather reading, add it to the station's rolling
    history, and immediately run anomaly detection.
    """

    reading_data = reading.model_dump()

    station_history.add(
        reading.station_id,
        reading_data
    )

    history = station_history.get(
        reading.station_id
    )

    data = pd.DataFrame(history)

    result = anomaly_service.detect(data)

    return {
        "station_id": reading.station_id,
        "timestamp": reading.timestamp,
        "history_size": len(history),
        "detection": result
    }


# =========================================================
# Station history
# =========================================================

@app.get("/telemetry/{station_id}")
def get_station_history(station_id: str):
    """Return the current rolling history for one station."""

    history = station_history.get(station_id)

    return {
        "station_id": station_id,
        "count": len(history),
        "readings": history
    }


@app.get("/stations")
def get_stations():
    """Return stations currently known to the running prototype."""

    stations = station_history.stations()

    return {
        "count": len(stations),
        "stations": [
            {
                "station_id": station_id,
                "history_size": station_history.count(station_id)
            }
            for station_id in stations
        ]
    }


# =========================================================
# Detection endpoint — manual/history-based testing
# =========================================================

@app.post("/detect")
def detect(readings: list[WeatherReading]):
    """Run detection directly on a supplied sequence of readings."""

    data = pd.DataFrame(
        [
            reading.model_dump()
            for reading in readings
        ]
    )

    result = anomaly_service.detect(data)

    return result
