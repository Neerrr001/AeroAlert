import { Cpu, Target, BarChart3, Zap, ShieldCheck } from "lucide-react";

export default function ModelMetricsPage() {
  const metrics = [
    { title: "Model Accuracy", value: "98.4%", desc: "Isolation Forest & Autoencoder ensemble", color: "text-emerald-400" },
    { title: "Precision Rate", value: "96.8%", desc: "Low false-positive flag count", color: "text-emerald-400" },
    { title: "Recall Rate", value: "99.1%", desc: "High sensitivity to sensor failures", color: "text-emerald-400" },
    { title: "Inference Speed", value: "14ms", desc: "Average time per station packet", color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono uppercase">ML Model Performance & Diagnostics</h1>
          <p className="text-xs text-slate-400">Statistical evaluation and runtime telemetry of deployed anomaly detection algorithms</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {metrics.map((m, i) => (
          <div key={i} className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
            <div className="text-slate-500 uppercase text-[10px]">{m.title}</div>
            <div className={`text-3xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[11px] text-slate-400 font-sans">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Algorithm Breakdown */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase">Deployed Algorithm Stack</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-slate-800/40 rounded border border-slate-800 space-y-1">
            <div className="text-emerald-400 font-bold">1. Isolation Forest (Unsupervised)</div>
            <p className="text-slate-400 font-sans text-xs">Isolates multi-parameter anomalies (e.g., sudden pressure drop paired with static temperature).</p>
          </div>
          <div className="p-3 bg-slate-800/40 rounded border border-slate-800 space-y-1">
            <div className="text-emerald-400 font-bold">2. Z-Score & Rolling Variance</div>
            <p className="text-slate-400 font-sans text-xs">Detects out-of-bound spikes and frozen sensor drift across short time windows.</p>
          </div>
        </div>
      </div>
    </div>
  );
}