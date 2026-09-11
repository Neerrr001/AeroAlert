import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  Layers,
  Radio,
  Server,
  ShieldAlert,
  Bell,
} from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "AeroAlert — Meteorological AWS Quality Control",
  description: "Hybrid AI Anomaly Detection for Automatic Weather Stations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-sans min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
        {/* Top Operational Header */}
        <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-wider text-slate-100 font-mono uppercase">
                  AeroAlert <span className="text-emerald-400 text-xs">v1.0</span>
                </h1>
                <p className="text-[11px] text-slate-400">IMD Network AWS Quality Control</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-slate-300 font-sans">Live Stream Active</span>
            </div>
            <div className="hidden md:flex gap-4 border-l border-slate-800 pl-6 text-slate-400 font-sans">
              <div>Stations: <span className="text-slate-100 font-mono font-bold">707</span></div>
              <div>Flagged Today: <span className="text-amber-400 font-mono font-bold">14</span></div>
              <div>Health Index: <span className="text-emerald-400 font-mono font-bold">96.4%</span></div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Navigation Sidebar */}
          <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between hidden md:flex shrink-0">
            <nav className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3 px-3">
                Control Room Navigation
              </div>
              {[
                { href: "/", label: "Landing Overview", icon: Layers },
                { href: "/overview", label: "Dashboard", icon: BarChart3 },
                { href: "/live", label: "Live Telemetry", icon: Activity },
                { href: "/anomalies", label: "Anomaly Review", icon: ShieldAlert, badge: 3 },
                { href: "/alerts", label: "Alert Feed", icon: Bell },
                { href: "/health", label: "Station Health", icon: Server },
                { href: "/model", label: "Model Metrics", icon: CheckCircle2 },
                { href: "/about", label: "System Architecture", icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2 rounded text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all font-sans group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border border-slate-800 bg-slate-900/80 rounded text-xs text-slate-400">
              <div className="flex items-center gap-2 mb-1 text-slate-200 font-mono">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Backend Ready</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Hooks pre-built for FastAPI backend integration.
              </p>
            </div>
          </aside>

          {/* Dynamic Page Content */}
          <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}