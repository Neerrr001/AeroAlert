"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Gauge,
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

type HistoryReading = {
  timestamp: string;
  station_id: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
};

type HistoryResponse = {
  readings: HistoryReading[];
};

type ConnectionStatus = "connecting" | "live" | "reconnecting";

const STATION_ID = "LUCKNOW_001";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? API_BASE.replace(/^http/, "ws");

const formatNumber = (value: number | null, digits = 1) =>
  value == null || Number.isNaN(value) ? "—" : value.toFixed(digits);

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function statusClasses(detection: Detection) {
  if (!detection.is_anomaly) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }
  return detection.severity === "HIGH"
    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
    : "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export default function LiveTelemetryPage() {
  const [readings, setReadings] = useState<HistoryReading[]>([]);
  const [latest, setLatest] = useState<TelemetryMessage | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
    let socket: WebSocket | null = null;

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/telemetry/${encodeURIComponent(STATION_ID)}`
        );
        if (!response.ok) throw new Error(`History request failed (${response.status})`);
        const data = (await response.json()) as HistoryResponse;
        if (!cancelled) setReadings([...data.readings].reverse().slice(0, 30));
      } catch {
        if (!cancelled) setError("Waiting for the backend station history.");
      }
    };

    const connect = () => {
      if (cancelled) return;
      setConnection((current) => (current === "connecting" ? "connecting" : "reconnecting"));

      socket = new WebSocket(
        `${WS_BASE}/ws?station_id=${encodeURIComponent(STATION_ID)}`
      );

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
          setReadings((current) => [
            {
              timestamp: message.timestamp,
              station_id: message.station_id,
              temperature: message.temperature,
              pressure: message.pressure,
              humidity: message.humidity,
            },
            ...current.filter((reading) => reading.timestamp !== message.timestamp),
          ].slice(0, 30));
        } catch {
          setError("Received an invalid telemetry message.");
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

  const detection = latest?.detection;

  const metrics: Array<{
    label: string;
    value: number | null;
    unit: string;
    Icon: typeof Thermometer;
  }> = [
    ["Temperature", latest?.temperature ?? null, "°C", Thermometer],
    ["Relative Humidity", latest?.humidity ?? null, "%", Droplets],
    ["Pressure", latest?.pressure ?? null, "hPa", Gauge],
  ].map(([label, value, unit, Icon]) => ({ label, value, unit, Icon }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-400">
            <Radio className="h-3.5 w-3.5" />
            Prototype feed
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-100 font-mono uppercase">Live Telemetry</h1>
          <p className="mt-1 text-xs text-slate-400">
            {STATION_ID} • streaming telemetry into the anomaly engine
          </p>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${
          connection === "live"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-slate-700 bg-slate-900 text-slate-400"
        }`}>
          {connection === "live" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {connection === "live" ? "Live" : connection === "reconnecting" ? "Reconnecting" : "Connecting"}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, unit, Icon }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-mono uppercase tracking-widest">{label}</span>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-100 font-mono">
                {formatNumber(value)}
              </span>
              <span className="pb-1 text-sm text-slate-500">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Latest decision</h2>
              <p className="mt-1 text-[11px] text-slate-500">Output generated from the newest observation</p>
            </div>
            {detection && (
              <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-mono ${statusClasses(detection)}`}>
                {detection.is_anomaly ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {detection.type}
              </span>
            )}
          </div>
          <div className="space-y-4 p-5">
            {detection ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Severity</div>
                    <div className="mt-1 font-mono text-sm text-slate-100">{detection.severity}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Confidence</div>
                    <div className="mt-1 font-mono text-sm text-slate-100">{(detection.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">History</div>
                    <div className="mt-1 font-mono text-sm text-slate-100">{latest?.history_size ?? readings.length} readings</div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Explanation</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{detection.reason}</p>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">Last evaluated: {latest ? formatTime(latest.timestamp) : "—"}</div>
              </>
            ) : (
              <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">Waiting for the first live telemetry message…</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Pipeline status</h2>
          <div className="mt-4 space-y-3 text-xs font-mono">
            {[
              ["Telemetry stream", connection === "live"],
              ["Rolling history", readings.length > 0],
              ["Anomaly engine", Boolean(latest)],
            ].map(([label, ready]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                <span className="text-slate-400">{label}</span>
                <span className={ready ? "text-emerald-400" : "text-slate-600"}>{ready ? "READY" : "WAITING"}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
            Only telemetry is sent to the backend; the simulator&apos;s ground-truth labels are not sent to the detector.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Recent telemetry</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/70 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Temp</th>
                <th className="px-5 py-3">Humidity</th>
                <th className="px-5 py-3">Pressure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
              {readings.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No telemetry received yet.</td></tr>
              ) : readings.map((reading, index) => (
                <tr key={`${reading.timestamp}-${index}`} className="hover:bg-slate-800/30">
                  <td className="px-5 py-3 text-slate-400">{formatTime(reading.timestamp)}</td>
                  <td className="px-5 py-3 text-slate-100">{formatNumber(reading.temperature)} °C</td>
                  <td className="px-5 py-3 text-slate-100">{formatNumber(reading.humidity)} %</td>
                  <td className="px-5 py-3 text-slate-100">{formatNumber(reading.pressure)} hPa</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-slate-600">
        Prototype source: simulated LUCKNOW_001 telemetry. This page deliberately does not imply a nationwide live IMD deployment.
      </p>
    </div>
  );
}
