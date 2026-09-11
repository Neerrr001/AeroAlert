import pandas as pd
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

CLEAN_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "weather.csv"
)

SIMULATED_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "weather_with_anomalies.csv"
)


clean = pd.read_csv(CLEAN_PATH)

simulated = pd.read_csv(SIMULATED_PATH)

clean["timestamp"] = pd.to_datetime(
    clean["timestamp"],
    utc=True
)

simulated["timestamp"] = pd.to_datetime(
    simulated["timestamp"],
    utc=True
)


# Get the step-change rows
step = simulated[
    simulated["anomaly_type"] == "STEP_CHANGE"
].copy()


# Match them against the clean dataset
comparison = step.merge(
    clean[
        [
            "timestamp",
            "temperature"
        ]
    ],
    on="timestamp",
    suffixes=("_simulated", "_clean")
)


comparison["injected_bias"] = (
    comparison["temperature_simulated"]
    - comparison["temperature_clean"]
)


print(
    comparison[
        [
            "timestamp",
            "temperature_clean",
            "temperature_simulated",
            "injected_bias"
        ]
    ].to_string(index=False)
)