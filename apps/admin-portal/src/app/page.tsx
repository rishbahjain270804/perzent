import Link from 'next/link';
import { ArrowRight, ShieldCheck, MapPin, Clock, Users, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {/* Primary Logo: White on Green (#16A34A) */}
          <div className="w-10 h-10 rounded-xl bg-[#16A34A] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-green-600/30">
            P
          </div>
          {/* Secondary Logo: Black/Dark on White */}
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-xl text-[#111827] shadow-sm">
            P
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">PERZENT</h1>
            <p className="text-xs text-[#6B7280]">Workforce Intelligence & Precision Tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm font-medium text-slate-200 transition"
          >
            Manager & Owner Login
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold transition shadow-md shadow-green-600/25"
          >
            Register Business
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#86EFAC] text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> Multi-App Unified Ecosystem • Hardware Telemetry Engine
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-6">
          Enterprise Employee Tracking with <span className="text-[#16A34A]">Live Device Telemetry</span> & Sub-Meter GPS
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
          Manage field reps with intelligent 2-minute stationary dwell filtering, live Sound, Brightness, Storage, RAM & Battery status tracking, 30-minute auto lunch breaks, and hardware anti-tamper security.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold flex items-center gap-2 transition shadow-lg shadow-green-600/30 text-base"
          >
            Launch Web Portal Dashboard <ArrowRight className="w-5 h-5 text-white" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-semibold transition text-base text-slate-200"
          >
            View Demo Credentials
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-[#16A34A]/50 transition">
            <Smartphone className="w-8 h-8 text-[#16A34A] mb-4" />
            <h3 className="font-bold text-lg text-white mb-2">Live Hardware Telemetry</h3>
            <p className="text-sm text-[#6B7280]">
              Track real-time device sound volume/mode, brightness, free storage GB, RAM memory pressure, and live battery status.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-[#16A34A]/50 transition">
            <MapPin className="w-8 h-8 text-[#86EFAC] mb-4" />
            <h3 className="font-bold text-lg text-white mb-2">15-Day Route Playback</h3>
            <p className="text-sm text-[#6B7280]">
              Scrub minute-by-minute timeline with distinct stop dwell duration pins and road-snapped paths.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-[#16A34A]/50 transition">
            <Clock className="w-8 h-8 text-amber-400 mb-4" />
            <h3 className="font-bold text-lg text-white mb-2">45-Day Attendance & Breaks</h3>
            <p className="text-sm text-[#6B7280]">
              Track gross vs net work hours with 30-min lunch breaks, manual overrides, and 11:40 PM auto-cutoffs.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-[#16A34A]/50 transition">
            <Users className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="font-bold text-lg text-white mb-2">Anti-Tamper Device Lock</h3>
            <p className="text-sm text-[#6B7280]">
              Hardware UUID binding blocks proxy punching; pre-check enforces active GPS and sound mode integrity.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-8 py-6 border-t border-slate-800/80 text-center text-xs text-[#6B7280]">
        © 2026 Perzent Technologies. All rights reserved.
      </footer>
    </div>
  );
}
