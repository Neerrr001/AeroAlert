import pandas as pd

from sklearn.ensemble import RandomForestClassifier


FEATURE_COLUMNS = [
    "temperature_change",
    "pressure_change",
    "humidity_change",

    "temperature_change_3h",
    "temperature_change_6h",
    "pressure_change_3h",
    "pressure_change_6h",
    "humidity_change_3h",
    "humidity_change_6h",

    "temperature_abs_change",
    "pressure_abs_change",
    "humidity_abs_change",

    "temperature_deviation",
    "pressure_deviation",
    "humidity_deviation",

    "environmental_change",

    "pressure_range_6h",
    "humidity_range_6h",

    "temperature_persistence",
]


def train_random_forest(
    X_train: pd.DataFrame,
    y_train: pd.Series
) -> RandomForestClassifier:
    """
    Train a Random Forest classifier for AeroAlert.

    Each row represents a weather-sensor observation,
    while y_train contains the known anomaly class.
    """

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced"
    )

    model.fit(
        X_train,
        y_train
    )

    return model