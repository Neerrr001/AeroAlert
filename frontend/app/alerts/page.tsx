import { Bell, AlertCircle, ShieldAlert, CheckCheck, Clock } from "lucide-react";

export default function AlertFeedPage() {
  const alerts = [
    { id: "ALT-902", priority: "CRITICAL", station: "AWS-MUM-12 (Colaba)", title: "Extreme Temperature Spike", message: "Recorded temperature exceeded maximum threshold by 18.1°C within a 1-minute window.", time: "12 mins ago", border: "border-rose-500/40 bg-rose-500/10 text-rose-400" },
    { id: "ALT-901", priority: "WARNING", station: "AWS-CCU-03 (Alipore)", title: "Pressure Telemetry Loss", message: "No data variation received over the past 45 minutes. Possible sensor freeze.", time: "32 mins ago", border: "border-amber-500/40 bg-amber-500/10 text-amber-400" },
    { id: "ALT-899", priority: "INFO", station: "AWS-DEL-01 (Safdarjung)", title: "Routine Calibration Complete", message: "Automated drift correction completed successfully. Telemetry re-baselined.", time: "2 hours ago", border: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono uppercase">System Alert Feed</h1>
          <p className="text-xs text-slate-400">Automated notifications for critical AWS events, sensor anomalies, and system drift</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded border border-slate-700 transition-all">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Bell className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold border ${alert.border}`}>
                    {alert.priority}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-bold">{alert.station}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 font-sans">{alert.title}</h3>
                <p className="text-xs text-slate-400">{alert.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 whitespace-nowrap self-end sm:self-start">
              <Clock className="w-3.5 h-3.5" />
              <span>{alert.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}