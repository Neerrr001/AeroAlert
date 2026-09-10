import pandas as pd


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create time-series features for AeroAlert.

    Input:
        DataFrame containing:
        timestamp, station_id, temperature,
        pressure, humidity

    Output:
        DataFrame with additional time-series features.
    """

    # Make a copy so that we don't modify the original DataFrame
    df = df.copy()

    # Make sure data is ordered chronologically
    df = df.sort_values("timestamp").reset_index(drop=True)

    # ---------------------------------------------------------
    # 1. Change from previous reading
    # ---------------------------------------------------------

    df["temperature_change"] = df["temperature"].diff()
    df["pressure_change"] = df["pressure"].diff()
    df["humidity_change"] = df["humidity"].diff()

    # ---------------------------------------------------------
    # 2. Rolling mean
    # ---------------------------------------------------------

    WINDOW = 6  # 6 hours because data is hourly

    df["temperature_rolling_mean"] = (
        df["temperature"]
        .rolling(WINDOW)
        .mean()
    )

    df["pressure_rolling_mean"] = (
        df["pressure"]
        .rolling(WINDOW)
        .mean()
    )

    df["humidity_rolling_mean"] = (
        df["humidity"]
        .rolling(WINDOW)
        .mean()
    )

    # ---------------------------------------------------------
    # 3. Rolling standard deviation
    # ---------------------------------------------------------

    df["temperature_rolling_std"] = (
        df["temperature"]
        .rolling(WINDOW)
        .std()
    )

    df["pressure_rolling_std"] = (
        df["pressure"]
        .rolling(WINDOW)
        .std()
    )

    df["humidity_rolling_std"] = (
        df["humidity"]
        .rolling(WINDOW)
        .std()
    )

    return df