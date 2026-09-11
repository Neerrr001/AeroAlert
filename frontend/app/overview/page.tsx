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

type TelemetryMessage = {
  station_id: string;
  timestamp: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
  history_size: number;
  detection: Detection;
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

export default function OverviewPage() {
  const [latest, setLatest] = useState<TelemetryMessage | null>(null);
  const [history, setHistory] = useState<TelemetryMessage[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;
    let keepAliveTimer: ReturnType<typeof setInterval> | undefined;

    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/telemetry/${STATION_ID}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`History request failed (${response.status})`);
        const data = await response.json();
        const readings: TelemetryMessage[] = (data.readings ?? []).map((reading: any) => ({
          ...reading,
          history_size: data.count ?? 0,
          detection: {
            is_anomaly: false,
            type: "HISTORICAL",
            severity: "LOW",
            confidence: 0,
            reason: "Historical reading; no live detection was stored with this reading.",
          },
        }));
        if (!cancelled) setHistory(readings.reverse().slice(0, 30));
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
          setHistory((current) => [
            message,
            ...current.filter((item) => item.timestamp !== message.timestamp),
          ].slice(0, 30));
        } catch {
          setError("Received invalid telemetry data.");
        }
      };

      socket.onerror = () => {
        if (!cancelled) setError("Live telemetry connection failed.");
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

    loadHistory();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      socket?.close();
    };
  }, []);

  const previous = history[1];
  const detection = latest?.detection ?? null;
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
          <p className="mt-1 text-xs text-slate-400">
            Real-time telemetry and anomaly decisions for {STATION_ID}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${connection === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
          {connection === "live" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {connection === "live" ? "LIVE" : connection === "reconnecting" ? "RECONNECTING" : "CONNECTING"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>Temperature</span><Thermometer className="w-4 h-4 text-slate-500" /></div>
          <div className="flex items-end justify-between"><div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(latest?.temperature)}<span className="ml-1 text-sm text-slate-500">°C</span></div><span className="text-[11px] text-slate-500 font-mono">Δ {delta(latest?.temperature, previous?.temperature)}</span></div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>Relative Humidity</span><Droplets className="w-4 h-4 text-slate-500" /></div>
          <div className="flex items-end justify-between"><div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(latest?.humidity)}<span className="ml-1 text-sm text-slate-500">%</span></div><span className="text-[11px] text-slate-500 font-mono">Δ {delta(latest?.humidity, previous?.humidity)}</span></div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400"><span>Atmospheric Pressure</span><Gauge className="w-4 h-4 text-slate-500" /></div>
          <div className="flex items-end justify-between"><div className="text-2xl font-bold font-mono text-slate-100">{formatNumber(latest?.pressure)}<span className="ml-1 text-sm text-slate-500">hPa</span></div><span className="text-[11px] text-slate-500 font-mono">Δ {delta(latest?.pressure, previous?.pressure)}</span></div>
        </div>

        <div className={`p-4 border rounded-lg space-y-2 ${stateClasses(detection)}`}>
          <div className="flex items-center justify-between text-xs"><span>Current Station State</span>{detection?.is_anomaly ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</div>
          <div className="text-2xl font-bold font-mono">{detection ? (detection.is_anomaly ? detection.type : "NORMAL") : "WAITING"}</div>
          <p className="text-[11px] font-mono opacity-75">{detection ? `${(detection.confidence * 100).toFixed(1)}% model confidence` : "No decision yet"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold font-mono uppercase text-slate-200">Live Telemetry</h2>
              <p className="mt-1 text-[11px] text-slate-500">Latest observations received from the prototype feed</p>
            </div>
            <Radio className="w-4 h-4 text-emerald-400" />
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

        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3"><h2 className="text-sm font-bold font-mono uppercase text-slate-200">Latest Decision</h2><Clock className="w-4 h-4 text-slate-500" /></div>
          {detection ? (
            <>
              <div className={`rounded-lg border p-4 ${stateClasses(detection)}`}>
                <div className="text-[10px] uppercase tracking-widest opacity-70">Detection</div>
                <div className="mt-2 text-xl font-bold font-mono">{detection.is_anomaly ? detection.type : "NORMAL"}</div>
                <div className="mt-1 text-xs opacity-75">Severity: {detection.severity}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Confidence</div>
                <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(0, detection.confidence * 100))}%` }} /></div>
                <div className="mt-2 font-mono text-sm text-slate-200">{(detection.confidence * 100).toFixed(1)}%</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Reason</div><p className="mt-2 text-xs leading-relaxed text-slate-300">{detection.reason}</p></div>
            </>
          ) : (
            <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">Waiting for the first live decision…</div>
          )}
        </div>
      </div>

      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-bold font-mono uppercase text-slate-200">System Status</h2></div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"><span className="text-slate-400">Telemetry stream</span><span className={connection === "live" ? "text-emerald-400" : "text-slate-500"}>{connection === "live" ? "READY" : "WAITING"}</span></div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"><span className="text-slate-400">Anomaly engine</span><span className={latest ? "text-emerald-400" : "text-slate-500"}>{latest ? "READY" : "WAITING"}</span></div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"><span className="text-slate-400">Recent live anomalies</span><span className={anomalyReadings.length ? "text-amber-400" : "text-emerald-400"}>{anomalyReadings.length}</span></div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-600">
        Prototype source: simulated {STATION_ID} telemetry. This dashboard does not represent a nationwide live IMD deployment.
      </p>
    </div>
  );
}
