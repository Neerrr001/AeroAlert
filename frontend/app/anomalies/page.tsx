"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, Droplets,
  Eye, Filter, Gauge, RefreshCw, ShieldAlert, Thermometer, Wifi, WifiOff,
} from "lucide-react";

type Detection = {
  is_anomaly: boolean;
  type: string;
  severity: string;
  confidence: number;
  reason: string;
  class_probabilities?: Record<string, number>;
};

type TelemetryPoint = {
  timestamp: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
};

type Anomaly = {
  station_id: string;
  timestamp: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
  history_size: number;
  detection: Detection;
  telemetry_context?: TelemetryPoint[];
};

type FilterType = "ALL" | "SPIKE" | "DRIFT" | "FROZEN_SENSOR" | "STEP_CHANGE" | "MISSING_DATA";

const STATION_ID = "LUCKNOW_001";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? API_BASE.replace(/^http/, "ws");

const formatTime = (timestamp: string) => new Date(timestamp).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const formatValue = (value: number | null, unit: string) => value == null || Number.isNaN(value) ? "—" : `${value.toFixed(1)} ${unit}`;
const anomalyTitle = (type: string) => type.replaceAll("_", " ");

function severityClasses(severity: string) {
  if (severity === "HIGH") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (severity === "MEDIUM") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

function EvidenceChart({ points, anomalyType }: { points: TelemetryPoint[]; anomalyType: string }) {
  const valid = points.filter((p) => p.temperature != null || p.pressure != null || p.humidity != null);
  if (!valid.length) return <div className="py-10 text-center text-xs text-slate-500">No telemetry evidence was captured for this event.</div>;

  const width = 900;
  const height = 260;
  const left = 48;
  const right = 18;
  const top = 22;
  const bottom = 34;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const series = [
    { key: "temperature", label: "Temperature °C", value: (p: TelemetryPoint) => p.temperature, className: "text-rose-400" },
    { key: "humidity", label: "Humidity %", value: (p: TelemetryPoint) => p.humidity, className: "text-sky-400" },
    { key: "pressure", label: "Pressure hPa", value: (p: TelemetryPoint) => p.pressure, className: "text-violet-400" },
  ];

  const allValues = valid.flatMap((p) => series.map((s) => s.value(p)).filter((v): v is number => v != null && Number.isFinite(v)));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const x = (i: number) => left + (i / Math.max(1, valid.length - 1)) * plotW;
  const y = (v: number) => top + (1 - (v - min) / range) * plotH;
  const pathFor = (value: (p: TelemetryPoint) => number | null) => valid.map((p, i) => [x(i), value(p) == null ? null : y(value(p)!)] as const).filter((p): p is readonly [number, number] => p[1] != null).map((p, i, arr) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Telemetry evidence</div>
          <div className="mt-1 text-xs text-slate-400">Latest {valid.length} readings captured around the {anomalyTitle(anomalyType).toLowerCase()} decision</div>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-mono">
          {series.map((s) => <span key={s.key} className={`${s.className} flex items-center gap-1.5`}><span className="h-1.5 w-4 rounded-full bg-current" />{s.label}</span>)}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] min-w-[720px] w-full" role="img" aria-label="Temperature, humidity and pressure telemetry context">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => { const yy = top + ratio * plotH; const value = max - ratio * range; return <g key={ratio}><line x1={left} x2={width - right} y1={yy} y2={yy} stroke="currentColor" className="text-slate-800" strokeWidth="1" /><text x={left - 7} y={yy + 3} textAnchor="end" className="fill-slate-600 text-[9px]">{value.toFixed(1)}</text></g>; })}
          <line x1={left} x2={width - right} y1={top + plotH} y2={top + plotH} stroke="currentColor" className="text-slate-700" />
          {series.map((s) => <path key={s.key} d={pathFor(s.value)} fill="none" stroke="currentColor" className={s.className} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
          {valid.map((p, i) => <circle key={i} cx={x(i)} cy={top + plotH} r="2" className="fill-slate-700" />)}
          <line x1={x(valid.length - 1)} x2={x(valid.length - 1)} y1={top} y2={top + plotH} stroke="currentColor" strokeDasharray="4 4" className="text-amber-400/60" />
          <text x={x(valid.length - 1) - 5} y={top + 10} textAnchor="end" className="fill-amber-400 text-[9px]">FLAGGED READING</text>
          <text x={left} y={height - 8} className="fill-slate-600 text-[9px]">{new Date(valid[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</text>
          <text x={width - right} y={height - 8} textAnchor="end" className="fill-slate-600 text-[9px]">{new Date(valid[valid.length - 1].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</text>
        </svg>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">The three variables share one visual scale for shape comparison; their units are shown in the legend. This chart is evidence context, not a calibrated meteorological plot.</p>
    </div>
  );
}

export default function AnomalyReviewPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [connection, setConnection] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const loadAnomalies = async () => {
    try {
      const response = await fetch(`${API_BASE}/anomalies?station_id=${encodeURIComponent(STATION_ID)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAnomalies(data.anomalies ?? []);
      setError(null);
    } catch { setError("Unable to load anomaly history from the AeroAlert backend."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;
    loadAnomalies();
    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(`${WS_BASE}/ws?station_id=${encodeURIComponent(STATION_ID)}`);
      socket.onopen = () => !cancelled && setConnection("live");
      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          const message = JSON.parse(event.data) as Anomaly;
          if (!message.detection?.is_anomaly) return;
          setAnomalies((current) => [message, ...current.filter((item) => item.timestamp !== message.timestamp)].slice(0, 100));
        } catch { setError("Received invalid live anomaly data."); }
      };
      socket.onerror = () => !cancelled && setError("Live anomaly stream connection failed.");
      socket.onclose = () => { if (!cancelled) { setConnection("reconnecting"); reconnectTimer = setTimeout(connect, 1500); } };
    };
    connect();
    return () => { cancelled = true; if (reconnectTimer) clearTimeout(reconnectTimer); socket?.close(); };
  }, []);

  const filtered = useMemo(() => filter === "ALL" ? anomalies : anomalies.filter((item) => item.detection.type === filter), [anomalies, filter]);
  const high = anomalies.filter((item) => item.detection.severity === "HIGH").length;
  const medium = anomalies.filter((item) => item.detection.severity === "MEDIUM").length;

  const toggleAcknowledged = (key: string) => setAcknowledged((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-amber-400"><ShieldAlert className="h-3.5 w-3.5" /> Quality control queue</div>
          <h1 className="mt-2 text-xl font-bold text-slate-100 font-mono uppercase">Anomaly Review</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">Live anomaly decisions generated by AeroAlert for {STATION_ID}. Inspect the telemetry evidence before treating a flag as a genuine weather event or sensor fault.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${connection === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900 text-slate-400"}`}>{connection === "live" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{connection === "live" ? "LIVE" : connection === "reconnecting" ? "RECONNECTING" : "CONNECTING"}</span>
          <button onClick={loadAnomalies} className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300 hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Flagged readings</div><div className="mt-2 font-mono text-2xl font-bold text-slate-100">{anomalies.length}</div><div className="mt-1 text-[11px] text-slate-500">Current in-memory review queue</div></div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4"><div className="text-[10px] uppercase tracking-widest text-rose-400">High severity</div><div className="mt-2 font-mono text-2xl font-bold text-rose-300">{high}</div><div className="mt-1 text-[11px] text-slate-500">Requires immediate attention</div></div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="text-[10px] uppercase tracking-widest text-amber-400">Medium severity</div><div className="mt-2 font-mono text-2xl font-bold text-amber-300">{medium}</div><div className="mt-1 text-[11px] text-slate-500">Needs operator review</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Station</div><div className="mt-2 font-mono text-lg font-bold text-slate-100">{STATION_ID}</div><div className="mt-1 text-[11px] text-slate-500">48-reading inference window</div></div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400"><Filter className="h-4 w-4" /> Filter fault class</div>
        <div className="flex flex-wrap gap-2">{(["ALL", "SPIKE", "DRIFT", "FROZEN_SENSOR", "STEP_CHANGE", "MISSING_DATA"] as FilterType[]).map((type) => <button key={type} onClick={() => setFilter(type)} className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase transition ${filter === type ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-950 text-slate-500 hover:text-slate-300"}`}>{type === "ALL" ? "All" : anomalyTitle(type)}</button>)}</div>
      </div>

      <div className="space-y-4">
        {loading ? <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-sm text-slate-500">Loading anomaly history…</div> : filtered.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" /><h2 className="mt-3 text-sm font-bold font-mono uppercase text-slate-200">No matching anomalies</h2><p className="mt-1 text-xs text-slate-500">The current review queue has no flagged readings for this filter.</p></div>
        ) : filtered.map((item) => {
          const key = `${item.station_id}-${item.timestamp}`;
          const isExpanded = expanded === key;
          const isAcknowledged = acknowledged.has(key);
          const { detection } = item;
          return (
            <div key={key} className={`rounded-xl border bg-slate-900/60 transition ${isAcknowledged ? "border-slate-800 opacity-70" : detection.severity === "HIGH" ? "border-rose-500/20" : "border-slate-800"}`}>
              <div className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-3"><div className={`mt-0.5 rounded-lg border p-2 ${severityClasses(detection.severity)}`}><AlertTriangle className="h-4 w-4" /></div><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-slate-100">{anomalyTitle(detection.type)}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${severityClasses(detection.severity)}`}>{detection.severity}</span>{isAcknowledged && <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-500">ACKNOWLEDGED</span>}</div><div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500"><span>{item.station_id}</span><span>•</span><span>{formatTime(item.timestamp)}</span></div></div></div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
                    <div><div className="text-[9px] uppercase tracking-widest text-slate-600">Temperature</div><div className="mt-1 font-mono text-xs text-slate-200">{formatValue(item.temperature, "°C")}</div></div>
                    <div><div className="text-[9px] uppercase tracking-widest text-slate-600">Humidity</div><div className="mt-1 font-mono text-xs text-slate-200">{formatValue(item.humidity, "%")}</div></div>
                    <div><div className="text-[9px] uppercase tracking-widest text-slate-600">Pressure</div><div className="mt-1 font-mono text-xs text-slate-200">{formatValue(item.pressure, "hPa")}</div></div>
                    <div><div className="text-[9px] uppercase tracking-widest text-slate-600">Confidence</div><div className="mt-1 font-mono text-xs font-bold text-emerald-400">{(detection.confidence * 100).toFixed(1)}%</div></div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500"><Eye className="h-3.5 w-3.5" /> Model explanation</div><p className="mt-2 text-xs leading-relaxed text-slate-300">{detection.reason}</p></div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/70 pt-4">
                  <button onClick={() => setExpanded(isExpanded ? null : key)} className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{isExpanded ? "Hide telemetry evidence" : "Inspect telemetry evidence"}</button>
                  <button onClick={() => toggleAcknowledged(key)} className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-300 hover:bg-slate-800"><CheckCircle2 className="h-3.5 w-3.5" /> {isAcknowledged ? "Unacknowledge" : "Acknowledge"}</button>
                </div>

                {isExpanded && <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                  <EvidenceChart points={item.telemetry_context ?? []} anomalyType={detection.type} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Thermometer className="h-3.5 w-3.5" /> Flagged temperature</div><div className="mt-2 font-mono text-lg text-slate-100">{formatValue(item.temperature, "°C")}</div></div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Droplets className="h-3.5 w-3.5" /> Flagged humidity</div><div className="mt-2 font-mono text-lg text-slate-100">{formatValue(item.humidity, "%")}</div></div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Gauge className="h-3.5 w-3.5" /> Flagged pressure</div><div className="mt-2 font-mono text-lg text-slate-100">{formatValue(item.pressure, "hPa")}</div></div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Clock className="h-3.5 w-3.5" /> Inference context</div><div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono"><div><span className="text-slate-600">History</span><div className="mt-1 text-slate-300">{item.history_size} readings</div></div><div><span className="text-slate-600">Evidence</span><div className="mt-1 text-slate-300">{item.telemetry_context?.length ?? 0} points</div></div><div><span className="text-slate-600">Decision</span><div className="mt-1 text-rose-300">ANOMALY</div></div><div><span className="text-slate-600">Time</span><div className="mt-1 text-slate-300">{formatTime(item.timestamp)}</div></div></div></div>
                  {detection.class_probabilities && <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Class probabilities</div><div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">{Object.entries(detection.class_probabilities).map(([name, probability]) => <div key={name} className="rounded border border-slate-800 p-2"><div className="truncate text-[9px] text-slate-600">{name}</div><div className="mt-1 font-mono text-xs text-slate-300">{(probability * 100).toFixed(1)}%</div></div>)}</div></div>}
                </div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-[11px] leading-relaxed text-slate-600">Review queue is intentionally in-memory for the prototype. “Acknowledge” is a local UI state and is not yet persisted as an operator decision. Telemetry evidence is captured from the same rolling station history used by the anomaly detector.</div>
    </div>
  );
}
