"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Gauge,
  LucideIcon,
  Radio,
  Thermometer,
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

type Metric = {
  label: string;
  value: number | null;
  unit: string;
  Icon: LucideIcon;
  change: string;
};

const STATION_ID = "LUCKNOW_001";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? API_BASE.replace(/^http/, "ws");

const formatNumber = (value: number | null, digits = 1) =>
  value == null || Number.isNaN(value) ? "—" : value.toFixed(digits);

const formatTime = (timestamp: string | null) =>
  timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

function statusClasses(detection: Detection | null) {
  if (!detection) return "border-slate-700 bg-slate-900 text-slate-400";
  if (!detection.is_anomaly) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  return detection.severity === "HIGH"
    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
    : "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export default function DashboardPage() {
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
        if (!response.ok) throw new Error();
        const data = await response.json();
        const readings: TelemetryMessage[] = (data.readings ?? []).map((reading: any) => ({
          ...reading,
          history_size: data.count,
          detection: { is_anomaly: false, type: "HISTORICAL", severity: "LOW", confidence: 0, reason: "Historical reading." },
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
          setHistory((current) => [message, ...current.filter((item) => item.timestamp !== message.timestamp)].slice(0, 30));
        } catch {
          setError("Received invalid telemetry data.");
        }
      };
      socket.onerror = () => {
        if (!cancelled) setError("Live telemetry connection failed.");
      };
      socket.onclose = () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
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
  const delta = (current: number | null | undefined, old: number | null | undefined) =>
    current == null || old == null ? "—" : `${current - old >= 0 ? "+" : ""}${(current - old).toFixed(1)}`;

  const metrics: Metric[] = [
    { label: "Temperature", value: latest?.temperature ?? null, unit: "°C", Icon: Thermometer, change: delta(latest?.temperature, previous?.temperature) },
    { label: "Relative Humidity", value: latest?.humidity ?? null, unit: "%", Icon: Droplets, change: delta(latest?.humidity, previous?.humidity) },
    { label: "Atmospheric Pressure", value: latest?.pressure ?? null, unit: "hPa", Icon: Gauge, change: delta(latest?.pressure, previous?.pressure) },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-400">
              <Activity className="h-3.5 w-3.5" /> Real-time anomaly monitoring
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-100 font-mono">AeroAlert Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">Live telemetry and anomaly decisions from the prototype weather-station feed.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-mono">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${connection === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
              {connection === "live" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {connection === "live" ? "LIVE" : connection === "reconnecting" ? "RECONNECTING" : "CONNECTING"}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-slate-400">{STATION_ID}</span>
          </div>
        </div>
        {error && <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">{error}</div>}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map(({ label, value, unit, Icon, change }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between text-slate-500"><span className="text-[11px] font-mono uppercase tracking-widest">{label}</span><Icon className="h-4 w-4" /></div>
            <div className="mt-4 flex items-end justify-between"><div><span className="font-mono text-3xl font-bold text-slate-100">{formatNumber(value)}</span><span className="ml-2 text-sm text-slate-500">{unit}</span></div><span className="font-mono text-xs text-slate-500">Δ {change}</span></div>
          </div>
        ))}
        <div className={`rounded-xl border p-5 ${statusClasses(detection)}`}>
          <div className="flex items-center justify-between opacity-70"><span className="text-[11px] font-mono uppercase tracking-widest">Current state</span>{detection?.is_anomaly ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</div>
          <div className="mt-4 font-mono text-2xl font-bold">{detection ? (detection.is_anomaly ? detection.type : "NORMAL") : "WAITING"}</div>
          <div className="mt-1 text-xs opacity-70">{detection ? `${(detection.confidence * 100).toFixed(1)}% model confidence` : "No decision yet"}</div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-5 py-4"><h2 className="text-sm font-bold uppercase text-slate-100 font-mono">Latest anomaly decision</h2><p className="mt-1 text-[11px] text-slate-500">Generated from the newest observation</p></div>
          <div className="p-5">
            {detection ? <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${statusClasses(detection)}`}>{detection.is_anomaly ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{detection.is_anomaly ? detection.type : "NORMAL"}</span><h3 className="mt-3 text-xl font-bold text-slate-100">{detection.is_anomaly ? "Anomaly detected" : "No anomaly detected"}</h3></div>
                <div><div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Confidence</div><div className="mt-1 text-2xl font-bold font-mono text-slate-100">{(detection.confidence * 100).toFixed(1)}%</div></div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"><div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Explanation</div><p className="mt-2 text-sm leading-relaxed text-slate-300">{detection.reason}</p></div>
              <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">Severity</div><div className="mt-1 font-mono text-sm text-slate-100">{detection.severity}</div></div><div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">History</div><div className="mt-1 font-mono text-sm text-slate-100">{latest?.history_size ?? history.length} readings</div></div><div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">Updated</div><div className="mt-1 font-mono text-sm text-slate-100">{formatTime(latest?.timestamp ?? null)}</div></div></div>
            </div> : <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">Waiting for telemetry…</div>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-bold uppercase text-slate-100 font-mono">Pipeline status</h2></div>
          <div className="mt-5 space-y-3 text-xs font-mono">
            {[["Telemetry stream", connection === "live"],["Rolling station history", history.length > 0],["Anomaly engine", Boolean(latest)]].map(([label, ready]) => <div key={String(label)} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5"><span className="text-slate-400">{label}</span><span className={ready ? "text-emerald-400" : "text-slate-600"}>{ready ? "READY" : "WAITING"}</span></div>)}
          </div>
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Inference pipeline</div><p className="mt-2 text-xs leading-relaxed text-slate-400">Telemetry → rolling history → feature engineering → rules + Random Forest → severity, confidence and explanation.</p></div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="text-sm font-bold uppercase text-slate-100 font-mono">Recent telemetry</h2><p className="mt-1 text-[11px] text-slate-500">Latest readings received from the station feed</p></div><Link href="/live" className="flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300">Open live view <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-slate-800 bg-slate-900/70 text-[10px] font-mono uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Time</th><th className="px-5 py-3">Temperature</th><th className="px-5 py-3">Humidity</th><th className="px-5 py-3">Pressure</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-800/70 text-xs font-mono">{history.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No telemetry received yet.</td></tr> : history.slice(0, 10).map((reading, index) => <tr key={`${reading.timestamp}-${index}`} className="hover:bg-slate-800/20"><td className="px-5 py-3 text-slate-400">{formatTime(reading.timestamp)}</td><td className="px-5 py-3 text-slate-100">{formatNumber(reading.temperature)} °C</td><td className="px-5 py-3 text-slate-100">{formatNumber(reading.humidity)} %</td><td className="px-5 py-3 text-slate-100">{formatNumber(reading.pressure)} hPa</td><td className="px-5 py-3"><span className={index === 0 ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-400" : "rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400"}>{index === 0 ? "LATEST" : "RECEIVED"}</span></td></tr>)}</tbody></table></div>
      </section>

      <div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Station</div><div className="mt-2 font-mono text-sm text-slate-200">{STATION_ID}</div></div><div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Transport</div><div className="mt-2 font-mono text-sm text-slate-200">REST + WebSocket</div></div><div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Model</div><div className="mt-2 font-mono text-sm text-slate-200">Rules + Random Forest</div></div></div>

      <p className="text-[11px] leading-relaxed text-slate-600">Prototype data source: simulated AWS telemetry based on historical weather data. The dashboard does not claim a nationwide live IMD deployment.</p>
    </div>
  );
}
