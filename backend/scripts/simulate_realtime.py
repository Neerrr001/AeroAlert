import argparse
import time
from pathlib import Path

import pandas as pd
import requests


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = BASE_DIR / "data" / "simulated" / "weather_with_anomalies.csv"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Replay simulated AWS telemetry through the AeroAlert API."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--url", default="http://127.0.0.1:8000/telemetry")
    parser.add_argument("--interval", type=float, default=0.5)
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--count", type=int, default=None)
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Start shortly before the first injected anomaly.",
    )
    return parser.parse_args()


def clean_value(value):
    return None if pd.isna(value) else float(value)


def main():
    args = parse_args()

    df = pd.read_csv(args.input)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    if args.demo:
        anomaly_indices = df.index[df["anomaly"].astype(bool)].tolist()
        if not anomaly_indices:
            raise RuntimeError("No injected anomalies found in the input dataset.")
        start = max(0, anomaly_indices[0] - 48)
    else:
        start = args.start or 0

    end = len(df) if args.count is None else min(len(df), start + args.count)
    replay = df.iloc[start:end]

    print(f"Replaying {len(replay)} readings to {args.url}")
    print(f"Interval: {args.interval:.2f}s")

    for _, row in replay.iterrows():
        payload = {
            "timestamp": row["timestamp"].isoformat(),
            "station_id": str(row["station_id"]),
            "temperature": clean_value(row["temperature"]),
            "pressure": clean_value(row["pressure"]),
            "humidity": clean_value(row["humidity"]),
        }

        try:
            response = requests.post(args.url, json=payload, timeout=10)
            response.raise_for_status()
            result = response.json()
            detection = result["detection"]

            print(
                f"{payload['timestamp']} | "
                f"T={payload['temperature']}°C "
                f"P={payload['pressure']} hPa "
                f"RH={payload['humidity']}% | "
                f"{detection['type']} | "
                f"confidence={detection['confidence']} | "
                f"{detection['reason']}"
            )
        except requests.RequestException as exc:
            print(f"Request failed: {exc}")
            print("Is the FastAPI server running on port 8000?")
            break

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
