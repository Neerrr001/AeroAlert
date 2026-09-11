import pandas as pd
from pathlib import Path

from app.ml.feature_engineering import create_features
from app.ml.random_forest import (
    FEATURE_COLUMNS,
    train_random_forest,
)
from app.services.anomaly_service import AnomalyService


BASE_DIR = Path(__file__).resolve().parent.parent


# =========================================================
# Load training data
# =========================================================

TRAIN_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "training_data.csv"
)

df = pd.read_csv(TRAIN_PATH)

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True
)

df = create_features(df)


# =========================================================
# Prepare ML training data
# =========================================================

ml_data = df.dropna(
    subset=FEATURE_COLUMNS
)

X = ml_data[FEATURE_COLUMNS]

y = ml_data["anomaly_type"]


# =========================================================
# Train model
# =========================================================

print("Training Random Forest...")

model = train_random_forest(
    X,
    y
)


# =========================================================
# Create service
# =========================================================

service = AnomalyService(model)


# =========================================================
# Test using simulated dataset
# =========================================================

TEST_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "weather_with_anomalies.csv"
)

test_df = pd.read_csv(TEST_PATH)

test_df["timestamp"] = pd.to_datetime(
    test_df["timestamp"],
    utc=True
)


# ---------------------------------------------------------
# Test a known spike
# ---------------------------------------------------------

SPIKE_INDEX = 1192

history = test_df.iloc[
    SPIKE_INDEX - 10:
    SPIKE_INDEX + 1
].copy()

print("\n==============================")
print("SPIKE TEST")
print("==============================")

result = service.detect(history)

print(result)


# ---------------------------------------------------------
# Test a normal reading
# ---------------------------------------------------------

NORMAL_INDEX = 500

history = test_df.iloc[
    NORMAL_INDEX - 10:
    NORMAL_INDEX + 1
].copy()

print("\n==============================")
print("NORMAL TEST")
print("==============================")

result = service.detect(history)

print(result)