import { Network, Database, Layers, ShieldCheck, Cpu, ArrowRight } from "lucide-react";

export default function SystemArchitecturePage() {
  const steps = [
    { title: "1. Edge Ingestion", desc: "Raw sensor packets sent via MQTT/HTTP from 707 IMD AWS locations." },
    { title: "2. Fast Validation", desc: "Z-Score & statistical threshold filters catch extreme spikes instantly." },
    { title: "3. ML Pipeline", desc: "Isolation Forest models analyze multi-parameter weather context." },
    { title: "4. HITL Review", desc: "Flagged anomalies routed to human operators for final validation." },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono uppercase">AeroAlert Architecture & Data Flow</h1>
          <p className="text-xs text-slate-400">End-to-end data pipeline overview from weather station telemetry to FastAPI backend</p>
        </div>
      </div>

      {/* System Flow Diagram */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-lg space-y-6 font-mono">
        <h2 className="text-sm font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">Telemetry Processing Pipeline</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="p-4 bg-slate-800/40 border border-slate-800 rounded relative">
              <div className="text-emerald-400 font-bold text-xs uppercase">{s.title}</div>
              <p className="text-slate-400 text-xs font-sans mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Layers className="w-4 h-4" />
            <span>Frontend Tier</span>
          </div>
          <p className="text-slate-300 font-sans">Next.js 14 App Router, Tailwind CSS, Lucide React icons, dark control-room theme.</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Database className="w-4 h-4" />
            <span>Backend & ML Integration</span>
          </div>
          <p className="text-slate-300 font-sans">FastAPI service endpoints, Isolation Forest ML classifiers, PostgreSQL telemetry store.</p>
        </div>
      </div>
    </div>
  );
}