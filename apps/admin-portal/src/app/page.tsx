import Link from 'next/link';
import { ArrowRight, ShieldCheck, MapPin, Clock, Users, Smartphone, Receipt } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0B1120] text-slate-100 font-sans antialiased text-xs">
      {/* Minimal Header */}
      <header className="h-14 px-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Primary Logo: White on Green (#16A34A) */}
          <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">
            P
          </div>
          <span className="font-bold text-sm tracking-tight text-white">PERZENT</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 transition"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-5xl mx-auto px-6 py-14 text-center space-y-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-[#86EFAC] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
          Enterprise Fleet Location & Hardware Telemetry Engine
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Minimalist workforce tracking with <span className="text-[#16A34A]">live device telemetry</span>
          </h1>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            GPS-stamped attendance • Tenant-isolated workforce records • Route history foundation • Cashfree PG per-seat billing (₹99 + 18% GST).
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            Enter Operations Portal <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/download"
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#86EFAC]" /> Download Phone APK
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded border border-slate-800 bg-[#0B1120] text-slate-300 hover:text-white text-xs font-medium transition"
          >
            Demo Credentials
          </Link>
        </div>

        {/* 4-Column Feature Grid Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 bg-[#0B1120] rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-left pt-2">
          <div className="p-4 space-y-1.5">
            <Smartphone className="w-4 h-4 text-[#16A34A]" />
            <h3 className="font-semibold text-xs text-white">Hardware Telemetry</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              Real-time Sound %, Brightness, Free Storage GB, RAM usage, and Live Battery status.
            </p>
          </div>

          <div className="p-4 space-y-1.5">
            <MapPin className="w-4 h-4 text-[#86EFAC]" />
            <h3 className="font-semibold text-xs text-white">15-Day Route History</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              Playback for recorded waypoints and verified dwell stops once route capture is enabled.
            </p>
          </div>

          <div className="p-4 space-y-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-xs text-white">45-Day Attendance</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              Gross vs net hours, recorded breaks, and configurable attendance policies.
            </p>
          </div>

          <div className="p-4 space-y-1.5">
            <Receipt className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-xs text-white">Cashfree Billing</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              ₹99 + 18% GST (₹116.82) transparent provisioning with instant tax invoices.
            </p>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="h-12 px-6 border-t border-slate-800 flex items-center justify-between text-[11px] text-[#6B7280]">
        <span>© 2026 Perzent Technologies Pvt Ltd</span>
        <span>Version 1.0.0 • Production Ready</span>
      </footer>
    </div>
  );
}
