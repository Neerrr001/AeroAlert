import pandas as pd
from pathlib import Path

from app.ml.feature_engineering import create_features

from app.rules.anomaly_rules import (
    detect_spike,
    detect_frozen_sensor,
    detect_missing_data,
    detect_drift,
)


BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "weather_with_anomalies.csv"
)


# ---------------------------------------------------------
# Load data
# ---------------------------------------------------------

df = pd.read_csv(INPUT_PATH)

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True
)

df = create_features(df)


# ---------------------------------------------------------
# Prediction columns
# ---------------------------------------------------------

df["predicted_anomaly"] = False
df["predicted_type"] = "NORMAL"


# ---------------------------------------------------------
# Run rule engine
# ---------------------------------------------------------

for i in range(len(df)):

    row = df.iloc[i]


    # -----------------------------------------------------
    # 1. Missing data
    # -----------------------------------------------------

    if detect_missing_data(row):

        df.loc[i, "predicted_anomaly"] = True
        df.loc[i, "predicted_type"] = "MISSING_DATA"

        continue


    # -----------------------------------------------------
    # 2. Spike
    # -----------------------------------------------------

    if detect_spike(
        row["temperature_change"],
        row["temperature"],
        row["temperature_rolling_mean"]
    ):

        df.loc[i, "predicted_anomaly"] = True
        df.loc[i, "predicted_type"] = "SPIKE"

        continue


    # -----------------------------------------------------
    # 3. Frozen sensor
    # -----------------------------------------------------

    temperature_history = (
        df["temperature"].iloc[: i + 1]
    )

    pressure_history = (
        df["pressure"].iloc[: i + 1]
    )

    humidity_history = (
        df["humidity"].iloc[: i + 1]
    )

    if detect_frozen_sensor(
        temperature_history,
        pressure_history,
        humidity_history
    ):

        df.loc[i, "predicted_anomaly"] = True
        df.loc[i, "predicted_type"] = "FROZEN_SENSOR"

        continue


    # -----------------------------------------------------
    # 4. Drift
    # -----------------------------------------------------

    if detect_drift(
        row["temperature"],
        row["temperature_rolling_mean"],
        row["temperature_rolling_std"]
    ):

        df.loc[i, "predicted_anomaly"] = True
        df.loc[i, "predicted_type"] = "DRIFT"

        continue


# ---------------------------------------------------------
# Show predictions
# ---------------------------------------------------------

predictions = df[
    df["predicted_anomaly"]
]

print("\nPredicted anomalies:")

print(
    predictions[
        [
            "timestamp",
            "temperature",
            "anomaly_type",
            "predicted_type",
        ]
    ].to_string(index=True)
)


# ---------------------------------------------------------
# Confusion matrix
# ---------------------------------------------------------

actual = df["anomaly"]
predicted = df["predicted_anomaly"]

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


print("\nConfusion Matrix:")

print(f"TP: {TP}")
print(f"TN: {TN}")
print(f"FP: {FP}")
print(f"FN: {FN}")


# ---------------------------------------------------------
# Metrics
# ---------------------------------------------------------

precision = (
    TP / (TP + FP)
    if (TP + FP)
    else 0
)

recall = (
    TP / (TP + FN)
    if (TP + FN)
    else 0
)

f1 = (
    2 * precision * recall / (precision + recall)
    if (precision + recall)
    else 0
)


print("\nMetrics:")

print(f"Precision: {precision:.3f}")
print(f"Recall:    {recall:.3f}")
print(f"F1 Score:  {f1:.3f}")