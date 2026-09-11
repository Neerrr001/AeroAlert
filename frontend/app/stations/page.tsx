"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Radio, RefreshCw, Server, Wifi, WifiOff } from "lucide-react";

type Station = { station_id: string; history_size: number };
type Anomaly = { station_id: string; timestamp: string; detection?: { type: string; severity: string; confidence: number } };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [stationResponse, anomalyResponse] = await Promise.all([
        fetch(`${API_BASE}/stations`, { cache: "no-store" }),
        fetch(`${API_BASE}/anomalies`, { cache: "no-store" }),
      ]);
      if (!stationResponse.ok || !anomalyResponse.ok) throw new Error("Backend request failed");
      const stationData = await stationResponse.json();
      const anomalyData = await anomalyResponse.json();
      setStations(stationData.stations ?? []);
      setAnomalies(anomalyData.anomalies ?? []);
      setConnected(true);
      setError(null);
    } catch {
      setConnected(false);
      setError("Waiting for the AeroAlert backend. Start FastAPI and replay telemetry to populate stations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, []);

  const stationStats = useMemo(() => {
    return stations.map((station) => {
      const stationAnomalies = anomalies.filter((item) => item.station_id === station.station_id);
      const latest = stationAnomalies[0];
      return { ...station, anomalyCount: stationAnomalies.length, latest };
    });
  }, [stations, anomalies]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-400">
            <Server className="h-3.5 w-3.5" /> Scalability view
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-100 font-mono uppercase">Station Network</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            Independent station histories and anomaly state exposed by the same ingestion and detection pipeline.
          </p>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-mono ${connected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-700 bg-slate-900 text-slate-500"}`}>
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {connected ? "API CONNECTED" : "API OFFLINE"}
        </div>
      </div>

      {error && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Registered in memory</div>
          <div className="mt-3 text-3xl font-bold font-mono text-slate-100">{stations.length}</div>
          <div className="mt-1 text-xs text-slate-500">Stations that have sent telemetry</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Active histories</div>
          <div className="mt-3 text-3xl font-bold font-mono text-slate-100">{stations.filter((s) => s.history_size > 0).length}</div>
          <div className="mt-1 text-xs text-slate-500">Up to 48 recent readings per station</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Flagged anomalies</div>
          <div className="mt-3 text-3xl font-bold font-mono text-amber-400">{anomalies.length}</div>
          <div className="mt-1 text-xs text-slate-500">Across the current prototype session</div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Station Registry</h2>
            <p className="mt-1 text-[11px] text-slate-500">Each station is isolated by station_id at ingestion time.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded border border-slate-700 px-3 py-2 text-[11px] font-mono text-slate-300 hover:bg-slate-800">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stationStats.map((station) => (
            <div key={station.station_id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2"><Radio className="h-4 w-4 text-emerald-400" /></div>
                  <div>
                    <div className="font-mono text-sm font-bold text-slate-100">{station.station_id}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{station.history_size} recent readings retained</div>
                  </div>
                </div>
                {station.anomalyCount > 0 ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded border border-slate-800 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">Anomalies</div><div className="mt-1 font-mono text-sm text-slate-200">{station.anomalyCount}</div></div>
                <div className="rounded border border-slate-800 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">Latest type</div><div className="mt-1 font-mono text-sm text-slate-200">{station.latest?.detection?.type ?? "NORMAL / NONE"}</div></div>
              </div>
            </div>
          ))}
          {!loading && stations.length === 0 && <div className="lg:col-span-2 py-14 text-center text-sm text-slate-500"><Activity className="mx-auto mb-3 h-5 w-5" />No stations have sent telemetry yet.</div>}
        </div>
      </section>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-[11px] leading-relaxed text-slate-500">
        <span className="font-mono text-slate-300">Prototype scope:</span> multi-station support demonstrates the ingestion architecture and independent station state. It does not claim a live connection to the nationwide IMD network. Station state is currently in-memory and resets when the backend restarts.
      </div>
    </div>
  );
}
