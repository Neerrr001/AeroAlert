import pandas as pd


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create time-series features for AeroAlert.

    If event_id is present, features are calculated independently
    within each event so that one synthetic event cannot affect
    another event's time-series features.

    Expected input columns:
        timestamp
        station_id
        temperature
        pressure
        humidity

    Optional column:
        event_id
    """

    # ---------------------------------------------------------
    # 0. Copy and prepare
    # ---------------------------------------------------------

    df = df.copy()

    # Convert timestamp in case the caller hasn't already done so.
    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        utc=True
    )

    # Preserve original row order.
    df["_original_order"] = range(len(df))

    # ---------------------------------------------------------
    # Helper: process one independent time series
    # ---------------------------------------------------------

    def process_group(group: pd.DataFrame) -> pd.DataFrame:

        group = (
            group
            .sort_values("timestamp")
            .reset_index(drop=True)
        )

        # -----------------------------------------------------
        # 1. One-hour changes
        # -----------------------------------------------------

        group["temperature_change"] = (
            group["temperature"].diff()
        )

        group["pressure_change"] = (
            group["pressure"].diff()
        )

        group["humidity_change"] = (
            group["humidity"].diff()
        )

        # -----------------------------------------------------
        # 2. Multi-hour changes
        # -----------------------------------------------------

        group["temperature_change_3h"] = (
            group["temperature"]
            - group["temperature"].shift(3)
        )

        group["temperature_change_6h"] = (
            group["temperature"]
            - group["temperature"].shift(6)
        )

        group["pressure_change_3h"] = (
            group["pressure"]
            - group["pressure"].shift(3)
        )

        group["pressure_change_6h"] = (
            group["pressure"]
            - group["pressure"].shift(6)
        )

        group["humidity_change_3h"] = (
            group["humidity"]
            - group["humidity"].shift(3)
        )

        group["humidity_change_6h"] = (
            group["humidity"]
            - group["humidity"].shift(6)
        )

        # -----------------------------------------------------
        # 3. Previous-reading rolling baseline
        #
        # The current reading is excluded from the baseline.
        # This prevents data leakage.
        # -----------------------------------------------------

        WINDOW = 6

        previous_temperature = (
            group["temperature"].shift(1)
        )

        previous_pressure = (
            group["pressure"].shift(1)
        )

        previous_humidity = (
            group["humidity"].shift(1)
        )

        # -----------------------------------------------------
        # 3a. Rolling means
        # -----------------------------------------------------

        group["temperature_rolling_mean"] = (
            previous_temperature
            .rolling(WINDOW)
            .mean()
        )

        group["pressure_rolling_mean"] = (
            previous_pressure
            .rolling(WINDOW)
            .mean()
        )

        group["humidity_rolling_mean"] = (
            previous_humidity
            .rolling(WINDOW)
            .mean()
        )

        # -----------------------------------------------------
        # 3b. Rolling standard deviations
        # -----------------------------------------------------

        group["temperature_rolling_std"] = (
            previous_temperature
            .rolling(WINDOW)
            .std()
        )

        group["pressure_rolling_std"] = (
            previous_pressure
            .rolling(WINDOW)
            .std()
        )

        group["humidity_rolling_std"] = (
            previous_humidity
            .rolling(WINDOW)
            .std()
        )

        # -----------------------------------------------------
        # 4. Absolute changes
        # -----------------------------------------------------

        group["temperature_abs_change"] = (
            group["temperature_change"].abs()
        )

        group["pressure_abs_change"] = (
            group["pressure_change"].abs()
        )

        group["humidity_abs_change"] = (
            group["humidity_change"].abs()
        )

        # -----------------------------------------------------
        # 5. Deviation from recent mean
        # -----------------------------------------------------

        group["temperature_deviation"] = (
            group["temperature"]
            - group["temperature_rolling_mean"]
        )

        group["pressure_deviation"] = (
            group["pressure"]
            - group["pressure_rolling_mean"]
        )

        group["humidity_deviation"] = (
            group["humidity"]
            - group["humidity_rolling_mean"]
        )

        # -----------------------------------------------------
        # 6. Environmental movement
        # -----------------------------------------------------

        group["environmental_change"] = (
            group["pressure_abs_change"].fillna(0)
            + group["humidity_abs_change"].fillna(0)
        )

        # -----------------------------------------------------
        # 7. Environmental ranges
        # -----------------------------------------------------

        group["pressure_range_6h"] = (
            previous_pressure
            .rolling(WINDOW)
            .max()
            -
            previous_pressure
            .rolling(WINDOW)
            .min()
        )

        group["humidity_range_6h"] = (
            previous_humidity
            .rolling(WINDOW)
            .max()
            -
            previous_humidity
            .rolling(WINDOW)
            .min()
        )

        # -----------------------------------------------------
        # 8. Longer-term temperature baselines
        #
        # These features help detect persistent level shifts
        # such as STEP_CHANGE anomalies.
        #
        # The current reading is excluded from the baselines.
        # -----------------------------------------------------

        # 12-hour temperature baseline
        group["temperature_mean_12h"] = (
            previous_temperature
            .rolling(
                window=12,
                min_periods=6
            )
            .mean()
        )

        # 24-hour temperature baseline
        group["temperature_mean_24h"] = (
            previous_temperature
            .rolling(
                window=24,
                min_periods=12
            )
            .mean()
        )

        # -----------------------------------------------------
        # 8a. Persistent baseline shift
        #
        # Difference between the short-term temperature level
        # and the longer-term temperature level.
        #
        # A persistent sensor offset should cause this feature
        # to remain significantly different from zero.
        # -----------------------------------------------------

        group["temperature_baseline_shift"] = (
            group["temperature_rolling_mean"]
            - group["temperature_mean_24h"]
        )

        # -----------------------------------------------------
        # 8b. Current temperature vs long-term baseline
        # -----------------------------------------------------

        group["temperature_deviation_24h"] = (
            group["temperature"]
            - group["temperature_mean_24h"]
        )

        # -----------------------------------------------------
        # 8c. Persistent deviation
        #
        # Measures whether recent readings have consistently
        # remained far from the longer-term baseline.
        #
        # shift(1) ensures the current reading does not affect
        # the feature used to detect that same reading.
        # -----------------------------------------------------

        group["persistent_deviation"] = (
            group["temperature_deviation_24h"]
            .shift(1)
            .abs()
            .rolling(
                window=6,
                min_periods=3
            )
            .mean()
        )

        # -----------------------------------------------------
        # 8d. Temperature persistence
        # -----------------------------------------------------

        # Number of consecutive readings with exactly the
        # same temperature.
        group["temperature_persistence"] = (
            group["temperature"]
            .groupby(
                group["temperature"].ne(
                    group["temperature"].shift()
                ).cumsum()
            )
            .cumcount()
            + 1
        )

        return group

    # ---------------------------------------------------------
    # 9. Process independent events
    # ---------------------------------------------------------

    if "event_id" in df.columns:

        # Apply feature engineering independently to each
        # event. We deliberately do NOT use include_groups=True
        # because newer pandas versions no longer allow it.

        processed_groups = []

        for _, group in df.groupby(
            "event_id",
            sort=False
        ):
            processed_groups.append(
                process_group(group)
            )

        df = pd.concat(
            processed_groups,
            ignore_index=True
        )

    else:

        # Normal application data without event_id
        df = process_group(df)

    # ---------------------------------------------------------
    # 10. Restore original row order
    # ---------------------------------------------------------

    df = (
        df
        .sort_values("_original_order")
        .drop(columns="_original_order")
        .reset_index(drop=True)
    )

    return df