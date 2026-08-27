import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Smartphone,
  Building2,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

const STEPS = [
  { step: '1', title: 'Create your company', text: 'Register as the owner. It takes a minute and needs no card.' },
  { step: '2', title: 'Add employees', text: 'Create staff logins with a phone number and a temporary password — free, no seat limit.' },
  { step: '3', title: 'Install the Android app', text: 'Employees sign in on one phone (single-device binding) and check in when their shift starts.' },
  { step: '4', title: 'Watch it work', text: 'See the live map, attendance, route history and timesheets from this portal.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0B1120] text-slate-100 font-sans antialiased text-xs">
      <header className="h-14 px-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">P</div>
          <span className="font-bold text-sm tracking-tight text-white">PERZENT</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="px-2.5 sm:px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 transition">
            Sign in
          </Link>
          <Link href="/register" className="px-2.5 sm:px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1 transition">
            <UserPlus className="w-3 h-3" /> Get started free
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center space-y-8 sm:space-y-10 w-full">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-[#86EFAC] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          Field attendance & live location for small teams
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Know who is on duty, and <span className="text-[#16A34A]">where they are</span> — while they are on shift
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
            GPS-stamped check-in and check-out, a live team map, day-by-day route history with dwell stops, and payroll-ready timesheets.
            Location is collected only while an employee is checked in.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <Link
            href="/register"
            className="px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/30"
          >
            <Building2 className="w-3.5 h-3.5" /> Create a free company account <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/login" className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition">
            Open the owner portal
          </Link>
          <Link
            href="/download"
            className="px-3.5 py-2 rounded border border-slate-800 bg-[#0B1120] hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#86EFAC]" /> Employee Android app
          </Link>
        </div>

        {/* Free plan */}
        <div className="max-w-2xl mx-auto p-4 rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/5 text-left space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm text-white">Free launch plan</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#16A34A] text-white">₹0</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Everything below is included while we are in launch. No seat fees, no card, no invoices.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300">
            {[
              'Unlimited employees and managers',
              'Live team map with 3-second refresh',
              'Route history with dwell stops (15 days by default)',
              'Attendance with breaks and auto check-out (45 days by default)',
              'Timesheets with overtime and CSV export',
              'Leave requests, reports, geofenced sites and kiosk mode',
            ].map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#16A34A] shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 bg-[#0B1120] rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-left">
          <div className="p-4 space-y-1.5">
            <MapPin className="w-4 h-4 text-[#16A34A]" />
            <h3 className="font-semibold text-xs text-white">Live team map</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              Animated markers, movement and speed, stale/offline indicators, and battery level for every on-duty employee.
            </p>
          </div>
          <div className="p-4 space-y-1.5">
            <Clock className="w-4 h-4 text-[#86EFAC]" />
            <h3 className="font-semibold text-xs text-white">Route history & dwell stops</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              Replay any day's route and see where an employee stopped and for how long, computed from real GPS points.
            </p>
          </div>
          <div className="p-4 space-y-1.5">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-xs text-white">Attendance & timesheets</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              Gross vs net hours, break deductions, manual corrections with an audit reason, and CSV export for payroll.
            </p>
          </div>
          <div className="p-4 space-y-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-xs text-white">Single-device binding & GPS integrity checks</h3>
            <p className="text-[11px] text-[#6B7280] leading-normal">
              Each employee is bound to one phone. GPS off, revoked permission, mock location and lost connectivity are flagged to you.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="text-left space-y-3">
          <h2 className="font-semibold text-sm text-white text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map((item) => (
              <div key={item.step} className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-1">
                <span className="inline-flex w-6 h-6 rounded-full bg-[#16A34A]/20 text-[#86EFAC] font-bold text-[11px] items-center justify-center">{item.step}</span>
                <h3 className="font-semibold text-xs text-white">{item.title}</h3>
                <p className="text-[11px] text-[#6B7280] leading-normal">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-[#6B7280] max-w-xl mx-auto">
          We collect precise location only while an employee is checked in, plus battery, charging, power-save and GPS state so you can tell a
          flat phone from a missing employee. Read the <Link href="/privacy" className="underline text-slate-300">privacy policy</Link>.
        </p>
      </main>

      <footer className="px-4 sm:px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#6B7280]">
        <span>© 2026 Perzent · operated by JSP Coders</span>
        <nav className="flex flex-wrap items-center gap-3" aria-label="Footer">
          <Link href="/privacy" className="hover:text-white">Privacy policy</Link>
          <Link href="/download" className="hover:text-white">Android app</Link>
          <Link href="/login" className="hover:text-white">Sign in</Link>
          <Link href="/register" className="hover:text-white">Register</Link>
        </nav>
      </footer>
    </div>
  );
}
