import pandas as pd


def detect_spike(
    temperature_change: float,
    temperature: float,
    rolling_mean: float,
    threshold: float = 8.0,
    deviation_threshold: float = 6.0
) -> bool:
    """
    Detect a sudden temperature spike/drop.

    We require BOTH:
    1. A large change from the previous reading.
    2. The current value to be far from its recent average.

    This helps distinguish a genuine sudden weather change
    from an isolated sensor spike.
    """

    if pd.isna(temperature_change) or pd.isna(rolling_mean):
        return False

    change = abs(temperature_change)

    deviation = abs(
        temperature - rolling_mean
    )

    return (
        change > threshold
        and deviation > deviation_threshold
    )


def detect_frozen_sensor(
    temperatures: pd.Series,
    pressures: pd.Series,
    humidities: pd.Series,
    window: int = 6,
    environmental_change_threshold: float = 1.0
) -> bool:
    """
    Detect a temperature sensor that appears frozen.

    Temperature must remain exactly constant for `window`
    consecutive readings while pressure or humidity changes.
    """

    if len(temperatures) < window:
        return False

    recent_temp = temperatures.iloc[-window:]
    recent_pressure = pressures.iloc[-window:]
    recent_humidity = humidities.iloc[-window:]

    # Cannot call a sensor frozen if temperature itself is missing
    if recent_temp.isna().any():
        return False

    # Temperature must be identical across the window
    temperature_frozen = recent_temp.nunique() == 1

    if not temperature_frozen:
        return False

    # We need at least one other environmental variable
    # to show meaningful variation.
    pressure_change = (
        recent_pressure.max() - recent_pressure.min()
        if not recent_pressure.isna().all()
        else 0
    )

    humidity_change = (
        recent_humidity.max() - recent_humidity.min()
        if not recent_humidity.isna().all()
        else 0
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


def detect_drift(
    temperature: float,
    rolling_mean: float,
    rolling_std: float,
    deviation_threshold: float = 2.5
) -> bool:
    """
    Detect a temperature value that is unusually far
    from its recent local behavior.

    Uses a local z-score.
    """

    if pd.isna(temperature):
        return False

    if pd.isna(rolling_mean) or pd.isna(rolling_std):
        return False

    # Avoid division by zero
    if rolling_std == 0:
        return False

    z_score = abs(
        temperature - rolling_mean
    ) / rolling_std

    return z_score > deviation_threshold