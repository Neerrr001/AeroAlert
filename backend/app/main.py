from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

from app.services.anomaly_service import AnomalyService
from app.ml.random_forest import FEATURE_COLUMNS, train_random_forest
from app.ml.feature_engineering import create_features

import pandas as pd
from pathlib import Path


# =========================================================
# Create FastAPI app
# =========================================================

app = FastAPI(
    title="AeroAlert API",
    description="Intelligent anomaly detection for weather stations",
    version="0.1.0",
)


# =========================================================
# Request model
# =========================================================

class WeatherReading(BaseModel):
    timestamp: datetime
    station_id: str
    temperature: float
    pressure: float
    humidity: float


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

training_df = create_features(
    training_df
)

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
# Create anomaly service
# =========================================================

anomaly_service = AnomalyService(
    model
)


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
        "status": "healthy"
    }


# =========================================================
# Detection endpoint
# =========================================================

@app.post("/detect")
def detect(readings: list[WeatherReading]):

    # Convert Pydantic objects into a DataFrame
    data = pd.DataFrame(
        [
            reading.model_dump()
            for reading in readings
        ]
    )

    result = anomaly_service.detect(
        data
    )

    return result