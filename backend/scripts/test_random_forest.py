import pandas as pd
from pathlib import Path

from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix

from app.ml.feature_engineering import create_features
from app.ml.random_forest import (
    train_random_forest,
    FEATURE_COLUMNS,
)


# =========================================================
# Paths
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_PATH = (
    BASE_DIR
    / "data"
    / "simulated"
    / "training_data.csv"
)


# =========================================================
# Load data
# =========================================================

print("Loading training dataset...")

df = pd.read_csv(INPUT_PATH)

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True
)

print(
    f"Rows loaded: {len(df)}"
)

print(
    f"Events: {df['event_id'].nunique()}"
)


# =========================================================
# Feature engineering
# =========================================================

print("\nCreating features...")

df = create_features(df)


# =========================================================
# Remove missing-data rows
# =========================================================

# Missing-data faults will be handled by the rule engine.
# Random Forest receives only complete feature rows.

ml_data = df.dropna(
    subset=FEATURE_COLUMNS
).copy()

print(
    f"Rows available for ML: {len(ml_data)}"
)


# =========================================================
# Prepare X and y
# =========================================================

X = ml_data[FEATURE_COLUMNS]

y = ml_data["anomaly_type"]

groups = ml_data["event_id"]


# =========================================================
# Stratified event-level split
# =========================================================

splitter = StratifiedGroupKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

train_indices, test_indices = next(
    splitter.split(
        X,
        y,
        groups
    )
)


X_train = X.iloc[train_indices]
X_test = X.iloc[test_indices]

y_train = y.iloc[train_indices]
y_test = y.iloc[test_indices]


print(
    f"\nTraining rows: {len(X_train)}"
)

print(
    f"Testing rows: {len(X_test)}"
)

print(
    f"Training events: "
    f"{groups.iloc[train_indices].nunique()}"
)

print(
    f"Testing events: "
    f"{groups.iloc[test_indices].nunique()}"
)


# =========================================================
# Train
# =========================================================

print("\nTraining Random Forest...")

model = train_random_forest(
    X_train,
    y_train
)


# =========================================================
# Predict
# =========================================================

print("Making predictions...")

y_pred = model.predict(
    X_test
)


# =========================================================
# Results
# =========================================================

print(
    "\n" + "=" * 60
)

print("RANDOM FOREST — EVENT-LEVEL EVALUATION")

print(
    "=" * 60
)


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        zero_division=0
    )
)


# =========================================================
# Confusion Matrix
# =========================================================

labels = sorted(
    y.unique()
)

cm = confusion_matrix(
    y_test,
    y_pred,
    labels=labels
)

cm_df = pd.DataFrame(
    cm,
    index=labels,
    columns=labels
)

print("\nConfusion Matrix:")

print(cm_df)