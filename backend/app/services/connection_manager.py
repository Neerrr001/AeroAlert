from fastapi import WebSocket


class ConnectionManager:
    """Manage WebSocket clients and optionally scope broadcasts by station."""

    def __init__(self):
        self.active_connections: list[tuple[WebSocket, str | None]] = []

    async def connect(self, websocket: WebSocket, station_id: str | None = None) -> None:
        await websocket.accept()
        self.active_connections.append((websocket, station_id))

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections = [
            (connection, station_id)
            for connection, station_id in self.active_connections
            if connection is not websocket
        ]

    async def broadcast(self, message: dict, station_id: str) -> None:
        dead_connections: list[WebSocket] = []

        for websocket, subscribed_station in self.active_connections:
            if subscribed_station is not None and subscribed_station != station_id:
                continue

            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(websocket)
