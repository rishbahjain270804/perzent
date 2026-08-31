import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import {
  MapPin,
  Clock,
  FileSpreadsheet,
  ShieldCheck,
  Server,
  Database,
  ArrowRight,
  CheckCircle2,
  Activity,
  Battery,
  Lock,
  Navigation,
  AlertOctagon,
  PhoneCall
} from 'lucide-react';

export const metadata = {
  title: 'Features · Perzent Field Force Platform',
  description: 'Explore the complete operational feature set of Perzent: Live GPS team map, emergency SOS dispatch, route history with dwell stops, automated timesheets, and hardware anti-tamper security.',
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-900 font-sans antialiased">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-20 w-full">
        {/* Page Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Platform Features</span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
            Engineered for Complete Field Operations Visibility
          </h1>
          <p className="text-base text-slate-600 leading-relaxed font-normal">
            From 3-second live GPS streaming and emergency SOS alerts to automated payroll timesheets and single-device hardware binding, inspect every core module of the Perzent engine.
          </p>
        </section>

        {/* Feature 1: Live Team Map */}
        <section className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase">Module 01</span>
              <h2 className="text-2xl font-bold text-slate-900">Live Team Map & Telemetry Stream</h2>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Track checked-in mobile staff on an interactive Leaflet map. Updates stream every 3 seconds with exact coordinates, movement speed, accuracy radius, battery percentage, power-save state, and signal freshness.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">3s Fused Stream</div>
              <p className="text-slate-500 text-[11px]">High-precision GPS provider updates with 10m movement thinning.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Battery Telemetry</div>
              <p className="text-slate-500 text-[11px]">Distinguish a dead battery from a missing employee or lost signal.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Stale Signal Flags</div>
              <p className="text-slate-500 text-[11px]">Automatic visual alerts if an employee’s phone drops network connection.</p>
            </div>
          </div>
        </section>

        {/* Feature 2: Emergency SOS Alert Dispatch */}
        <section className="p-8 rounded-2xl bg-red-50/50 border border-red-200 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-red-700 uppercase">Module 02 · Worker Safety</span>
              <h2 className="text-2xl font-bold text-slate-900">Emergency SOS Dispatch & Safety Alerts</h2>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            When field employees encounter danger, accidents, or threats on duty, tapping the prominent mobile app SOS button instantly broadcasts an emergency alert to managers with exact live GPS coordinates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
            <div className="p-4 bg-white rounded-xl border border-red-100 space-y-1">
              <div className="font-bold text-slate-900">Instant One-Tap Dispatch</div>
              <p className="text-slate-500 text-[11px]">Broadcasting alert status within 1 second over real-time API socket connection.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-red-100 space-y-1">
              <div className="font-bold text-slate-900">Exact GPS Coordinates</div>
              <p className="text-slate-500 text-[11px]">Pinpoints worker location with sub-5-meter accuracy and direct call button.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-red-100 space-y-1">
              <div className="font-bold text-slate-900">Manager Dashboard Banner</div>
              <p className="text-slate-500 text-[11px]">Persistent high-visibility alert banner until marked resolved by management.</p>
            </div>
          </div>
        </section>

        {/* Feature 3: Route Playback & Dwell Stops */}
        <section className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-700 uppercase">Module 03</span>
              <h2 className="text-2xl font-bold text-slate-900">Route Playback & Dwell Stop Analysis</h2>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Replay full-day travel paths from raw GPS waypoints. Perzent automatically computes stationary dwell stop locations and calculates exact duration spent at customer sites.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Automated Dwell Stops</div>
              <p className="text-slate-500 text-[11px]">Identifies stationary stops and duration spent at client locations.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Distance Travelled</div>
              <p className="text-slate-500 text-[11px]">Calculates total daily kilometers for expense and travel reimbursement.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">15-Day Archive Storage</div>
              <p className="text-slate-500 text-[11px]">Compacted server-side via pg_cron nightly jobs for quick route playback.</p>
            </div>
          </div>
        </section>

        {/* Feature 4: Attendance & Timesheets */}
        <section className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase">Module 04</span>
              <h2 className="text-2xl font-bold text-slate-900">Automated Timesheets & Payroll Ledger</h2>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Gross vs net worked hours computed automatically. Includes break caps, night shift timezone adjustments, auto check-out cutoffs, audit reasons for manual edits, and payroll CSV exports.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Auto Check-Out Cutoff</div>
              <p className="text-slate-500 text-[11px]">Unclosed shifts auto-close at end of day cutoff to prevent overnight over-billing.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Audit Trail Logging</div>
              <p className="text-slate-500 text-[11px]">Manual check-ins or force check-outs store an override_reason for payroll audits.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Standard CSV Export</div>
              <p className="text-slate-500 text-[11px]">Export payroll timesheets into standard CSV for accounting software.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 rounded-2xl bg-slate-900 text-white text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to Streamline Your Field Operations?</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">Deploy Perzent for your team with zero setup cost on our free launch plan.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
          >
            Create Company Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
