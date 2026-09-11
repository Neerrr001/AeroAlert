import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Radio,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 py-4">
      {/* Hero Section */}
      <section className="space-y-6 text-center md:text-left border-b border-slate-800 pb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-mono">
          <Zap className="w-3.5 h-3.5" />
          <span>IMD Automated AWS Monitoring Engine</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-100 font-sans">
          Automated Quality Control & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Real-Time Anomaly Detection
          </span>
        </h1>
        <p className="text-slate-400 text-base max-w-3xl leading-relaxed">
          AeroAlert is an enterprise-grade meteorological control dashboard designed for India Meteorological Department (IMD) AWS networks. Utilizing a hybrid machine learning engine, it flags sensor drift, stuck values, and calibration errors instantly.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/overview"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <span>Launch Control Room</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/anomalies"
            className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 px-5 py-2.5 rounded text-sm transition-all"
          >
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <span>Review Active Anomalies (3)</span>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 border border-slate-800 bg-slate-900/40 rounded-lg space-y-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded w-fit text-emerald-400">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="text-slate-200 font-semibold text-base font-sans">Live Telemetry Analysis</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Ingests real-time observations from 700+ Automatic Weather Stations every minute with automated bounds checking.
          </p>
        </div>

        <div className="p-5 border border-slate-800 bg-slate-900/40 rounded-lg space-y-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded w-fit text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-slate-200 font-semibold text-base font-sans">Hybrid AI Detection</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Combines physical rule-based validation with Isolation Forest algorithms to catch subtle sensor degradation.
          </p>
        </div>

        <div className="p-5 border border-slate-800 bg-slate-900/40 rounded-lg space-y-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded w-fit text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-slate-200 font-semibold text-base font-sans">Human-in-the-Loop QC</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Meteorologists can approve, reject, or re-calibrate flagged anomalies directly from the interactive queue.
          </p>
        </div>
      </section>

      {/* Backend Integration Banner */}
      <section className="p-6 border border-slate-800 bg-slate-900/70 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>FastAPI & ML Integration Status</span>
          </div>
          <h4 className="text-slate-100 font-bold text-lg">Ready for Backend Data Ingestion</h4>
          <p className="text-slate-400 text-xs">
            Endpoints structured for `/api/telemetry`, `/api/anomalies`, and `/api/health`.
          </p>
        </div>
        <Link
          href="/about"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 whitespace-nowrap transition-all"
        >
          View System Architecture &rarr;
        </Link>
      </section>
    </div>
  );
}
