'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Siren } from 'lucide-react';
import { apiFetch } from '@/lib/client';

/**
 * Polls for active SOS alerts and shows a red call-to-action across the dashboard so an
 * emergency is visible no matter which page the owner or manager has open.
 */
export function SosBanner({ role }: { role?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (role !== 'OWNER' && role !== 'MANAGER') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await apiFetch<{ alerts: unknown[] }>('/api/sos?status=ACTIVE');
        if (!cancelled) setCount(Array.isArray(data.alerts) ? data.alerts.length : 0);
      } catch {
        /* keep the last known state; the SOS page itself surfaces errors */
      }
    };
    poll();
    const interval = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role]);

  if (count === 0) return null;

  return (
    <Link
      href="/dashboard/sos"
      className="flex items-center justify-center gap-2 px-3 py-2 mb-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition"
      role="alert"
    >
      <Siren className="w-4 h-4 animate-pulse" />
      {count === 1 ? '1 active SOS alert' : `${count} active SOS alerts`} — open to respond
    </Link>
  );
}
