import pandas as pd
import requests
from io import StringIO
from pathlib import Path


# ---------------------------------------------------------
# URL
# ---------------------------------------------------------

URL = "https://noaa-global-hourly-pds.s3.amazonaws.com/2025/42369099999.csv"


# ---------------------------------------------------------
# Output path
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "weather_raw.csv"
)


# ---------------------------------------------------------
# Download
# ---------------------------------------------------------

print("Downloading NOAA data...")

response = requests.get(URL, timeout=60)
response.raise_for_status()

print("Download complete.")


# ---------------------------------------------------------
# Convert downloaded CSV into DataFrame
# ---------------------------------------------------------

df = pd.read_csv(StringIO(response.text))

print(f"Rows downloaded: {len(df)}")


# ---------------------------------------------------------
# Save raw data
# ---------------------------------------------------------

OUTPUT_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)

df.to_csv(
    OUTPUT_PATH,
    index=False
)

print(f"\nRaw data saved to:")
print(OUTPUT_PATH)

print("\nFirst 5 rows:")
print(df.head())