import pandas as pd


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create time-series features for AeroAlert.

    Input:
        DataFrame containing:
            timestamp
            station_id
            temperature
            pressure
            humidity

    Output:
        DataFrame with additional time-series features.
    """

    # ---------------------------------------------------------
    # 0. Copy and sort
    # ---------------------------------------------------------

    # Don't modify the original DataFrame
    df = df.copy()

    # Make sure observations are chronological
    df = (
        df.sort_values("timestamp")
        .reset_index(drop=True)
    )

    # ---------------------------------------------------------
    # 1. Change from previous reading
    # ---------------------------------------------------------

    df["temperature_change"] = (
        df["temperature"].diff()
    )

    df["pressure_change"] = (
        df["pressure"].diff()
    )

    df["humidity_change"] = (
        df["humidity"].diff()
    )

    # ---------------------------------------------------------
    # 2. Multi-hour changes
    # ---------------------------------------------------------

    # How much has each variable changed compared with
    # 3 hours ago and 6 hours ago?

    df["temperature_change_3h"] = (
        df["temperature"]
        - df["temperature"].shift(3)
    )

    df["temperature_change_6h"] = (
        df["temperature"]
        - df["temperature"].shift(6)
    )

    df["pressure_change_3h"] = (
        df["pressure"]
        - df["pressure"].shift(3)
    )

    df["pressure_change_6h"] = (
        df["pressure"]
        - df["pressure"].shift(6)
    )

    df["humidity_change_3h"] = (
        df["humidity"]
        - df["humidity"].shift(3)
    )

    df["humidity_change_6h"] = (
        df["humidity"]
        - df["humidity"].shift(6)
    )

    # ---------------------------------------------------------
    # 3. Rolling statistics
    #
    # IMPORTANT:
    # shift(1) means the current reading is NOT included
    # in its own baseline.
    # ---------------------------------------------------------

    WINDOW = 6

    previous_temperature = (
        df["temperature"].shift(1)
    )

    previous_pressure = (
        df["pressure"].shift(1)
    )

    previous_humidity = (
        df["humidity"].shift(1)
    )

    # ---------------------------------------------------------
    # 3a. Rolling means
    # ---------------------------------------------------------

    df["temperature_rolling_mean"] = (
        previous_temperature
        .rolling(WINDOW)
        .mean()
    )

    df["pressure_rolling_mean"] = (
        previous_pressure
        .rolling(WINDOW)
        .mean()
    )

    df["humidity_rolling_mean"] = (
        previous_humidity
        .rolling(WINDOW)
        .mean()
    )

    # ---------------------------------------------------------
    # 3b. Rolling standard deviations
    # ---------------------------------------------------------

    df["temperature_rolling_std"] = (
        previous_temperature
        .rolling(WINDOW)
        .std()
    )

    df["pressure_rolling_std"] = (
        previous_pressure
        .rolling(WINDOW)
        .std()
    )

    df["humidity_rolling_std"] = (
        previous_humidity
        .rolling(WINDOW)
        .std()
    )

    # ---------------------------------------------------------
    # 4. Absolute changes
    # ---------------------------------------------------------

    df["temperature_abs_change"] = (
        df["temperature_change"].abs()
    )

    df["pressure_abs_change"] = (
        df["pressure_change"].abs()
    )

    df["humidity_abs_change"] = (
        df["humidity_change"].abs()
    )

    # ---------------------------------------------------------
    # 5. Deviation from recent mean
    # ---------------------------------------------------------

    df["temperature_deviation"] = (
        df["temperature"]
        - df["temperature_rolling_mean"]
    )

    df["pressure_deviation"] = (
        df["pressure"]
        - df["pressure_rolling_mean"]
    )

    df["humidity_deviation"] = (
        df["humidity"]
        - df["humidity_rolling_mean"]
    )

    # ---------------------------------------------------------
    # 6. Environmental movement
    # ---------------------------------------------------------

    df["environmental_change"] = (
        df["pressure_abs_change"].fillna(0)
        + df["humidity_abs_change"].fillna(0)
    )

    # ---------------------------------------------------------
    # 7. Environmental ranges over previous 6 hours
    # ---------------------------------------------------------

    df["pressure_range_6h"] = (
        previous_pressure
        .rolling(WINDOW)
        .max()
        - previous_pressure
        .rolling(WINDOW)
        .min()
    )

    df["humidity_range_6h"] = (
        previous_humidity
        .rolling(WINDOW)
        .max()
        - previous_humidity
        .rolling(WINDOW)
        .min()
    )

    # ---------------------------------------------------------
    # 8. Temperature persistence
    # ---------------------------------------------------------

    # Counts how many consecutive readings have had exactly
    # the same temperature value.

    df["temperature_persistence"] = (
        df["temperature"]
        .groupby(
            df["temperature"].ne(
                df["temperature"].shift()
            ).cumsum()
        )
        .cumcount()
        + 1
    )

    return df