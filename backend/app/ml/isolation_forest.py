import pandas as pd
from sklearn.ensemble import IsolationForest


# ---------------------------------------------------------
# Features used by the model
# ---------------------------------------------------------

FEATURE_COLUMNS = [
    "temperature",
    "pressure",
    "humidity",
    "temperature_change",
    "pressure_change",
    "humidity_change",
    "temperature_rolling_mean",
    "temperature_rolling_std",
    "pressure_rolling_mean",
    "pressure_rolling_std",
    "humidity_rolling_mean",
    "humidity_rolling_std",
]


def train_isolation_forest(
    df: pd.DataFrame,
    contamination: float = 0.01
):
    """
    Train an Isolation Forest on normal weather behavior.

    Parameters
    ----------
    df:
        DataFrame containing our engineered features.

    contamination:
        Expected approximate proportion of anomalies.

    Returns
    -------
    model:
        Trained Isolation Forest.
    """

    # Only learn from normal observations.
    normal_data = df[
        df["anomaly"] == False
    ].copy()

    # Keep only rows where all model features exist.
    normal_data = normal_data.dropna(
        subset=FEATURE_COLUMNS
    )

    X_train = normal_data[FEATURE_COLUMNS]

    print(
        f"Training rows: {len(X_train)}"
    )

    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train)

    return model