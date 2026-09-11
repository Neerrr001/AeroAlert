from collections import deque
from threading import Lock
from typing import Any


class AnomalyHistory:
    """In-memory rolling store for live anomaly decisions."""

    def __init__(self, max_length: int = 100):
        self.max_length = max_length
        self._history: deque[dict[str, Any]] = deque(maxlen=max_length)
        self._lock = Lock()

    def add(self, message: dict[str, Any]) -> None:
        with self._lock:
            self._history.appendleft(message)

    def get(self, station_id: str | None = None) -> list[dict[str, Any]]:
        with self._lock:
            if station_id is None:
                return list(self._history)
            return [item for item in self._history if item.get("station_id") == station_id]

    def count(self, station_id: str | None = None) -> int:
        return len(self.get(station_id))

    def clear(self) -> None:
        with self._lock:
            self._history.clear()
