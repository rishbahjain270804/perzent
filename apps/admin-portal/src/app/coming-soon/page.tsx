'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, FileSpreadsheet, Mail, MapPin, Radio, UserCheck } from 'lucide-react';
import { PerzentLogo } from '@/components/PerzentLogo';
import { AppShowcase } from '@/components/AppShowcase';

const SOLVING = [
  { icon: UserCheck, title: 'Proxy attendance', text: 'Device-bound check-ins. One phone, one person.' },
  { icon: MapPin, title: 'Fake travel claims', text: 'GPS route history proves every kilometre.' },
  { icon: Radio, title: 'Safety blind spots', text: 'SOS button sends live location to managers.' },
  { icon: FileSpreadsheet, title: 'Manual timesheets', text: 'Payroll-ready exports, zero data entry.' },
];

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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#fafcfb] font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Ambient page background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] opacity-25 [background-size:26px_26px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      {/* ——— TOP NAVIGATION ——— */}
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-12">
        <Link href="/coming-soon" aria-label="Perzent — coming soon">
          <PerzentLogo markClassName="h-8 w-8 sm:h-9 sm:w-9" textClassName="text-lg sm:text-xl" />
        </Link>

        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest text-slate-600 shadow-sm sm:gap-2 sm:px-3.5 sm:text-[11px]">
          <span>COMING</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700">SOON</span>
        </div>
      </header>

      {/* ——— MAIN HERO ——— */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-6 py-8 sm:px-12 lg:grid-cols-12 lg:gap-4 lg:py-4">
        {/* LEFT: value proposition + waitlist form */}
        <div className="max-w-xl space-y-8 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>LAUNCHING SOON · EARLY ACCESS OPEN</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              Field workforce tracking
              <br />
              that{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                actually works.
              </span>
            </h1>

            <p className="max-w-lg text-sm font-normal leading-relaxed text-slate-600 sm:text-base">
              Perzent eliminates proxy attendance, verifies travel routes with GPS, and turns shifts into
              payroll-ready timesheets — so you stop losing money to broken field ops.
            </p>
          </div>

          <div className="space-y-3">
            {!done ? (
              <form onSubmit={submit} className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-md shadow-slate-950/20 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Joining…' : <>Join waitlist <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="font-medium">You&apos;re on the priority list! We&apos;ll be in touch soon.</span>
              </div>
            )}
            {error && <p className="pl-1 text-xs font-medium text-red-600">{error}</p>}
            <p className="pl-1 text-xs text-slate-500">Free during launch · No credit card needed</p>
          </div>

          <div className="space-y-4 border-t border-slate-200/80 pt-6">
            <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700">
              What we&apos;re solving
            </span>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SOLVING.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-100/70 text-emerald-700 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900 sm:text-sm">{title}</h4>
                    <p className="text-[12px] leading-snug text-slate-500">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: hand-built app showcase */}
        <div className="flex items-center justify-center lg:col-span-6 lg:justify-end">
          <AppShowcase />
        </div>
      </main>

      {/* ——— FOOTER ——— */}
      <footer className="relative z-10 flex min-h-14 flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-3 text-xs font-medium text-slate-400">
        <span>© 2026 Perzent · Operated by JSP Coders</span>
        <span className="hidden sm:inline text-slate-300">|</span>
        <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
        <Link href="/terms" className="hover:text-slate-600">Terms</Link>
        <Link href="/support" className="hover:text-slate-600">Support</Link>
      </footer>
    </div>
  );
}
