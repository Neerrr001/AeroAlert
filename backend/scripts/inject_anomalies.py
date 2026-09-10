import pandas as pd
import numpy as np
from pathlib import Path


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_PATH = BASE_DIR / "data" / "processed" / "weather.csv"
OUTPUT_PATH = BASE_DIR / "data" / "simulated" / "weather_with_anomalies.csv"


# ---------------------------------------------------------
# Load data
# ---------------------------------------------------------

print("Loading clean weather data...")

df = pd.read_csv(INPUT_PATH)

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True
)

df = df.sort_values("timestamp").reset_index(drop=True)

print(f"Rows loaded: {len(df)}")


# ---------------------------------------------------------
# Create ground-truth columns
# ---------------------------------------------------------

df["anomaly"] = False
df["anomaly_type"] = "NORMAL"


# ---------------------------------------------------------
# Random generator
# ---------------------------------------------------------

rng = np.random.default_rng(42)


# ---------------------------------------------------------
# Helper function
# ---------------------------------------------------------

def mark_anomaly(index, anomaly_type):
    df.loc[index, "anomaly"] = True
    df.loc[index, "anomaly_type"] = anomaly_type


# =========================================================
# 1. SPIKE
# =========================================================

# Pick a random point away from the edges
spike_index = rng.integers(100, len(df) - 100)

original_temperature = df.loc[spike_index, "temperature"]

df.loc[spike_index, "temperature"] = original_temperature + 20

mark_anomaly(
    spike_index,
    "SPIKE"
)

print(
    f"Injected SPIKE at row {spike_index}"
)


# =========================================================
# 2. FROZEN SENSOR
# =========================================================

freeze_start = rng.integers(500, len(df) - 20)
freeze_length = 8

freeze_value = df.loc[freeze_start, "temperature"]

for i in range(freeze_length):
    index = freeze_start + i

    df.loc[index, "temperature"] = freeze_value

    mark_anomaly(
        index,
        "FROZEN_SENSOR"
    )

print(
    f"Injected FROZEN_SENSOR from row "
    f"{freeze_start} to {freeze_start + freeze_length - 1}"
)


# =========================================================
# 3. DRIFT
# =========================================================

drift_start = rng.integers(1000, len(df) - 30)
drift_length = 12

for i in range(drift_length):

    index = drift_start + i

    drift_amount = (i + 1) * 0.8

    df.loc[index, "temperature"] += drift_amount

    mark_anomaly(
        index,
        "DRIFT"
    )

print(
    f"Injected DRIFT from row "
    f"{drift_start} to {drift_start + drift_length - 1}"
)


# =========================================================
# 4. STEP CHANGE
# =========================================================

step_start = rng.integers(1500, len(df) - 30)
step_length = 10

step_amount = 8

for i in range(step_length):

    index = step_start + i

    df.loc[index, "temperature"] += step_amount

    mark_anomaly(
        index,
        "STEP_CHANGE"
    )

print(
    f"Injected STEP_CHANGE from row "
    f"{step_start} to {step_start + step_length - 1}"
)


# =========================================================
# 5. MISSING DATA
# =========================================================

missing_start = rng.integers(2000, len(df) - 20)
missing_length = 5

for i in range(missing_length):

    index = missing_start + i

    df.loc[
        index,
        [
            "temperature",
            "pressure",
            "humidity"
        ]
    ] = np.nan

    mark_anomaly(
        index,
        "MISSING_DATA"
    )

print(
    f"Injected MISSING_DATA from row "
    f"{missing_start} to {missing_start + missing_length - 1}"
)


# ---------------------------------------------------------
# Save
# ---------------------------------------------------------

OUTPUT_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)

df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------

print("\nAnomaly injection complete!")

print(f"Total rows: {len(df)}")

print(
    f"Anomalous rows: "
    f"{df['anomaly'].sum()}"
)

print("\nAnomaly breakdown:")

print(
    df["anomaly_type"]
    .value_counts()
)

print("\nSaved to:")

print(OUTPUT_PATH)