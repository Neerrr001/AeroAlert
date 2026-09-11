from threading import Lock
from typing import Any


class OperatorDecisionStore:
    """In-memory store for operator review decisions during the prototype."""

    VALID_DECISIONS = {
        "SENSOR_FAULT",
        "VALID_WEATHER_EVENT",
        "FALSE_ALARM",
    }

    def __init__(self):
        self._decisions: dict[str, dict[str, Any]] = {}
        self._lock = Lock()

    @staticmethod
    def key(station_id: str, timestamp: str) -> str:
        return f"{station_id}:{timestamp}"

    def set(
        self,
        station_id: str,
        timestamp: str,
        decision: str,
    ) -> dict[str, Any]:
        if decision not in self.VALID_DECISIONS:
            raise ValueError(f"Unsupported operator decision: {decision}")

        value = {
            "decision": decision,
            "station_id": station_id,
            "timestamp": timestamp,
        }
        with self._lock:
            self._decisions[self.key(station_id, timestamp)] = value
        return value

    def get(self, station_id: str, timestamp: str) -> dict[str, Any] | None:
        with self._lock:
            return self._decisions.get(self.key(station_id, timestamp))

    def all(self, station_id: str | None = None) -> list[dict[str, Any]]:
        with self._lock:
            values = list(self._decisions.values())
        if station_id is None:
            return values
        return [value for value in values if value["station_id"] == station_id]

    def clear(self) -> None:
        with self._lock:
            self._decisions.clear()
