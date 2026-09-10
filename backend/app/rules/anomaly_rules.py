import pandas as pd


def detect_spike(
    temperature_change: float,
    threshold: float = 8.0
) -> bool:
    """
    Detect a sudden temperature change.
    """

    if pd.isna(temperature_change):
        return False

    return abs(temperature_change) > threshold


def detect_frozen_sensor(
    temperatures: pd.Series,
    window: int = 6
) -> bool:
    """
    Detect whether the sensor reported exactly
    the same temperature for several consecutive readings.
    """

    if len(temperatures) < window:
        return False

    recent = temperatures.tail(window)

    return recent.nunique() == 1


def detect_missing_data(row: pd.Series) -> bool:
    """
    Detect missing temperature, pressure, or humidity.
    """

    required = [
        "temperature",
        "pressure",
        "humidity"
    ]

    return row[required].isna().any()