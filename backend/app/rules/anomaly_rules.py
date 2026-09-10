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
    pressures: pd.Series,
    humidities: pd.Series,
    window: int = 6,
    environmental_change_threshold: float = 1.0
) -> bool:

    if len(temperatures) < window:
        return False

    recent_temp = temperatures.iloc[-window:]
    recent_pressure = pressures.iloc[-window:]
    recent_humidity = humidities.iloc[-window:]

    if recent_temp.isna().any():
        return False

    # Temperature hasn't changed
    temperature_frozen = recent_temp.nunique() == 1

    if not temperature_frozen:
        return False

    # Other sensors are changing
    pressure_change = (
        recent_pressure.max()
        - recent_pressure.min()
    )

    humidity_change = (
        recent_humidity.max()
        - recent_humidity.min()
    )

    environmental_change = max(
        pressure_change,
        humidity_change
    )

    return environmental_change >= environmental_change_threshold


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