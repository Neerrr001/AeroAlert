"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Radio,
  Thermometer,
  Droplets,
  Wifi,
  WifiOff,
} from "lucide-react";

type Detection = {
  is_anomaly: boolean;
  type: string;
  severity: string;
  confidence: number;
  reason: string;
};

type TelemetryReading = {
  station_id: string;
  timestamp: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
};

type TelemetryMessage = TelemetryReading & {
  history_size: number;
  detection: Detection;
};

type PersistedAnomaly = {
  id?: number;
  station_id: string;
  timestamp: string;
  type: string;
  severity: string;
  confidence: number;
  reason: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
};

type ConnectionStatus = "connecting" | "live" | "reconnecting";

const STATION_ID = "LUCKNOW_001";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? API_BASE.replace(/^http/, "ws");

const formatNumber = (value: number | null | undefined, digits = 1) =>
  value == null || Number.isNaN(value) ? "—" : value.toFixed(digits);

const formatTime = (timestamp: string | null | undefined) =>
  timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

const delta = (current: number | null | undefined, previous: number | null | undefined) =>
  current == null || previous == null
    ? "—"
    : `${current - previous >= 0 ? "+" : ""}${(current - previous).toFixed(1)}`;

function stateClasses(detection: Detection | null) {
  if (!detection) return "border-slate-700 bg-slate-900 text-slate-400";
  if (!detection.is_anomaly) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  return detection.severity === "HIGH"
    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
    : "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function toNormalDetection(reason = "Persisted station telemetry; no live decision was attached to this historical reading."): Detection {
  return {
    is_anomaly: false,
    type: "NORMAL",
    severity: "LOW",
    confidence: 0,
    reason,
  };
}

function hasCompleteTelemetry(reading: TelemetryReading) {
  return (
    reading.temperature != null &&
    reading.pressure != null &&
    reading.humidity != null &&
    Number.isFinite(reading.temperature) &&
    Number.isFinite(reading.pressure) &&
    Number.isFinite(reading.humidity)
  );
}

export default function OverviewPage() {
  const [latest, setLatest] = useState<TelemetryMessage | null>(null);
  const [history, setHistory] = useState<TelemetryMessage[]>([]);
  const [latestDecision, setLatestDecision] = useState<Detection | null>(null);
  const [latestDecisionTime, setLatestDecisionTime] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;
    let keepAliveTimer: ReturnType<typeof setInterval> | undefined;

    const loadPersistedData = async () => {
      try {
        const [telemetryResponse, anomaliesResponse] = await Promise.all([
          fetch(`${API_BASE}/telemetry/${STATION_ID}`, { cache: "no-store" }),
          fetch(`${API_BASE}/anomalies?station_id=${encodeURIComponent(STATION_ID)}`, { cache: "no-store" }),
        ]);

        if (!telemetryResponse.ok) throw new Error(`Telemetry request failed (${telemetryResponse.status})`);
        if (!anomaliesResponse.ok) throw new Error(`Anomaly request failed (${anomaliesResponse.status})`);

        const telemetryData = (await telemetryResponse.json()) as {
          count?: number;
          readings?: TelemetryReading[];
        };
        const anomalyData = (await anomaliesResponse.json()) as {
          anomalies?: PersistedAnomaly[];
        };

        const persistedReadings = telemetryData.readings ?? [];
        const historySize = telemetryData.count ?? persistedReadings.length;
        const normalizedHistory: TelemetryMessage[] = persistedReadings.map((reading) => ({
          ...reading,
          history_size: historySize,
          detection: toNormalDetection(),
        }));

        const newestFirst = [...normalizedHistory].reverse();
        const newestUsable = newestFirst.find(hasCompleteTelemetry) ?? newestFirst[0] ?? null;
        const anomalies = [...(anomalyData.anomalies ?? [])].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const newestAnomaly = anomalies[0] ?? null;

        if (!cancelled) {
          setHistory(newestFirst.slice(0, 30));
          if (newestUsable) {
            setLatest({
              ...newestUsable,
              history_size: historySize,
              detection: toNormalDetection(
                "Latest usable persisted telemetry. Historical anomaly decisions are shown separately below."
              ),
            });
          }
          if (newestAnomaly) {
            setLatestDecision({
              is_anomaly: true,
              type: newestAnomaly.type,
              severity: newestAnomaly.severity,
              confidence: newestAnomaly.confidence,
              reason: newestAnomaly.reason,
            });
            setLatestDecisionTime(newestAnomaly.timestamp);
          }
        }
      } catch {
        if (!cancelled) setError("Waiting for the AeroAlert backend.");
      }
    };

    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(`${WS_BASE}/ws?station_id=${encodeURIComponent(STATION_ID)}`);

      socket.onopen = () => {
        if (cancelled) return;
        setConnection("live");
        setError(null);
        keepAliveTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
        }, 30000);
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          const message = JSON.parse(event.data) as TelemetryMessage;
          setLatest(message);
          setLatestDecision(message.detection);
          setLatestDecisionTime(message.timestamp);
          setHistory((current) => [
            message,
            ...current.filter((item) => item.timestamp !== message.timestamp),
          ].slice(0, 30));
        } catch {
          setError("Received invalid telemetry data.");
        }
      };

      socket.onerror = () => {
        if (!cancelled) setError("Live telemetry connection failed. Persisted data is still available.");
      };

      socket.onclose = () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        keepAliveTimer = undefined;
        if (!cancelled) {
          setConnection("reconnecting");
          reconnectTimer = setTimeout(connect, 1500);
        }
      };
    };

    loadPersistedData();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      socket?.close();
    };
  }, []);

  const previous = history.find((reading) => reading.timestamp !== latest?.timestamp);
  const detection = latestDecision;
  const anomalyReadings = useMemo(
    () => history.filter((reading) => reading.detection?.is_anomaly),
    [history]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-400">
            <Activity className="h-3.5 w-3.5" /> Live prototype monitoring
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-100 font-mono uppercase">Operational Dashboard</h1>
          <p className="mt-1 text-xs text-slate-400">Real-time telemetry and anomaly decisions for {STATION_ID}</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${connection === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
          {connection === "live" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {connection === "live" ? "LIVE" : connection === "reconnecting" ? "RECONNECTING" : "CONNECTING"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>Temperature</span><Thermometer className="h-4 w-4 text-slate-500" /></div>
          <div className="flex items-end justify-between"><div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(latest?.temperature)}<span className="ml-1 text-sm text-slate-500">°C</span></div><span className="text-[11px] font-mono text-slate-500">Δ {delta(latest?.temperature, previous?.temperature)}</span></div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>Relative Humidity</span><Droplets className="h-4 w-4 text-slate-500" /></div>
          <div className="flex items-end justify-between"><div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(latest?.humidity)}<span className="ml-1 text-sm text-slate-500">%</span></div><span className="text-[11px] font-mono text-slate-500">Δ {delta(latest?.humidity, previous?.humidity)}</span></div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>Atmospheric Pressure</span><Gauge className="h-4 w-4 text-slate-500" /></div>
          <div className="flex items-end justify-between"><div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(latest?.pressure)}<span className="ml-1 text-sm text-slate-500">hPa</span></div><span className="text-[11px] font-mono text-slate-500">Δ {delta(latest?.pressure, previous?.pressure)}</span></div>
        </div>

        <div className={`space-y-2 rounded-lg border p-4 ${stateClasses(detection)}`}>
          <div className="flex items-center justify-between text-xs"><span>Current Station State</span>{detection?.is_anomaly ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</div>
          <div className="text-2xl font-bold font-mono">{detection ? (detection.is_anomaly ? detection.type : "NORMAL") : "WAITING"}</div>
          <p className="text-[11px] font-mono opacity-75">{detection ? `${(detection.confidence * 100).toFixed(1)}% model confidence` : "No decision yet"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div><h2 className="text-sm font-bold font-mono uppercase text-slate-200">Live Telemetry</h2><p className="mt-1 text-[11px] text-slate-500">Persisted observations plus the live prototype feed</p></div>
            <Radio className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Station</div><div className="mt-2 text-sm font-mono text-slate-200">{STATION_ID}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">History</div><div className="mt-2 text-sm font-mono text-slate-200">{latest?.history_size ?? history.length} readings</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Updated</div><div className="mt-2 text-sm font-mono text-slate-200">{formatTime(latest?.timestamp)}</div></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-500"><th className="px-3 py-3">Time</th><th className="px-3 py-3">Temp</th><th className="px-3 py-3">RH</th><th className="px-3 py-3">Pressure</th><th className="px-3 py-3">State</th></tr></thead>
              <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
                {history.slice(0, 10).map((reading, index) => (
                  <tr key={`${reading.timestamp}-${index}`} className="hover:bg-slate-800/20">
                    <td className="px-3 py-3 text-slate-400">{formatTime(reading.timestamp)}</td>
                    <td className="px-3 py-3 text-slate-100">{formatNumber(reading.temperature)} °C</td>
                    <td className="px-3 py-3 text-slate-100">{formatNumber(reading.humidity)} %</td>
                    <td className="px-3 py-3 text-slate-100">{formatNumber(reading.pressure)} hPa</td>
                    <td className="px-3 py-3"><span className={index === 0 ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-400" : "rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400"}>{index === 0 ? "LATEST" : "RECEIVED"}</span></td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">Waiting for telemetry…</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3"><div><h2 className="text-sm font-bold font-mono uppercase text-slate-200">Latest Decision</h2><p className="mt-1 text-[11px] text-slate-500">Most recent persisted anomaly decision</p></div><Clock className="h-4 w-4 text-slate-500" /></div>
          {detection ? (
            <>
              <div className={`rounded-lg border p-4 ${stateClasses(detection)}`}>
                <div className="text-[10px] uppercase tracking-widest opacity-70">Detection</div>
                <div className="mt-2 text-xl font-bold font-mono">{detection.is_anomaly ? detection.type : "NORMAL"}</div>
                <div className="mt-1 text-xs opacity-75">Severity: {detection.severity}</div>
                {latestDecisionTime && <div className="mt-1 text-[11px] opacity-60">{formatTime(latestDecisionTime)}</div>}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Confidence</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(0, detection.confidence * 100))}%` }} /></div>
                <div className="mt-2 font-mono text-sm text-slate-200">{(detection.confidence * 100).toFixed(1)}%</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Reason</div><p className="mt-2 text-xs leading-relaxed text-slate-300">{detection.reason}</p></div>
            </>
          ) : (
            <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">Waiting for a persisted decision…</div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold font-mono uppercase text-slate-200">System Status</h2></div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Backend</div><div className="mt-2 text-sm font-mono text-emerald-400">{connection === "live" ? "ONLINE" : "CONNECTING"}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Persisted Telemetry</div><div className="mt-2 text-sm font-mono text-slate-200">{history.length > 0 ? "AVAILABLE" : "WAITING"}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Anomaly Records</div><div className="mt-2 text-sm font-mono text-slate-200">{detection?.is_anomaly ? "ACTIVE" : anomalyReadings.length > 0 ? "DETECTED" : "READY"}</div></div>
        </div>
      </div>
    </div>
  );
}
