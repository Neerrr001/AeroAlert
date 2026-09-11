import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono uppercase">
            Operational Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Real-time status monitor across IMD Automatic Weather Station network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            System Normal
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span>Total Active AWS</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">707</div>
          <p className="text-[11px] text-emerald-400 font-mono">99.1% Operational</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span>Anomalies Flagged (24h)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">14</div>
          <p className="text-[11px] text-slate-400 font-mono">3 Pending QC Review</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span>Network Health Index</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">96.4%</div>
          <p className="text-[11px] text-emerald-400 font-mono">+0.8% from yesterday</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span>ML Inference Latency</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">42ms</div>
          <p className="text-[11px] text-slate-400 font-mono">FastAPI Engine</p>
        </div>
      </div>

      {/* Regional Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold font-mono uppercase text-slate-200">
              Regional Telemetry Ingestion
            </h2>
            <span className="text-xs text-slate-500 font-mono">Updated 1m ago</span>
          </div>
          <div className="space-y-3 text-xs font-mono">
            {[
              { region: "North Zone (Delhi NCR, HP, UK)", stations: 184, status: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/20" },
              { region: "West Zone (Maharashtra, Gujarat)", stations: 210, status: "2 Flagged", color: "text-amber-400", bg: "bg-amber-500/20" },
              { region: "South Zone (TN, Kerala, KA)", stations: 165, status: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/20" },
              { region: "East & NE Zone (Assam, WB)", stations: 148, status: "1 Flagged", color: "text-amber-400", bg: "bg-amber-500/20" },
            ].map((reg, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800/80 rounded">
                <div>
                  <div className="text-slate-200 font-sans font-medium">{reg.region}</div>
                  <div className="text-[11px] text-slate-500">{reg.stations} Stations reporting</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] border ${reg.color} ${reg.bg} border-current/20`}>
                  {reg.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold font-mono uppercase text-slate-200">
              System Audit Stream
            </h2>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-3 text-[11px] font-mono text-slate-400">
            <div className="border-l-2 border-emerald-500 pl-3 py-0.5">
              <span className="text-slate-500">[23:41:02]</span> AWS-DEL-04 telemetry synchronized.
            </div>
            <div className="border-l-2 border-amber-500 pl-3 py-0.5">
              <span className="text-slate-500">[23:38:15]</span> Spike detected in AWS-MUM-12 (Temp +8°C delta).
            </div>
            <div className="border-l-2 border-emerald-500 pl-3 py-0.5">
              <span className="text-slate-500">[23:30:00]</span> Hourly ML Isolation Forest batch complete.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}