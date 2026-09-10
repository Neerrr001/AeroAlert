import pandas as pd
import numpy as np
from pathlib import Path


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "weather.csv"
)

OUTPUT_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "weather_with_anomalies.csv"
)


# ---------------------------------------------------------
# Load clean data
# ---------------------------------------------------------

print("Loading clean weather data...")

df = pd.read_csv(INPUT_PATH)

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True
)

df = (
    df
    .sort_values("timestamp")
    .reset_index(drop=True)
)

print(f"Rows loaded: {len(df)}")


# ---------------------------------------------------------
# Ground truth
# ---------------------------------------------------------

df["anomaly"] = False
df["anomaly_type"] = "NORMAL"


def mark_anomaly(index, anomaly_type):
    df.loc[index, "anomaly"] = True
    df.loc[index, "anomaly_type"] = anomaly_type


# ---------------------------------------------------------
# Random generator
# ---------------------------------------------------------

rng = np.random.default_rng(42)


# =========================================================
# 1. SPIKE
# =========================================================

spike_index = rng.integers(
    500,
    len(df) - 500
)

original_temp = df.loc[
    spike_index,
    "temperature"
]

# Add a very large temporary sensor error
df.loc[
    spike_index,
    "temperature"
] = original_temp + 20

mark_anomaly(
    spike_index,
    "SPIKE"
)

print(
    f"Injected SPIKE at row {spike_index}"
)


# =========================================================
# 2. STEP CHANGE
# =========================================================

step_start = rng.integers(
    1500,
    len(df) - 500
)

step_length = 10
step_bias = 8

for i in range(step_length):

    index = step_start + i

    # Add the same sensor bias to the original value
    df.loc[index, "temperature"] += step_bias

    mark_anomaly(
        index,
        "STEP_CHANGE"
    )

print(
    f"Injected STEP_CHANGE from row "
    f"{step_start} to "
    f"{step_start + step_length - 1}"
)


# =========================================================
# 3. DRIFT
# =========================================================

drift_start = rng.integers(
    2500,
    len(df) - 500
)

drift_length = 12
max_bias = 8

for i in range(drift_length):

    index = drift_start + i

    # Gradually increasing sensor bias
    bias = max_bias * ((i + 1) / drift_length)

    df.loc[index, "temperature"] += bias

    mark_anomaly(
        index,
        "DRIFT"
    )

print(
    f"Injected DRIFT from row "
    f"{drift_start} to "
    f"{drift_start + drift_length - 1}"
)


# =========================================================
# 4. FROZEN SENSOR
# =========================================================

freeze_start = rng.integers(
    5000,
    len(df) - 500
)

freeze_length = 8

frozen_value = df.loc[
    freeze_start,
    "temperature"
]

for i in range(freeze_length):

    index = freeze_start + i

    df.loc[
        index,
        "temperature"
    ] = frozen_value

    mark_anomaly(
        index,
        "FROZEN_SENSOR"
    )

print(
    f"Injected FROZEN_SENSOR from row "
    f"{freeze_start} to "
    f"{freeze_start + freeze_length - 1}"
)


# =========================================================
# 5. MISSING DATA
# =========================================================

missing_start = rng.integers(
    6000,
    len(df) - 500
)

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
    f"{missing_start} to "
    f"{missing_start + missing_length - 1}"
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

print(
    f"Total rows: {len(df)}"
)

print(
    f"Anomalous rows: "
    f"{df['anomaly'].sum()}"
)

print("\nAnomaly breakdown:")

print(
    df["anomaly_type"].value_counts()
)

print("\nSaved to:")

print(OUTPUT_PATH)