import { Radio, RefreshCw, Filter, ArrowDownUp } from "lucide-react";

export default function LiveTelemetryPage() {
  const sampleData = [
    { id: "AWS-DEL-01", location: "New Delhi (Safdarjung)", temp: "32.4°C", humidity: "68%", pressure: "1008.2 hPa", status: "Nominal", time: "12s ago", statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { id: "AWS-MUM-12", location: "Mumbai (Colaba)", temp: "29.1°C", humidity: "88%", pressure: "1011.5 hPa", status: "Flagged (Spike)", statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/20", time: "3s ago" },
    { id: "AWS-BLR-08", location: "Bengaluru (HAL)", temp: "24.8°C", humidity: "54%", pressure: "914.1 hPa", status: "Nominal", time: "25s ago", statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { id: "AWS-CCU-03", location: "Kolkata (Alipore)", temp: "31.0°C", humidity: "82%", pressure: "1006.9 hPa", status: "Stuck Sensor", statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/20", time: "41s ago" },
    { id: "AWS-HYD-05", location: "Hyderabad (Begumpet)", temp: "30.2°C", humidity: "60%", pressure: "952.4 hPa", status: "Nominal", time: "18s ago", statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono uppercase">Live Telemetry Ingestion</h1>
          <p className="text-xs text-slate-400">Streaming real-time weather parameters from connected station hardware</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition-all">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Auto-Refresh (10s)</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>Showing 5 of 707 AWS feeds</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <ArrowDownUp className="w-4 h-4" />
          <span>Sorted by: Latest Signal</span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400 uppercase">
                <th className="p-3">Station ID</th>
                <th className="p-3">Location Name</th>
                <th className="p-3">Temp (°C)</th>
                <th className="p-3">Humidity (%)</th>
                <th className="p-3">Pressure (hPa)</th>
                <th className="p-3">Status Flag</th>
                <th className="p-3 text-right">Last Ping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {sampleData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 text-emerald-400 font-bold">{row.id}</td>
                  <td className="p-3 text-slate-200 font-sans">{row.location}</td>
                  <td className="p-3 text-slate-100">{row.temp}</td>
                  <td className="p-3 text-slate-100">{row.humidity}</td>
                  <td className="p-3 text-slate-100">{row.pressure}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-500">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}