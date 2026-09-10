import pandas as pd
import requests
from pathlib import Path


# ---------------------------------------------------------
# Location
# ---------------------------------------------------------

LATITUDE = 26.8467
LONGITUDE = 80.9462

STATION_ID = "LUCKNOW_001"


# ---------------------------------------------------------
# Date range
# ---------------------------------------------------------

START_DATE = "2025-01-01"
END_DATE = "2025-12-31"


# ---------------------------------------------------------
# Open-Meteo API
# ---------------------------------------------------------

URL = "https://archive-api.open-meteo.com/v1/archive"

params = {
    "latitude": LATITUDE,
    "longitude": LONGITUDE,
    "start_date": START_DATE,
    "end_date": END_DATE,
    "hourly": "temperature_2m,relative_humidity_2m,surface_pressure",
    "timezone": "UTC",
    "models": "era5",
}


# ---------------------------------------------------------
# Output path
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "weather.csv"
)


# ---------------------------------------------------------
# Request data
# ---------------------------------------------------------

print("Requesting weather data from Open-Meteo...")

response = requests.get(
    URL,
    params=params,
    timeout=60
)

response.raise_for_status()

data = response.json()

print("Data received successfully.")


# ---------------------------------------------------------
# Convert response to DataFrame
# ---------------------------------------------------------

hourly = data["hourly"]

df = pd.DataFrame({
    "timestamp": hourly["time"],
    "temperature": hourly["temperature_2m"],
    "pressure": hourly["surface_pressure"],
    "humidity": hourly["relative_humidity_2m"],
})


# ---------------------------------------------------------
# Add station ID
# ---------------------------------------------------------

df["station_id"] = STATION_ID


# ---------------------------------------------------------
# Reorder columns
# ---------------------------------------------------------

df = df[
    [
        "timestamp",
        "station_id",
        "temperature",
        "pressure",
        "humidity",
    ]
]


# ---------------------------------------------------------
# Convert timestamp
# ---------------------------------------------------------

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True
)


# ---------------------------------------------------------
# Remove incomplete rows
# ---------------------------------------------------------

before = len(df)

df = df.dropna(
    subset=[
        "timestamp",
        "temperature",
        "pressure",
        "humidity",
    ]
)

after = len(df)


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

print("\nDataset created successfully!")

print(f"Rows before cleaning: {before}")
print(f"Rows after cleaning:  {after}")

print("\nFirst 5 rows:")
print(df.head())

print("\nLast 5 rows:")
print(df.tail())

print("\nMissing values:")
print(df.isna().sum())

print("\nSaved to:")
print(OUTPUT_PATH)