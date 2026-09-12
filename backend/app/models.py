from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Station(Base):
    __tablename__ = "stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class TelemetryReading(Base):
    __tablename__ = "telemetry_readings"
    __table_args__ = (
        UniqueConstraint("station_id", "timestamp", name="uq_telemetry_station_timestamp"),
        Index("ix_telemetry_station_timestamp", "station_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    pressure: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity: Mapped[float | None] = mapped_column(Float, nullable=True)


class Anomaly(Base):
    __tablename__ = "anomalies"
    __table_args__ = (
        UniqueConstraint("station_id", "timestamp", name="uq_anomaly_station_timestamp"),
        Index("ix_anomaly_station_timestamp", "station_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    pressure: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity: Mapped[float | None] = mapped_column(Float, nullable=True)
    telemetry_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    operator_decision: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
