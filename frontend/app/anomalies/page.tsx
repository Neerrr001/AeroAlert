import { AlertTriangle, CheckCircle, XCircle, Eye, ShieldAlert } from "lucide-react";

export default function AnomalyReviewPage() {
  const anomalies = [
    { id: "ANM-2026-881", station: "AWS-MUM-12 (Colaba)", param: "Temperature Spike", value: "48.2 °C", baseline: "30.1 °C", confidence: "98.4%", algorithm: "Isolation Forest", time: "10 mins ago" },
    { id: "ANM-2026-880", station: "AWS-CCU-03 (Alipore)", param: "Pressure Flatline", value: "1006.9 hPa (Stuck)", baseline: "Dynamic Variance", confidence: "94.1%", algorithm: "Sensor Drift Model", time: "28 mins ago" },
    { id: "ANM-2026-879", station: "AWS-DEL-04 (Palam)", param: "Humidity Drop", value: "12%", baseline: "65%", confidence: "89.2%", algorithm: "Z-Score Outlier", time: "1 hour ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono uppercase">Anomaly Detection & Quality Control</h1>
          <p className="text-xs text-slate-400">Human-in-the-loop review for ML-detected meteorological sensor telemetry flags</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
            3 Pending Validation
          </span>
        </div>
      </div>

      {/* Anomaly Review Cards */}
      <div className="space-y-4">
        {anomalies.map((item) => (
          <div key={item.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-sm font-bold text-slate-100">{item.id}</span>
                <span className="text-xs text-slate-400 font-mono">({item.station})</span>
              </div>
              <div className="text-xs font-mono text-slate-500">Detected: {item.time}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <div className="text-slate-500 uppercase">Anomaly Type</div>
                <div className="text-amber-400 font-bold mt-1">{item.param}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase">Reported Value</div>
                <div className="text-slate-100 font-bold mt-1">{item.value}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase">Expected Range</div>
                <div className="text-slate-400 mt-1">{item.baseline}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase">ML Model Confidence</div>
                <div className="text-emerald-400 font-bold mt-1">{item.confidence} ({item.algorithm})</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded border border-slate-700 transition-all">
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Graph</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono rounded border border-rose-500/30 transition-all">
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Signal (Sensor Fault)</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-mono rounded border border-emerald-500/30 transition-all">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve as Valid Weather Event</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}