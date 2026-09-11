import argparse
import time
from pathlib import Path

import pandas as pd
import requests


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = BASE_DIR / "data" / "simulated" / "weather_with_anomalies.csv"
DEMO_TYPES = ["SPIKE", "FROZEN_SENSOR", "STEP_CHANGE", "DRIFT", "MISSING_DATA"]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Replay simulated AWS telemetry through the AeroAlert API."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--url", default="http://127.0.0.1:8000/telemetry")
    parser.add_argument("--interval", type=float, default=0.5)
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--count", type=int, default=None)
    parser.add_argument("--station-id", default=None)
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run a deterministic guided demo through all five injected fault classes.",
    )
    parser.add_argument(
        "--scenario",
        choices=[*DEMO_TYPES, "ALL"],
        default="ALL",
        help="Fault class to demonstrate when --demo is enabled.",
    )
    parser.add_argument(
        "--clean-readings",
        type=int,
        default=48,
        help="Clean readings sent before each demo fault so old events are flushed from the 48-reading backend window.",
    )
    parser.add_argument(
        "--event-readings",
        type=int,
        default=36,
        help="Number of readings sent from the selected injected fault event.",
    )
    parser.add_argument(
        "--pause",
        type=float,
        default=1.0,
        help="Pause between demo scenarios in seconds.",
    )
    return parser.parse_args()


def clean_value(value):
    return None if pd.isna(value) else float(value)


def post_reading(row, url, station_id, session):
    payload = {
        "timestamp": row["timestamp"].isoformat(),
        "station_id": station_id,
        "temperature": clean_value(row["temperature"]),
        "pressure": clean_value(row["pressure"]),
        "humidity": clean_value(row["humidity"]),
    }

    response = session.post(url, json=payload, timeout=10)
    response.raise_for_status()
    return payload, response.json()


def replay_rows(rows, args, station_id, session, phase_label="REPLAY"):
    for index, (_, row) in enumerate(rows.iterrows(), start=1):
        try:
            payload, result = post_reading(row, args.url, station_id, session)
        except requests.RequestException as exc:
            raise RuntimeError(
                f"Request failed: {exc}\n"
                "Is the FastAPI server running on port 8000?"
            ) from exc

        detection = result["detection"]
        print(
            f"[{phase_label} {index:02d}] "
            f"{payload['timestamp']} | "
            f"T={payload['temperature']}°C "
            f"P={payload['pressure']} hPa "
            f"RH={payload['humidity']}% | "
            f"{detection['type']} | "
            f"confidence={detection['confidence']:.3f} | "
            f"{detection['reason']}"
        )
        time.sleep(args.interval)


def find_demo_event(df, anomaly_type):
    matches = df.index[df["anomaly_type"].astype(str) == anomaly_type].tolist()
    if not matches:
        raise RuntimeError(f"No injected {anomaly_type} event found in {df.name if hasattr(df, 'name') else 'dataset'}.")
    return matches[0]


def build_demo_segment(df, anomaly_type, clean_readings, event_readings):
    event_index = find_demo_event(df, anomaly_type)
    clean_start = max(0, event_index - clean_readings)
    event_end = min(len(df), event_index + event_readings)

    clean_segment = df.iloc[clean_start:event_index].copy()
    event_segment = df.iloc[event_index:event_end].copy()

    if len(clean_segment) < clean_readings:
        raise RuntimeError(
            f"Not enough clean history before {anomaly_type}: "
            f"needed {clean_readings}, found {len(clean_segment)}."
        )
    if event_segment.empty:
        raise RuntimeError(f"The {anomaly_type} event segment is empty.")

    return clean_segment, event_segment


def run_demo(df, args, station_id, session):
    scenarios = DEMO_TYPES if args.scenario == "ALL" else [args.scenario]

    print("\nAeroAlert guided demo")
    print("=" * 72)
    print(f"Station: {station_id}")
    print(f"Scenarios: {', '.join(scenarios)}")
    print(
        f"Per scenario: {args.clean_readings} clean + "
        f"{args.event_readings} fault readings"
    )
    print("Ground-truth labels are used only by the simulator to select demo slices; they are NOT sent to the API.")
    print("=" * 72)

    for number, anomaly_type in enumerate(scenarios, start=1):
        clean_segment, event_segment = build_demo_segment(
            df,
            anomaly_type,
            args.clean_readings,
            args.event_readings,
        )

        print(f"\n[{number}/{len(scenarios)}] Preparing {anomaly_type} demo")
        print(f"  Clean buffer: {len(clean_segment)} readings")
        print(f"  Fault segment: {len(event_segment)} readings")

        replay_rows(
            clean_segment,
            args,
            station_id,
            session,
            phase_label=f"{anomaly_type} CLEAN",
        )

        print(f"\n>>> INJECTED {anomaly_type} EVENT <<<\n")
        replay_rows(
            event_segment,
            args,
            station_id,
            session,
            phase_label=f"{anomaly_type} FAULT",
        )

        if number < len(scenarios):
            print(f"\n--- Holding for {args.pause:.1f}s before next fault ---\n")
            time.sleep(args.pause)

    print("\nDemo complete.")


def main():
    args = parse_args()

    df = pd.read_csv(args.input)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    default_station_id = (
        str(df["station_id"].dropna().iloc[0]) if "station_id" in df.columns else "LUCKNOW_001"
    )
    station_id = args.station_id or default_station_id

    with requests.Session() as session:
        if args.demo:
            run_demo(df, args, station_id, session)
            return

        start = args.start or 0
        end = len(df) if args.count is None else min(len(df), start + args.count)
        replay = df.iloc[start:end]

        print(f"Replaying {len(replay)} readings to {args.url}")
        print(f"Station: {station_id}")
        print(f"Interval: {args.interval:.2f}s")

        replay_rows(replay, args, station_id, session)


if __name__ == "__main__":
    main()
