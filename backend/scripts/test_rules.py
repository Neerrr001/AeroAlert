import pandas as pd

from app.ml.feature_engineering import create_features
from app.rules.anomaly_rules import (
    detect_spike,
    detect_frozen_sensor,
    detect_missing_data
)

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "weather_with_anomalies.csv"
)


df = pd.read_csv(INPUT_PATH)

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True
)

df = create_features(df)


# ---------------------------------------------------------
# Test spike
# ---------------------------------------------------------

print("SPIKE TEST")

for i in range(len(df)):

    if detect_spike(
        df.loc[i, "temperature_change"]
    ):

        print(
            f"Spike detected at row {i}"
        )

        print(
            df.loc[
                i,
                [
                    "timestamp",
                    "temperature",
                    "temperature_change",
                    "anomaly_type"
                ]
            ]
        )


# ---------------------------------------------------------
# Test frozen sensor
# ---------------------------------------------------------

print("\nFROZEN SENSOR TEST")

for i in range(5, len(df)):

    if detect_frozen_sensor(
        df["temperature"].iloc[:i + 1]
    ):

        print(
            f"Frozen sensor detected around row {i}"
        )

        break


# ---------------------------------------------------------
# Test missing data
# ---------------------------------------------------------

print("\nMISSING DATA TEST")

for i in range(len(df)):

    if detect_missing_data(df.iloc[i]):

        print(
            f"Missing data detected at row {i}"
        )

        print(
            df.loc[
                i,
                [
                    "timestamp",
                    "temperature",
                    "pressure",
                    "humidity",
                    "anomaly_type"
                ]
            ]
        )