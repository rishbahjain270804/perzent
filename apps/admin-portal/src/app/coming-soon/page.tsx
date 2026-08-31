'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Mail,
  UserCheck,
  MapPin,
  Radio,
  FileSpreadsheet,
  Bell,
  Menu,
  Navigation,
} from 'lucide-react';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (r.ok) {
        setDone(true);
      } else {
        const data = await r.json().catch(() => null);
        setError(data?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#fafcfb] text-slate-900 flex flex-col justify-between font-sans antialiased selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* ——— TOP NAVIGATION ——— */}
      <header className="h-16 sm:h-20 max-w-7xl mx-auto w-full px-4 sm:px-12 flex items-center justify-between">
        <Link href="/coming-soon" className="flex items-center gap-2 sm:gap-2.5">
          <img
            src="/logo-mark.png"
            alt="Perzent"
            className="h-7 sm:h-9 w-auto object-contain shrink-0"
          />
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Perzent
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full border border-slate-200 bg-white shadow-2xs text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-slate-600">
          <span>COMING</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700">SOON</span>
        </div>
      </header>

      {/* ——— MAIN HERO CONTENT (2-COLUMN HIGH-IMPACT LAYOUT) ——— */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-12 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center flex-1">
        {/* LEFT COLUMN: VALUE PROPOSITION & WAITLIST FORM */}
        <div className="lg:col-span-6 space-y-8 max-w-xl">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>COMING SOON</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              Field workforce tracking
              <br />
              that <span className="text-emerald-600">actually works.</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg font-normal">
              Perzent eliminates proxy attendance, verifies travel routes with GPS,
              and automates payroll — so you stop losing money to broken field ops.
            </p>
          </div>

          {/* Email Capture Input */}
          <div className="space-y-3">
            {!done ? (
              <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition shadow-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-md shadow-slate-950/20 disabled:opacity-50 shrink-0"
                >
                  {submitting ? 'Joining…' : <>Join waitlist <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl shadow-xs">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-medium">You&apos;re on the priority list! We&apos;ll be in touch soon.</span>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-600 font-medium pl-1">{error}</p>
            )}
          </div>

          {/* What We're Solving Grid */}
          <div className="pt-6 border-t border-slate-200/80 space-y-4">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              WHAT WE&apos;RE SOLVING
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Feature 1 */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-700 shadow-2xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Proxy attendance</h4>
                  <p className="text-[12px] text-slate-500 leading-snug">Device-bound check-ins. One phone, one person.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-700 shadow-2xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Fake travel claims</h4>
                  <p className="text-[12px] text-slate-500 leading-snug">GPS route history proves every kilometer.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-700 shadow-2xs">
                  <Radio className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Safety blind spots</h4>
                  <p className="text-[12px] text-slate-500 leading-snug">SOS button sends live location to managers.</p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-700 shadow-2xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Manual timesheets</h4>
                  <p className="text-[12px] text-slate-500 leading-snug">Auto-generated payroll exports, zero data entry.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH-FIDELITY STATIC HERO GRAPHIC */}
        <div className="lg:col-span-6 relative flex items-center justify-center py-4 lg:py-6">
          <img
            src="/hero-mockup.png"
            alt="Perzent Real-time Field Workforce Tracking App Mockup"
            className="w-full max-w-lg lg:max-w-xl h-auto object-contain select-none pointer-events-none"
          />
        </div>
      </main>

      {/* ——— FOOTER ——— */}
      <footer className="h-14 flex items-center justify-center border-t border-slate-100 text-xs text-slate-400 font-medium">
        © 2026 Perzent · Operated by JSP Coders · All Rights Reserved
      </footer>
    </div>
  );
}
