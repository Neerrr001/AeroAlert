import pandas as pd
from pathlib import Path

from app.ml.feature_engineering import create_features
from app.ml.isolation_forest import (
    train_isolation_forest,
    FEATURE_COLUMNS,
)


# =========================================================
# Paths
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

TRAIN_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "weather.csv"
)

TEST_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "weather_with_anomalies.csv"
)


# =========================================================
# 1. Load CLEAN data for training
# =========================================================

print("Loading clean training data...")

train_df = pd.read_csv(TRAIN_PATH)

train_df["timestamp"] = pd.to_datetime(
    train_df["timestamp"],
    utc=True
)

train_df = create_features(train_df)

print(
    f"Training rows loaded: {len(train_df)}"
)


# =========================================================
# 2. Train Isolation Forest
# =========================================================

print("\nTraining Isolation Forest...")

model = train_isolation_forest(
    train_df
)


# =========================================================
# 3. Load SIMULATED data for testing
# =========================================================

print("\nLoading simulated test data...")

test_df = pd.read_csv(TEST_PATH)

test_df["timestamp"] = pd.to_datetime(
    test_df["timestamp"],
    utc=True
)

test_df = create_features(test_df)

print(
    f"Test rows loaded: {len(test_df)}"
)


# =========================================================
# 4. Remove rows where ML features are unavailable
# =========================================================

test_data = test_df.dropna(
    subset=FEATURE_COLUMNS
).copy()

X_test = test_data[FEATURE_COLUMNS]


# =========================================================
# 5. Predictions
# =========================================================

test_data["prediction"] = model.predict(X_test)

# Isolation Forest:
#
#  1  = normal
# -1  = anomaly

test_data["predicted_anomaly"] = (
    test_data["prediction"] == -1
)

test_data["anomaly_score"] = (
    model.decision_function(X_test)
)


# =========================================================
# 6. Show injected anomaly scores
# =========================================================

print(
    "\nInjected anomalies and their anomaly scores:"
)

injected = test_data[
    test_data["anomaly"] == True
]

if len(injected) == 0:

    print("None")

else:

    print(
        injected[
            [
                "timestamp",
                "temperature",
                "anomaly_type",
                "anomaly_score",
                "predicted_anomaly",
            ]
        ].to_string(index=False)
    )


# =========================================================
# 7. Confusion Matrix
# =========================================================

actual = test_data["anomaly"]

predicted = test_data["predicted_anomaly"]


TP = (
    (actual == True) &
    (predicted == True)
).sum()


TN = (
    (actual == False) &
    (predicted == False)
).sum()


FP = (
    (actual == False) &
    (predicted == True)
).sum()


FN = (
    (actual == True) &
    (predicted == False)
).sum()


# =========================================================
# 8. Metrics
# =========================================================

precision = (
    TP / (TP + FP)
    if (TP + FP) > 0
    else 0
)


recall = (
    TP / (TP + FN)
    if (TP + FN) > 0
    else 0
)


f1 = (
    2 * precision * recall / (precision + recall)
    if (precision + recall) > 0
    else 0
)


false_positive_rate = (
    FP / (FP + TN)
    if (FP + TN) > 0
    else 0
)


# =========================================================
# 9. Results
# =========================================================

print(
    "\n" + "=" * 50
)

print("ISOLATION FOREST RESULTS")

print(
    "=" * 50
)


print(
    f"\nTestable rows: {len(test_data)}"
)


print(
    f"Predicted anomalies: "
    f"{predicted.sum()}"
)


print("\nConfusion Matrix:")

print(f"TP: {TP}")
print(f"TN: {TN}")
print(f"FP: {FP}")
print(f"FN: {FN}")


print("\nMetrics:")

print(
    f"Precision:          {precision:.3f}"
)

print(
    f"Recall:             {recall:.3f}"
)

print(
    f"F1 Score:           {f1:.3f}"
)

print(
    f"False Positive Rate: {false_positive_rate:.3f}"
)


# =========================================================
# 10. Detected injected anomalies
# =========================================================

print(
    "\nDetected injected anomalies:"
)

detected_actual = test_data[
    (test_data["anomaly"] == True) &
    (test_data["predicted_anomaly"] == True)
]


if len(detected_actual) == 0:

    print("None")

else:

    print(
        detected_actual[
            [
                "timestamp",
                "temperature",
                "anomaly_type",
                "anomaly_score",
            ]
        ].to_string(index=False)
    )


# =========================================================
# 11. False positives
# =========================================================

print(
    "\nFalse positives:"
)

false_positives = test_data[
    (test_data["anomaly"] == False) &
    (test_data["predicted_anomaly"] == True)
]


if len(false_positives) == 0:

    print("None")

else:

    print(
        false_positives[
            [
                "timestamp",
                "temperature",
                "pressure",
                "humidity",
                "anomaly_score",
            ]
        ]
        .head(20)
        .to_string(index=False)
    )