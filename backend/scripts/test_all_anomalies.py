import pandas as pd
from pathlib import Path

from app.ml.feature_engineering import create_features
from app.ml.random_forest import (
    FEATURE_COLUMNS,
    train_random_forest,
)
from app.services.anomaly_service import AnomalyService


# =========================================================
# Paths
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

TRAIN_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "training_data.csv"
)

TEST_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "weather_with_anomalies.csv"
)


# =========================================================
# Train model
# =========================================================

print("Loading training data...")

train_df = pd.read_csv(TRAIN_PATH)

train_df["timestamp"] = pd.to_datetime(
    train_df["timestamp"],
    utc=True
)

train_df = create_features(train_df)

train_ml = train_df.dropna(
    subset=FEATURE_COLUMNS
)

X_train = train_ml[FEATURE_COLUMNS]
y_train = train_ml["anomaly_type"]

print("Training Random Forest...")

model = train_random_forest(
    X_train,
    y_train
)

service = AnomalyService(model)


# =========================================================
# Load test data
# =========================================================

print("\nLoading simulated test data...")

test_df = pd.read_csv(TEST_PATH)

test_df["timestamp"] = pd.to_datetime(
    test_df["timestamp"],
    utc=True
)

test_df = (
    test_df
    .sort_values("timestamp")
    .reset_index(drop=True)
)


# =========================================================
# Find first anomaly of each type
# =========================================================

anomaly_types = [
    "SPIKE",
    "DRIFT",
    "FROZEN_SENSOR",
    "STEP_CHANGE",
    "MISSING_DATA",
]


print("\n" + "=" * 70)
print("AEROALERT END-TO-END ANOMALY TEST")
print("=" * 70)


for anomaly_type in anomaly_types:

    # Find rows belonging to this anomaly type
    matches = test_df.index[
        test_df["anomaly_type"] == anomaly_type
    ].tolist()

    if not matches:

        print(
            f"\n{anomaly_type}: no test data found"
        )

        continue

    anomaly_index = matches[-1]

    # We need history before the anomaly
    HISTORY_LENGTH = 24

    start_index = max(
        0,
        anomaly_index - HISTORY_LENGTH
    )

    history = test_df.iloc[
        start_index : anomaly_index + 1
    ].copy()

    # -----------------------------------------------------
    # Run AeroAlert
    # -----------------------------------------------------

    result = service.detect(
        history
    )

    # -----------------------------------------------------
    # Display
    # -----------------------------------------------------

    print(
        f"\n{'-' * 70}"
    )

    print(
        f"Ground truth: {anomaly_type}"
    )

    print(
        f"Timestamp:    "
        f"{test_df.loc[anomaly_index, 'timestamp']}"
    )

    print(
        f"Temperature:  "
        f"{test_df.loc[anomaly_index, 'temperature']}"
    )

    print(
        f"\nAeroAlert result:"
    )

    print(
        f"  Anomaly:    {result['is_anomaly']}"
    )

    print(
        f"  Type:       {result['type']}"
    )

    print(
        f"  Severity:   {result['severity']}"
    )

    print(
        f"  Confidence: {result['confidence']}"
    )

    print(
        f"  Reason:     {result['reason']}"
    )

    # -----------------------------------------------------
    # Simple correctness check
    # -----------------------------------------------------

    predicted_type = result["type"]

    correct = (
        predicted_type == anomaly_type
    )

    print(
        f"\n  RESULT: "
        f"{'✅ CORRECT' if correct else '❌ INCORRECT'}"
    )