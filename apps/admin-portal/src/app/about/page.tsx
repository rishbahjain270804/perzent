import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import {
  ShieldCheck,
  Server,
  Database,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  Code
} from 'lucide-react';

export const metadata = {
  title: 'About Us · Perzent Field Force Platform',
  description: 'Learn about Perzent mission, native Kotlin engineering architecture, Supabase Row-Level Security infrastructure, and commitment to operational transparency.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-900 font-sans antialiased">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-20 w-full">
        {/* Page Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">About Perzent</span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
            Engineering Honest & Transparent Field Operations
          </h1>
          <p className="text-base text-slate-600 leading-relaxed font-normal">
            Perzent was founded to solve a critical operational challenge: providing business owners with real-time location visibility while ensuring attendance data is tamper-proof and payroll is 100% accurate.
          </p>
        </section>

        {/* Engineering Philosophy Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Code className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Native Kotlin Engine</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our Android location service is hand-written in native Kotlin to run in the foreground. It reliably survives app swipes, screen sleep modes, airplane mode toggles, and device reboots.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Supabase RLS Protection</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Built on Supabase Postgres with strict Row-Level Security (RLS) policies. Direct RPC endpoints verify active user tokens, ensuring zero unauthenticated access to location trails.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Audit-Logged Overrides</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every manual check-in or force check-out requires a documented override reason. This leaves an immutable paper trail for accounting and payroll dispute resolution.
            </p>
          </div>
        </section>

        {/* Architecture Security Detail */}
        <section className="p-8 rounded-2xl bg-slate-900 text-white space-y-6">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Security Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-bold">Zero-Trust Mobile Security Architecture</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              We collect precise GPS coordinates strictly while an employee is actively checked in on shift. Off-duty locations are never tracked or stored.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-300">
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold mb-1">Hardware Fingerprinting</strong>
                <span>Installation tokens are stored in Android SecureStore and encrypted native preferences to prevent account cloning.</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold mb-1">Server-Side Jittered Flush</strong>
                <span>Offline location queues automatically retry ingestion with exponential jittered backoff upon network reconnection.</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Experience Perzent for Your Organization</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">Create a free company account today and start tracking your field force in real time.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            Create Company Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
