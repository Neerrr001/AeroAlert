import pandas as pd
from app.ml.feature_engineering import create_features
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

# Look around the injected spike
print("\n--- Around spike ---")

print(
    df.loc[855:870, [
        "timestamp",
        "temperature",
        "temperature_change",
        "temperature_rolling_mean",
        "temperature_rolling_std",
        "anomaly",
        "anomaly_type"
    ]].to_string(index=True)
)