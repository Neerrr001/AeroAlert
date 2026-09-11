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

function ExpectedObserved({ item }: { item: Anomaly }) {
  const points = item.telemetry_context ?? [];
  const variables = [
    { key: "temperature", label: "Temperature", unit: "°C", value: item.temperature, get: (p: TelemetryPoint) => p.temperature },
    { key: "humidity", label: "Relative humidity", unit: "%", value: item.humidity, get: (p: TelemetryPoint) => p.humidity },
    { key: "pressure", label: "Atmospheric pressure", unit: "hPa", value: item.pressure, get: (p: TelemetryPoint) => p.pressure },
  ];

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.035] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Expected vs observed</div>
          <div className="mt-1 text-xs text-slate-400">Expected value = mean of the preceding evidence window; observed value = flagged reading.</div>
        </div>
        <div className="text-[10px] font-mono text-slate-600">BASELINE → FLAGGED</div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {variables.map((variable) => {
          const previous = points.slice(0, -1).map(variable.get).filter((v): v is number => v != null && Number.isFinite(v));
          const expected = previous.length ? previous.reduce((sum, value) => sum + value, 0) / previous.length : null;
          const observed = variable.value;
          const delta = expected != null && observed != null ? observed - expected : null;
          const relative = expected != null && observed != null && expected !== 0 ? Math.abs(delta! / expected) * 100 : null;

          return (
            <div key={variable.key} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{variable.label}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">Expected</div>
                  <div className="mt-1 font-mono text-sm text-slate-300">{formatValue(expected, variable.unit)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-amber-500/80">Observed</div>
                  <div className="mt-1 font-mono text-sm font-bold text-amber-300">{formatValue(observed, variable.unit)}</div>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-800 pt-2 flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase tracking-widest text-slate-600">Deviation</span>
                <span className={`font-mono text-xs font-bold ${delta != null && Math.abs(delta) > 0 ? "text-amber-300" : "text-slate-500"}`}>
                  {delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} ${variable.unit}`}
                  {relative != null && <span className="ml-1 text-slate-600">({relative.toFixed(1)}%)</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-600">
        <span className="rounded border border-slate-800 px-2 py-1">Evidence window: {points.length} readings</span>
        <span className="rounded border border-slate-800 px-2 py-1">Decision: {anomalyTitle(item.detection.type)}</span>
        <span className="rounded border border-slate-800 px-2 py-1">Model confidence: {(item.detection.confidence * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

function EvidenceSeries({ label, unit, points, getValue, accent }: { label: string; unit: string; points: TelemetryPoint[]; getValue: (point: TelemetryPoint) => number | null; accent: string }) {
  const values = points.map(getValue);
  const numeric = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!numeric.length) return <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</div><div className="mt-5 text-center text-xs text-slate-600">No data</div></div>;

  const width = 900, height = 150, left = 48, right = 18, top = 16, bottom = 25;
  const plotW = width - left - right, plotH = height - top - bottom;
  const rawMin = Math.min(...numeric), rawMax = Math.max(...numeric), rawRange = rawMax - rawMin;
  const padding = rawRange === 0 ? Math.max(Math.abs(rawMin) * 0.02, 0.5) : rawRange * 0.12;
  const min = rawMin - padding, max = rawMax + padding, range = max - min || 1;
  const x = (index: number) => left + (index / Math.max(1, points.length - 1)) * plotW;
  const y = (value: number) => top + (1 - (value - min) / range) * plotH;
  const pathSegments: string[] = [];
  let currentSegment = "";
  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) { if (currentSegment) { pathSegments.push(currentSegment); currentSegment = ""; } return; }
    currentSegment += `${currentSegment ? " L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
  });
  if (currentSegment) pathSegments.push(currentSegment);
  const latestIndex = [...values].reduce((last, value, index) => value != null && Number.isFinite(value) ? index : last, -1);
  const latestValue = latestIndex >= 0 ? values[latestIndex] : null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${accent}`} /><span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{label}</span></div>
        <span className="text-[10px] font-mono text-slate-600">range {rawMin.toFixed(1)}–{rawMax.toFixed(1)} {unit}</span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] min-w-[720px] w-full" role="img" aria-label={`${label} telemetry evidence`}>
          {[0, 0.5, 1].map((ratio) => { const yy = top + ratio * plotH; const axisValue = max - ratio * range; return <g key={ratio}><line x1={left} x2={width - right} y1={yy} y2={yy} stroke="currentColor" className="text-slate-800" strokeWidth="1" /><text x={left - 7} y={yy + 3} textAnchor="end" className="fill-slate-600 text-[9px]">{axisValue.toFixed(1)}</text></g>; })}
          <line x1={left} x2={width - right} y1={top + plotH} y2={top + plotH} stroke="currentColor" className="text-slate-700" />
          {pathSegments.map((path, index) => <path key={index} d={path} fill="none" stroke="currentColor" className={accent.replace("bg-", "text-")} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />)}
          {latestIndex >= 0 && latestValue != null && <><line x1={x(latestIndex)} x2={x(latestIndex)} y1={top} y2={top + plotH} stroke="currentColor" strokeDasharray="4 4" className="text-amber-400/70" /><circle cx={x(latestIndex)} cy={y(latestValue)} r="5" className="fill-amber-400" /><text x={Math.min(width - 8, x(latestIndex) + 8)} y={Math.max(13, y(latestValue) - 8)} className="fill-amber-400 text-[9px]">FLAGGED</text></>}
          <text x={left} y={height - 7} className="fill-slate-600 text-[9px]">{new Date(points[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</text>
          <text x={width - right} y={height - 7} textAnchor="end" className="fill-slate-600 text-[9px]">{new Date(points[points.length - 1].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</text>
        </svg>
      </div>
    </div>
  );
}

function EvidenceChart({ points, anomalyType }: { points: TelemetryPoint[]; anomalyType: string }) {
  if (!points.length) return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-10 text-center text-xs text-slate-500">No telemetry evidence was captured for this event.</div>;
  return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Telemetry evidence</div><div className="mt-1 text-xs text-slate-400">Independent scales make changes in each sensor signal visible without distorting their physical units.</div></div><div className="text-[10px] font-mono text-amber-400">LAST READING = FLAGGED</div></div><div className="mt-4 space-y-3"><EvidenceSeries label="Temperature" unit="°C" points={points} getValue={(p) => p.temperature} accent="bg-rose-400" /><EvidenceSeries label="Relative Humidity" unit="%" points={points} getValue={(p) => p.humidity} accent="bg-sky-400" /><EvidenceSeries label="Atmospheric Pressure" unit="hPa" points={points} getValue={(p) => p.pressure} accent="bg-violet-400" /></div><div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-600"><div>Event: {anomalyTitle(anomalyType)}</div><div className="sm:text-center">Evidence: {points.length} readings</div><div className="sm:text-right">Time aligned</div></div></div>;
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
        <div><div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-amber-400"><ShieldAlert className="h-3.5 w-3.5" /> Quality control queue</div><h1 className="mt-2 text-xl font-bold text-slate-100 font-mono uppercase">Anomaly Review</h1><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">Live anomaly decisions generated by AeroAlert for {STATION_ID}. Inspect the telemetry evidence before treating a flag as a genuine weather event or sensor fault.</p></div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono"><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${connection === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900 text-slate-400"}`}>{connection === "live" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{connection === "live" ? "LIVE" : connection === "reconnecting" ? "RECONNECTING" : "CONNECTING"}</span><button onClick={loadAnomalies} className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300 hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button></div>
      </div>

      {error && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Flagged readings</div><div className="mt-2 font-mono text-2xl font-bold text-slate-100">{anomalies.length}</div><div className="mt-1 text-[11px] text-slate-500">Current in-memory review queue</div></div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4"><div className="text-[10px] uppercase tracking-widest text-rose-400">High severity</div><div className="mt-2 font-mono text-2xl font-bold text-rose-300">{high}</div><div className="mt-1 text-[11px] text-slate-500">Requires immediate attention</div></div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="text-[10px] uppercase tracking-widest text-amber-400">Medium severity</div><div className="mt-2 font-mono text-2xl font-bold text-amber-300">{medium}</div><div className="mt-1 text-[11px] text-slate-500">Needs operator review</div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Station</div><div className="mt-2 font-mono text-lg font-bold text-slate-100">{STATION_ID}</div><div className="mt-1 text-[11px] text-slate-500">48-reading inference window</div></div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2 text-xs font-mono text-slate-400"><Filter className="h-4 w-4" /> Filter fault class</div><div className="flex flex-wrap gap-2">{(["ALL", "SPIKE", "DRIFT", "FROZEN_SENSOR", "STEP_CHANGE", "MISSING_DATA"] as FilterType[]).map((type) => <button key={type} onClick={() => setFilter(type)} className={`rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase transition ${filter === type ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-950 text-slate-500 hover:text-slate-300"}`}>{type === "ALL" ? "All" : anomalyTitle(type)}</button>)}</div></div>

      <div className="space-y-4">
        {loading ? <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-sm text-slate-500">Loading anomaly history…</div> : filtered.length === 0 ? <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" /><h2 className="mt-3 text-sm font-bold font-mono uppercase text-slate-200">No matching anomalies</h2><p className="mt-1 text-xs text-slate-500">The current review queue has no flagged readings for this filter.</p></div> : filtered.map((item) => {
          const key = `${item.station_id}-${item.timestamp}`;
          const isExpanded = expanded === key;
          const isAcknowledged = acknowledged.has(key);
          const { detection } = item;
          return <div key={key} className={`rounded-xl border bg-slate-900/60 transition ${isAcknowledged ? "border-slate-800 opacity-70" : detection.severity === "HIGH" ? "border-rose-500/20" : "border-slate-800"}`}>
            <div className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-3"><div className={`mt-0.5 rounded-lg border p-2 ${severityClasses(detection.severity)}`}><AlertTriangle className="h-4 w-4" /></div><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-slate-100">{anomalyTitle(detection.type)}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${severityClasses(detection.severity)}`}>{detection.severity}</span>{isAcknowledged && <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-500">ACKNOWLEDGED</span>}</div><div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500"><span>{item.station_id}</span><span>•</span><span>{formatTime(item.timestamp)}</span></div></div></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]"><div><div className="text-[9px] uppercase tracking-widest text-slate-600">Temperature</div><div className="mt-1 font-mono text-xs text-slate-200">{formatValue(item.temperature, "°C")}</div></div><div><div className="text-[9px] uppercase tracking-widest text-slate-600">Humidity</div><div className="mt-1 font-mono text-xs text-slate-200">{formatValue(item.humidity, "%")}</div></div><div><div className="text-[9px] uppercase tracking-widest text-slate-600">Pressure</div><div className="mt-1 font-mono text-xs text-slate-200">{formatValue(item.pressure, "hPa")}</div></div><div><div className="text-[9px] uppercase tracking-widest text-slate-600">Confidence</div><div className="mt-1 font-mono text-xs font-bold text-emerald-400">{(detection.confidence * 100).toFixed(1)}%</div></div></div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500"><Eye className="h-3.5 w-3.5" /> Model explanation</div><p className="mt-2 text-xs leading-relaxed text-slate-300">{detection.reason}</p></div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/70 pt-4"><button onClick={() => setExpanded(isExpanded ? null : key)} className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{isExpanded ? "Hide telemetry evidence" : "Inspect telemetry evidence"}</button><button onClick={() => toggleAcknowledged(key)} className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-300 hover:bg-slate-800"><CheckCircle2 className="h-3.5 w-3.5" /> {isAcknowledged ? "Unacknowledge" : "Acknowledge"}</button></div>

              {isExpanded && <div className="mt-4 space-y-4 border-t border-slate-800 pt-4"><ExpectedObserved item={item} /><EvidenceChart points={item.telemetry_context ?? []} anomalyType={detection.type} /><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Thermometer className="h-3.5 w-3.5" /> Flagged temperature</div><div className="mt-2 font-mono text-lg text-slate-100">{formatValue(item.temperature, "°C")}</div></div><div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Droplets className="h-3.5 w-3.5" /> Flagged humidity</div><div className="mt-2 font-mono text-lg text-slate-100">{formatValue(item.humidity, "%")}</div></div><div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Gauge className="h-3.5 w-3.5" /> Flagged pressure</div><div className="mt-2 font-mono text-lg text-slate-100">{formatValue(item.pressure, "hPa")}</div></div></div><div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500"><Clock className="h-3.5 w-3.5" /> Inference context</div><div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono"><div><span className="text-slate-600">History</span><div className="mt-1 text-slate-300">{item.history_size} readings</div></div><div><span className="text-slate-600">Evidence</span><div className="mt-1 text-slate-300">{item.telemetry_context?.length ?? 0} points</div></div><div><span className="text-slate-600">Decision</span><div className="mt-1 text-rose-300">ANOMALY</div></div><div><span className="text-slate-600">Time</span><div className="mt-1 text-slate-300">{formatTime(item.timestamp)}</div></div></div></div>{detection.class_probabilities && <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Class probabilities</div><div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">{Object.entries(detection.class_probabilities).map(([name, probability]) => <div key={name} className="rounded border border-slate-800 p-2"><div className="truncate text-[9px] text-slate-600">{name}</div><div className="mt-1 font-mono text-xs text-slate-300">{(probability * 100).toFixed(1)}%</div></div>)}</div></div>}</div>}
            </div>
          </div>;
        })}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-[11px] leading-relaxed text-slate-600">Review queue is intentionally in-memory for the prototype. “Acknowledge” is a local UI state and is not yet persisted as an operator decision. Telemetry evidence is captured from the same rolling station history used by the anomaly detector.</div>
    </div>
  );
}
