from typing import Any

import pandas as pd

from app.ml.feature_engineering import create_features
from app.ml.random_forest import FEATURE_COLUMNS
from app.rules.anomaly_rules import detect_missing_data


class AnomalyService:

    def __init__(self, model):
        """
        Service responsible for combining rule-based
        detection and Random Forest predictions.

        Parameters
        ----------
        model:
            A trained Random Forest model.
        """

        self.model = model

    # =====================================================
    # Severity
    # =====================================================

    def get_severity(
        self,
        anomaly_type: str,
        confidence: float
    ) -> str:

        if anomaly_type == "MISSING_DATA":
            return "HIGH"

        if confidence >= 0.90:
            return "HIGH"

        if confidence >= 0.70:
            return "MEDIUM"

        return "LOW"

    # =====================================================
    # Explanation
    # =====================================================

    def generate_reason(
        self,
        row: pd.Series,
        anomaly_type: str
    ) -> str:

        if anomaly_type == "MISSING_DATA":

            return (
                "Temperature, pressure, or humidity "
                "data is missing."
            )

        if anomaly_type == "SPIKE":

            change = row.get("temperature_change")

            return (
                f"Temperature changed by "
                f"{abs(change):.1f}°C from the previous reading."
            )

        if anomaly_type == "FROZEN_SENSOR":

            persistence = row.get(
                "temperature_persistence"
            )

            if pd.isna(persistence):
                persistence = 0

            return (
                f"Temperature remained unchanged for "
                f"{int(persistence)} consecutive readings "
                f"while environmental variables continued to vary."
            )

        if anomaly_type == "DRIFT":

            deviation = row.get(
                "temperature_deviation"
            )

            return (
                f"Temperature deviates by "
                f"{abs(deviation):.1f}°C from its recent baseline."
            )

        if anomaly_type == "STEP_CHANGE":

            change = row.get(
                "temperature_change"
            )

            return (
                f"Temperature shifted by "
                f"{abs(change):.1f}°C and the change "
                f"persisted over subsequent observations."
            )

        return "Unusual sensor behavior detected."

    # =====================================================
    # Main detection function
    # =====================================================

    def detect(
        self,
        df: pd.DataFrame
    ) -> dict[str, Any]:

        # Make sure input isn't modified
        df = df.copy()

        # We need at least one reading
        if df.empty:

            return {
                "is_anomaly": False,
                "type": "UNKNOWN",
                "severity": "LOW",
                "confidence": 0.0,
                "reason": "No sensor data provided."
            }

        # Make sure timestamps are chronological
        df["timestamp"] = pd.to_datetime(
            df["timestamp"],
            utc=True
        )

        df = (
            df
            .sort_values("timestamp")
            .reset_index(drop=True)
        )

        # -------------------------------------------------
        # Rule: missing data
        # -------------------------------------------------

        latest_row = df.iloc[-1]

        if detect_missing_data(latest_row):

            return {
                "is_anomaly": True,
                "type": "MISSING_DATA",
                "severity": "HIGH",
                "confidence": 1.0,
                "reason": self.generate_reason(
                    latest_row,
                    "MISSING_DATA"
                )
            }

        # -------------------------------------------------
        # Feature engineering
        # -------------------------------------------------

        features = create_features(df)

        latest = features.iloc[-1]

        # -------------------------------------------------
        # Check required ML features
        # -------------------------------------------------

        if latest[FEATURE_COLUMNS].isna().any():

            return {
                "is_anomaly": False,
                "type": "NORMAL",
                "severity": "LOW",
                "confidence": 0.0,
                "reason": (
                    "Not enough historical data "
                    "to evaluate this reading."
                )
            }

        # -------------------------------------------------
        # Prepare ML input
        # -------------------------------------------------

        X = features[
            FEATURE_COLUMNS
        ].iloc[[-1]]

        # -------------------------------------------------
        # ML prediction
        # -------------------------------------------------

        prediction = self.model.predict(X)[0]

        probabilities = self.model.predict_proba(X)[0]

        classes = self.model.classes_

        # Convert NumPy values to normal Python values
        class_probabilities = {
            str(cls): round(float(prob), 3)
            for cls, prob in zip(
                classes,
                probabilities
            )
        }

        # Highest predicted class probability
        confidence = round(
            float(max(probabilities)),
            3
        )

        # -------------------------------------------------
        # Normal reading
        # -------------------------------------------------

        if prediction == "NORMAL":

            return {
                "is_anomaly": False,
                "type": "NORMAL",
                "severity": "LOW",
                "confidence": confidence,
                "reason": (
                    "Sensor behavior is consistent "
                    "with recent observations."
                ),
                "class_probabilities": class_probabilities
            }

        # -------------------------------------------------
        # Anomaly
        # -------------------------------------------------

        anomaly_type = str(prediction)

        severity = self.get_severity(
            anomaly_type,
            confidence
        )

        reason = self.generate_reason(
            latest,
            anomaly_type
        )

        return {
            "is_anomaly": True,
            "type": anomaly_type,
            "severity": severity,
            "confidence": confidence,
            "reason": reason,
            "class_probabilities": class_probabilities
        }