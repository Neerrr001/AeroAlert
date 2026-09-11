import { Server, Activity, Wrench, CheckCircle2, AlertOctagon } from "lucide-react";

export default function StationHealthPage() {
  const healthStats = [
    { name: "Fully Operational", count: 681, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
    { name: "Calibration Required", count: 18, color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
    { name: "Hardware Fault", count: 8, color: "text-rose-400 border-rose-500/20 bg-rose-500/10" },
  ];

  const stations = [
    { id: "AWS-DEL-01", name: "New Delhi (Safdarjung)", status: "Optimal", uptime: "99.8%", lastMaint: "12 days ago", sensors: "All 6 Active" },
    { id: "AWS-MUM-12", name: "Mumbai (Colaba)", status: "Degraded", uptime: "94.2%", lastMaint: "45 days ago", sensors: "5/6 Active (Temp Fault)" },
    { id: "AWS-CCU-03", name: "Kolkata (Alipore)", status: "Needs Servicing", uptime: "88.1%", lastMaint: "80 days ago", sensors: "4/6 Active (Barometer Stuck)" },
    { id: "AWS-BLR-08", name: "Bengaluru (HAL)", status: "Optimal", uptime: "99.9%", lastMaint: "5 days ago", sensors: "All 6 Active" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono uppercase">AWS Hardware Station Health</h1>
          <p className="text-xs text-slate-400">Diagnostic telemetry, sensor uptime, and maintenance schedules for 707 deployed units</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        {healthStats.map((stat, i) => (
          <div key={i} className={`p-4 rounded-lg border ${stat.color} flex items-center justify-between`}>
            <div>
              <div className="text-slate-400 uppercase text-[10px]">{stat.name}</div>
              <div className="text-2xl font-bold mt-1">{stat.count}</div>
            </div>
            <Server className="w-6 h-6 opacity-80" />
          </div>
        ))}
      </div>

      {/* Health Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400 uppercase">
                <th className="p-3">Station Code</th>
                <th className="p-3">Location</th>
                <th className="p-3">Operational State</th>
                <th className="p-3">Sensor Diagnostics</th>
                <th className="p-3">30-Day Uptime</th>
                <th className="p-3 text-right">Last Calibration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {stations.map((st) => (
                <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 text-slate-100 font-bold">{st.id}</td>
                  <td className="p-3 text-slate-300 font-sans">{st.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      st.status === "Optimal" ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    }`}>
                      {st.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{st.sensors}</td>
                  <td className="p-3 text-emerald-400">{st.uptime}</td>
                  <td className="p-3 text-right text-slate-500">{st.lastMaint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}