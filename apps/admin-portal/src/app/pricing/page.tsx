import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export const metadata = {
  title: 'Pricing & Launch Plan · Perzent Field Force Platform',
  description: 'View Perzent transparent pricing plan: 100% free during launch for unlimited employees and managers with zero credit card requirements.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-900 font-sans antialiased">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-20 w-full">
        {/* Page Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Transparent Pricing</span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
            Simple, Transparent Pricing
          </h1>
          <p className="text-base text-slate-600 leading-relaxed font-normal">
            Enjoy full platform access for your entire company with zero subscription costs during our product launch.
          </p>
        </section>

        {/* Pricing Card */}
        <section className="max-w-3xl mx-auto p-8 rounded-2xl bg-white border border-slate-300 shadow-xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" /> FREE LAUNCH PLAN
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Free Launch Period</h2>
              <p className="text-xs text-slate-600 mt-1">Unlimited feature access for all your employees and managers.</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-4xl font-black text-slate-900 font-mono">₹0 / month</div>
              <span className="text-xs font-semibold text-emerald-700">No Credit Card Required</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">What's included in the launch plan:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 font-medium">
              {[
                'Unlimited employees, managers & departments',
                '3-second live map stream updates',
                '15-day route playback & dwell stop detection',
                '45-day attendance & break history ledger',
                'Automated payroll timesheets & CSV exports',
                'Single-device hardware binding anti-tamper',
                'Geofenced sites & shared kiosk punch mode',
                'Night shift cutoff policy enforcement',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-200">
            <span className="text-xs text-slate-500">Instant registration · Up and running in 5 minutes</span>
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
            >
              Create Free Company Account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
