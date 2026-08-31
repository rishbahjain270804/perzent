import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import {
  Truck,
  Wrench,
  Briefcase,
  HardHat,
  ArrowRight,
  CheckCircle2,
  Building2,
  ShieldCheck
} from 'lucide-react';

export const metadata = {
  title: 'Industry Solutions · Perzent Field Force Platform',
  description: 'Discover how Perzent delivers tailored location intelligence and attendance management for delivery fleets, field service technicians, sales representatives, and construction site workers.',
};

export default function SolutionsPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-900 font-sans antialiased">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-20 w-full">
        {/* Page Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Industry Solutions</span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
            Tailored Location Intelligence for Every Field Team
          </h1>
          <p className="text-base text-slate-600 leading-relaxed font-normal">
            Whether managing delivery couriers, maintenance technicians, traveling sales reps, or job site workers, Perzent adapts to your operational requirements.
          </p>
        </section>

        {/* Industry Solutions Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Solution 1: Logistics */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Delivery & Logistics Fleets</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Maintain full visibility over couriers and transport drivers. Monitor vehicle speeds, route compliance, and dwell stop durations at customer drop-offs.
            </p>
            <ul className="space-y-2 text-xs font-medium text-slate-700 pt-2 border-t border-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Real-time vehicle speed and movement telemetry</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automated dwell stop detection at client warehouses</span>
              </li>
            </ul>
          </div>

          {/* Solution 2: Field Service */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Field Service & Engineering</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Verify technician arrival times at client sites. Ensure on-duty hours reflect actual client service calls with automated site geofence records.
            </p>
            <ul className="space-y-2 text-xs font-medium text-slate-700 pt-2 border-t border-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified arrival and departure timestamps</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Single-device hardware binding to prevent proxy punches</span>
              </li>
            </ul>
          </div>

          {/* Solution 3: Sales Reps */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sales Executives & Field Reps</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Monitor daily client visit routes, punctuality rates, and total kilometers traveled. Generate audit-ready travel distance and expense reports.
            </p>
            <ul className="space-y-2 text-xs font-medium text-slate-700 pt-2 border-t border-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automatic daily travel distance calculations</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>15-day route playback history for visit verification</span>
              </li>
            </ul>
          </div>

          {/* Solution 4: Construction & Sites */}
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <HardHat className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Construction & Job Sites</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Deploy shared site kiosk mode or phone check-ins at job sites. Enforce shift cutoff auto check-outs so hours are never inflated overnight.
            </p>
            <ul className="space-y-2 text-xs font-medium text-slate-700 pt-2 border-t border-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Shared site kiosk punch mode under manager session</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Enforced auto check-out cutoffs at end of shift</span>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 rounded-2xl bg-slate-900 text-white text-center space-y-4">
          <h2 className="text-2xl font-bold">Deploy Perzent for Your Field Workforce</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">Get started in under 5 minutes with zero credit card required.</p>
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
