import { BarChart3, CheckCircle2, Cpu, Gauge, ShieldCheck, Target, Zap } from "lucide-react";

const classMetrics = [
  { name: "DRIFT", precision: 0.85, recall: 0.60, f1: 0.70, support: 499 },
  { name: "FROZEN_SENSOR", precision: 0.75, recall: 0.83, f1: 0.79, support: 510 },
  { name: "NORMAL", precision: 0.97, recall: 0.98, f1: 0.97, support: 9677 },
  { name: "SPIKE", precision: 0.91, recall: 0.82, f1: 0.86, support: 60 },
  { name: "STEP_CHANGE", precision: 0.89, recall: 0.94, f1: 0.91, support: 508 },
];

const confusionMatrix = [
  [297, 0, 184, 0, 18],
  [1, 422, 87, 0, 0],
  [48, 137, 9455, 3, 34],
  [0, 0, 1, 49, 10],
  [3, 0, 25, 2, 478],
];
const labels = ["DRIFT", "FROZEN", "NORMAL", "SPIKE", "STEP"];

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

function MetricCard({ title, value, description, icon: Icon, emphasis = "normal" }: {
  title: string;
  value: string;
  description: string;
  icon: typeof Target;
  emphasis?: "normal" | "good";
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-[10px] font-mono uppercase tracking-widest">{title}</span>
        <Icon className={`h-4 w-4 ${emphasis === "good" ? "text-emerald-400" : "text-slate-500"}`} />
      </div>
      <div className={`mt-3 font-mono text-3xl font-bold ${emphasis === "good" ? "text-emerald-400" : "text-slate-100"}`}>{value}</div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function ModelMetricsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Evaluated model
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-100 font-mono uppercase">Model Metrics & Diagnostics</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            Random Forest evaluation on a controlled benchmark using historical weather data with synthetic sensor-fault injection.
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-mono text-emerald-400">BENCHMARK VERIFIED</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Accuracy" value="95%" description="Overall test-set accuracy" icon={Target} emphasis="good" />
        <MetricCard title="Macro F1" value="0.85" description="Balanced performance across fault classes" icon={BarChart3} emphasis="good" />
        <MetricCard title="Normal F1" value="0.97" description="Healthy-reading classification" icon={CheckCircle2} emphasis="good" />
        <MetricCard title="Test Events" value="360" description="Held-out injected events" icon={Gauge} />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Current Detection Model</h2>
            <p className="mt-1 text-[11px] text-slate-500">The model currently served by the FastAPI anomaly engine</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Algorithm</div>
            <div className="mt-2 font-mono text-sm text-slate-100">Random Forest Classifier</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Estimators</div>
            <div className="mt-2 font-mono text-sm text-slate-100">300 trees</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Input signals</div>
            <div className="mt-2 font-mono text-sm text-slate-100">T / P / RH + temporal features</div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            <span className="text-slate-300">Feature groups</span>
            <span className="rounded-full border border-slate-700 px-2 py-1">1h / 3h / 6h change</span>
            <span className="rounded-full border border-slate-700 px-2 py-1">rolling statistics</span>
            <span className="rounded-full border border-slate-700 px-2 py-1">24h baseline</span>
            <span className="rounded-full border border-slate-700 px-2 py-1">persistence</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Per-Class Performance</h2>
            <p className="mt-1 text-[11px] text-slate-500">Precision, recall and F1 on the held-out benchmark</p>
          </div>
          <Zap className="h-4 w-4 text-slate-500" />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th className="px-3 py-3">Class</th><th className="px-3 py-3">Precision</th><th className="px-3 py-3">Recall</th><th className="px-3 py-3">F1</th><th className="px-3 py-3">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
              {classMetrics.map((metric) => (
                <tr key={metric.name} className="hover:bg-slate-800/20">
                  <td className="px-3 py-3 text-slate-200">{metric.name}</td>
                  <td className="px-3 py-3 text-slate-300">{pct(metric.precision)}</td>
                  <td className="px-3 py-3 text-slate-300">{pct(metric.recall)}</td>
                  <td className="px-3 py-3 font-bold text-emerald-400">{pct(metric.f1)}</td>
                  <td className="px-3 py-3 text-slate-500">{metric.support.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-100 font-mono uppercase">Confusion Matrix</h2>
          <p className="mt-1 text-[11px] text-slate-500">Rows = actual class · columns = predicted class</p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-6 gap-1 text-[10px] font-mono">
              <div className="p-2" />
              {labels.map((label) => <div key={label} className="p-2 text-center text-slate-500">{label}</div>)}
              {confusionMatrix.map((row, r) => (
                <div key={labels[r]} className="contents">
                  <div className="p-3 text-right text-slate-500">{labels[r]}</div>
                  {row.map((value, c) => {
                    const diagonal = r === c;
                    const intensity = Math.min(100, value === 0 ? 0 : 25 + Math.round((value / 9455) * 75));
                    return (
                      <div key={`${r}-${c}`} className={`rounded border p-3 text-center ${diagonal ? "border-emerald-500/20 text-emerald-300" : "border-slate-800 text-slate-300"}`} style={{ backgroundColor: `rgba(16,185,129,${intensity / 1000})` }}>
                        {value.toLocaleString()}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Weakest class</div>
          <div className="mt-2 font-mono text-lg font-bold text-slate-100">DRIFT · 0.60 recall</div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">The current model is deliberately conservative on gradual drift, so some drift events remain unflagged.</p>
        </div>
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Important benchmark note</div>
          <div className="mt-2 font-mono text-lg font-bold text-slate-100">Controlled, not real-world accuracy</div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">These metrics come from historical weather data with synthetic fault injection. They should not be presented as measured nationwide AWS performance.</p>
        </div>
      </div>
    </div>
  );
}
