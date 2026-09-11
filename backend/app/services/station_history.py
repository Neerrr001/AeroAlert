from collections import defaultdict, deque
from threading import Lock
from typing import Any


class StationHistory:
    """
    In-memory rolling history for weather stations.

    Each station keeps only the latest ``max_length`` readings so
    the detector has enough temporal context without requiring a
    database for the prototype.
    """

    def __init__(self, max_length: int = 48):
        self.max_length = max_length
        self._history: dict[str, deque[dict[str, Any]]] = defaultdict(
            lambda: deque(maxlen=self.max_length)
        )
        self._lock = Lock()

    def add(self, station_id: str, reading: dict[str, Any]) -> None:
        with self._lock:
            self._history[station_id].append(reading)

    def get(self, station_id: str) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._history[station_id])

    def count(self, station_id: str) -> int:
        with self._lock:
            return len(self._history[station_id])

    def stations(self) -> list[str]:
        with self._lock:
            return list(self._history.keys())

    def clear(self, station_id: str | None = None) -> None:
        with self._lock:
            if station_id is None:
                self._history.clear()
            else:
                self._history.pop(station_id, None)
