import pandas as pd
import numpy as np
from pathlib import Path


# =========================================================
# Paths
# =========================================================

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
    / "training_data.csv"
)


# =========================================================
# Configuration
# =========================================================

RANDOM_SEED = 42

NORMAL_EVENTS = 300
SPIKE_EVENTS = 300
DRIFT_EVENTS = 300
STEP_EVENTS = 300
FROZEN_EVENTS = 300
MISSING_EVENTS = 300

# 24 hours of clean history + fault period
WINDOW_SIZE = 48

# Faults begin only after enough history exists
FAULT_START_MIN = 24
FAULT_START_MAX = 30

rng = np.random.default_rng(RANDOM_SEED)


# =========================================================
# Load clean data
# =========================================================

print("Loading clean weather data...")

clean = pd.read_csv(INPUT_PATH)

clean["timestamp"] = pd.to_datetime(
    clean["timestamp"],
    utc=True
)

clean = (
    clean
    .sort_values("timestamp")
    .reset_index(drop=True)
)

print(f"Clean rows: {len(clean)}")


# =========================================================
# Find a stable weather window
# =========================================================

def find_stable_start(
    length: int,
    max_temperature_range: float = 8.0
) -> int:
    """
    Find a section of the clean dataset where the underlying
    temperature does not vary too dramatically.

    This is mainly used for STEP_CHANGE events so that the
    artificial sensor offset is not masked by a strong natural
    weather trend.
    """

    possible_starts = []

    max_start = len(clean) - length

    for start in range(max_start):

        window = clean.iloc[
            start:start + length
        ]

        temperature_range = (
            window["temperature"].max()
            - window["temperature"].min()
        )

        if temperature_range <= max_temperature_range:
            possible_starts.append(start)

    if not possible_starts:
        raise RuntimeError(
            "Could not find a stable temperature window."
        )

    return int(
        rng.choice(possible_starts)
    )


# =========================================================
# Generate one normal event
# =========================================================

def create_normal_event(
    event_id: str
) -> pd.DataFrame:

    start = rng.integers(
        0,
        len(clean) - WINDOW_SIZE
    )

    event = clean.iloc[
        start:start + WINDOW_SIZE
    ].copy()

    event = event.reset_index(drop=True)

    event["event_id"] = event_id
    event["anomaly"] = False
    event["anomaly_type"] = "NORMAL"

    return event


# =========================================================
# Generate one anomaly event
# =========================================================

def create_anomaly_event(
    event_id: str,
    anomaly_type: str
) -> pd.DataFrame:

    # ---------------------------------------------------------
    # Choose source window
    # ---------------------------------------------------------

    if anomaly_type == "STEP_CHANGE":

        # Use relatively stable weather for step-change events.
        start = find_stable_start(
            WINDOW_SIZE
        )

    else:

        start = rng.integers(
            0,
            len(clean) - WINDOW_SIZE
        )

    event = clean.iloc[
        start:start + WINDOW_SIZE
    ].copy()

    event = event.reset_index(drop=True)

    event["event_id"] = event_id
    event["anomaly"] = False
    event["anomaly_type"] = "NORMAL"

    # ---------------------------------------------------------
    # Fault begins after 24+ hours of clean history.
    # ---------------------------------------------------------

    fault_start = int(
        rng.integers(
            FAULT_START_MIN,
            FAULT_START_MAX + 1
        )
    )

    # =========================================================
    # SPIKE
    # =========================================================

    if anomaly_type == "SPIKE":

        original = event.loc[
            fault_start,
            "temperature"
        ]

        direction = rng.choice(
            [-1, 1]
        )

        magnitude = rng.uniform(
            10,
            25
        )

        event.loc[
            fault_start,
            "temperature"
        ] = (
            original
            + direction * magnitude
        )

        event.loc[
            fault_start,
            "anomaly"
        ] = True

        event.loc[
            fault_start,
            "anomaly_type"
        ] = "SPIKE"

    # =========================================================
    # DRIFT
    # =========================================================

    elif anomaly_type == "DRIFT":

        length = int(
            rng.integers(6, 12)
        )

        max_bias = rng.uniform(
            4,
            10
        )

        direction = rng.choice(
            [-1, 1]
        )

        for i in range(length):

            index = fault_start + i

            if index >= WINDOW_SIZE:
                break

            bias = (
                max_bias
                * (i + 1)
                / length
            )

            event.loc[
                index,
                "temperature"
            ] += (
                direction
                * bias
            )

            event.loc[
                index,
                "anomaly"
            ] = True

            event.loc[
                index,
                "anomaly_type"
            ] = "DRIFT"

    # =========================================================
    # STEP CHANGE
    # =========================================================

    elif anomaly_type == "STEP_CHANGE":

        length = int(
            rng.integers(6, 12)
        )

        bias = rng.uniform(
            8,
            12
        )

        direction = rng.choice(
            [-1, 1]
        )

        bias *= direction

        for i in range(length):

            index = fault_start + i

            if index >= WINDOW_SIZE:
                break

            # Constant sensor offset.
            event.loc[
                index,
                "temperature"
            ] = (
                event.loc[
                    index,
                    "temperature"
                ]
                + bias
            )

            event.loc[
                index,
                "anomaly"
            ] = True

            event.loc[
                index,
                "anomaly_type"
            ] = "STEP_CHANGE"

    # =========================================================
    # FROZEN SENSOR
    # =========================================================

    elif anomaly_type == "FROZEN_SENSOR":

        length = int(
            rng.integers(6, 12)
        )

        frozen_value = event.loc[
            fault_start,
            "temperature"
        ]

        for i in range(length):

            index = fault_start + i

            if index >= WINDOW_SIZE:
                break

            event.loc[
                index,
                "temperature"
            ] = frozen_value

            event.loc[
                index,
                "anomaly"
            ] = True

            event.loc[
                index,
                "anomaly_type"
            ] = "FROZEN_SENSOR"

    # =========================================================
    # MISSING DATA
    # =========================================================

    elif anomaly_type == "MISSING_DATA":

        length = int(
            rng.integers(3, 7)
        )

        for i in range(length):

            index = fault_start + i

            if index >= WINDOW_SIZE:
                break

            event.loc[
                index,
                [
                    "temperature",
                    "pressure",
                    "humidity"
                ]
            ] = np.nan

            event.loc[
                index,
                "anomaly"
            ] = True

            event.loc[
                index,
                "anomaly_type"
            ] = "MISSING_DATA"

    else:

        raise ValueError(
            f"Unknown anomaly type: {anomaly_type}"
        )

    return event


# =========================================================
# Generate dataset
# =========================================================

events = []


# =========================================================
# Normal events
# =========================================================

print("\nGenerating normal events...")

for i in range(NORMAL_EVENTS):

    events.append(
        create_normal_event(
            f"NORMAL_{i:04d}"
        )
    )


# =========================================================
# Spike events
# =========================================================

print("Generating spike events...")

for i in range(SPIKE_EVENTS):

    events.append(
        create_anomaly_event(
            f"SPIKE_{i:04d}",
            "SPIKE"
        )
    )


# =========================================================
# Drift events
# =========================================================

print("Generating drift events...")

for i in range(DRIFT_EVENTS):

    events.append(
        create_anomaly_event(
            f"DRIFT_{i:04d}",
            "DRIFT"
        )
    )


# =========================================================
# Step-change events
# =========================================================

print("Generating step-change events...")

for i in range(STEP_EVENTS):

    events.append(
        create_anomaly_event(
            f"STEP_{i:04d}",
            "STEP_CHANGE"
        )
    )


# =========================================================
# Frozen-sensor events
# =========================================================

print("Generating frozen-sensor events...")

for i in range(FROZEN_EVENTS):

    events.append(
        create_anomaly_event(
            f"FROZEN_{i:04d}",
            "FROZEN_SENSOR"
        )
    )


# =========================================================
# Missing-data events
# =========================================================

print("Generating missing-data events...")

for i in range(MISSING_EVENTS):

    events.append(
        create_anomaly_event(
            f"MISSING_{i:04d}",
            "MISSING_DATA"
        )
    )


# =========================================================
# Combine
# =========================================================

training_data = pd.concat(
    events,
    ignore_index=True
)


# =========================================================
# Shuffle rows for storage
# =========================================================

training_data = (
    training_data
    .sample(
        frac=1,
        random_state=RANDOM_SEED
    )
    .reset_index(drop=True)
)


# =========================================================
# Save
# =========================================================

OUTPUT_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)

training_data.to_csv(
    OUTPUT_PATH,
    index=False
)


# =========================================================
# Summary
# =========================================================

print("\nTraining dataset created!")

print(
    f"Total rows: {len(training_data)}"
)

print(
    f"Total events: "
    f"{training_data['event_id'].nunique()}"
)

print("\nEvent distribution:")

print(
    training_data[
        ["event_id", "anomaly_type"]
    ]
    .drop_duplicates()["anomaly_type"]
    .value_counts()
)

print("\nRow distribution:")

print(
    training_data[
        "anomaly_type"
    ].value_counts()
)

print("\nSaved to:")

print(OUTPUT_PATH)