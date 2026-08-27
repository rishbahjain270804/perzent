'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Wrench, Megaphone } from 'lucide-react';

/** Public pages that must stay reachable during maintenance (store review, policy, downloads). */
const EXEMPT_PATHS = ['/', '/privacy', '/download'];

type Status = {
  maintenance: { enabled: boolean; web: boolean; title: string; message: string; until: string | null };
  announcement: { text: string; level: 'INFO' | 'WARNING' | 'CRITICAL' } | null;
  support: { email: string | null; phone: string | null };
};

const POLL_MS = 60_000;

/**
 * Reads GET /api/status (driven by the AppConfig database row) and, when web maintenance is on,
 * replaces the page with a maintenance notice. Also renders the announcement banner. Fails open:
 * if the status call fails the app renders normally.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const pathname = usePathname();
  const exempt = EXEMPT_PATHS.includes(pathname || '/');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as Status;
        if (!cancelled) setStatus(data);
      } catch {
        /* fail open */
      }
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (status?.maintenance.web && !exempt) {
    const until = status.maintenance.until ? new Date(status.maintenance.until) : null;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC] text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold">{status.maintenance.title || 'Perzent is under maintenance'}</h1>
          <p className="mt-2 text-sm text-slate-600">{status.maintenance.message || 'We are making improvements. Please try again in a little while.'}</p>
          {until && !Number.isNaN(until.getTime()) && (
            <p className="mt-3 text-xs text-slate-500">Expected back by {until.toLocaleString()}</p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D]"
          >
            Check again
          </button>
          {(status.support.email || status.support.phone) && (
            <p className="mt-5 text-xs text-slate-500">
              Need help?{' '}
              {status.support.phone && <a className="text-[#15803D] underline" href={`tel:${status.support.phone}`}>{status.support.phone}</a>}
              {status.support.phone && status.support.email && ' · '}
              {status.support.email && <a className="text-[#15803D] underline" href={`mailto:${status.support.email}`}>{status.support.email}</a>}
            </p>
          )}
        </div>
      </div>
    );
  }

  const announcement = status?.announcement;
  const tone =
    announcement?.level === 'CRITICAL'
      ? 'bg-red-50 text-red-800 border-red-200'
      : announcement?.level === 'WARNING'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-blue-50 text-blue-800 border-blue-200';

  return (
    <>
      {announcement && (
        <div className={`flex items-start gap-2 border-b px-4 py-2 text-xs font-medium ${tone}`} role="status">
          <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{announcement.text}</span>
        </div>
      )}
      {children}
    </>
  );
}
