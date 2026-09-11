import {
  Activity,
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  Database,
  Gauge,
  Layers,
  Radio,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
} from "lucide-react";

const pipeline = [
  {
    step: "01",
    title: "Telemetry Input",
    icon: Radio,
    tag: "T / P / RH",
    desc: "Weather-station observations enter the prototype as timestamped temperature, atmospheric pressure and relative-humidity readings.",
  },
  {
    step: "02",
    title: "Rolling History",
    icon: Database,
    tag: "48 readings",
    desc: "A per-station in-memory rolling window provides the temporal context required for short- and long-term features.",
  },
  {
    step: "03",
    title: "Feature Engineering",
    icon: SlidersHorizontal,
    tag: "Temporal features",
    desc: "Changes, rolling statistics, persistence, environmental change and 12–24 hour baseline features are calculated from the history.",
  },
  {
    step: "04",
    title: "Hybrid Detection",
    icon: BrainCircuit,
    tag: "Rules + RF",
    desc: "Fast deterministic checks handle missing data and obvious faults; a Random Forest classifies the remaining observation using temporal context.",
  },
  {
    step: "05",
    title: "Decision Layer",
    icon: ShieldCheck,
    tag: "Explainable output",
    desc: "The service returns anomaly status, fault type, severity, model confidence and a human-readable reason for the decision.",
  },
  {
    step: "06",
    title: "Live Dashboard",
    icon: Activity,
    tag: "WebSocket",
    desc: "FastAPI broadcasts the latest telemetry and decision to the Next.js control-room dashboard in real time.",
  },
];

export default function SystemArchitecturePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-400">
            <Layers className="h-3.5 w-3.5" /> System design
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-100 font-mono uppercase">AeroAlert Architecture & Data Flow</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            From AWS telemetry ingestion to real-time anomaly decisions and operator visualization.
          </p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400">Prototype architecture</span>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">End-to-End Processing Pipeline</h2>
            <p className="mt-1 text-[11px] text-slate-500">Every live reading follows the same inference path</p>
          </div>
          <Gauge className="h-4 w-4 text-emerald-400" />
        </div>

        <div className="mt-6 space-y-3">
          {pipeline.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.step}>
                <div className="grid grid-cols-[auto_1fr] gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[70px_42px_1fr_auto] md:items-center">
                  <div className="font-mono text-xs text-slate-600 md:text-center">{item.step}</div>
                  <div className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 md:flex">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-emerald-400 md:hidden" />
                      <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">{item.title}</h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                  </div>
                  <span className="mt-3 w-fit rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-mono text-slate-500 md:mt-0">{item.tag}</span>
                </div>
                {index < pipeline.length - 1 && <div className="hidden justify-center py-1 md:flex"><ArrowDown className="h-4 w-4 text-slate-700" /></div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 text-emerald-400"><Radio className="h-4 w-4" /><span className="text-xs font-bold font-mono uppercase">Input</span></div>
          <div className="mt-4 space-y-2 text-xs font-mono text-slate-300"><div>Temperature · °C</div><div>Atmospheric pressure · hPa</div><div>Relative humidity · %</div><div className="pt-2 text-slate-500">+ timestamp + station ID</div></div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 text-amber-400"><Server className="h-4 w-4" /><span className="text-xs font-bold font-mono uppercase">Backend</span></div>
          <div className="mt-4 space-y-2 text-xs font-mono text-slate-300"><div>FastAPI</div><div>StationHistory</div><div>Feature engineering</div><div>Rules + Random Forest</div></div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 text-cyan-400"><Wifi className="h-4 w-4" /><span className="text-xs font-bold font-mono uppercase">Output</span></div>
          <div className="mt-4 space-y-2 text-xs font-mono text-slate-300"><div>Anomaly / normal</div><div>Fault classification</div><div>Severity + confidence</div><div>Human-readable reason</div></div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Technology Stack</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Frontend", "Next.js + Tailwind CSS"],
            ["API", "FastAPI + Pydantic"],
            ["ML", "scikit-learn Random Forest"],
            ["Live transport", "REST + WebSocket"],
          ].map(([title, value]) => (
            <div key={title} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500">{title}</div><div className="mt-2 text-xs font-mono text-slate-200">{value}</div></div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Prototype boundary</div>
        <p className="mt-2 max-w-4xl text-xs leading-relaxed text-slate-400">
          The current demonstration replays simulated AWS telemetry through a local FastAPI service. The architecture is designed so a future live AWS/IMD ingestion adapter can replace the simulator without changing the detection or dashboard layers. No nationwide live deployment, PostgreSQL telemetry store, or operator notification service is claimed by this prototype.
        </p>
      </section>
    </div>
  );
}
