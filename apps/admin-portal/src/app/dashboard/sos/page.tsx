'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Siren } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/client';
import {
  PageHeader,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  Notice,
  inputClass,
  labelClass,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from '@/components';

type SosStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';

interface SosAlert {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  note?: string | null;
  status: SosStatus;
  created_at: string;
  resolved_at?: string | null;
  user?: {
    full_name?: string;
    phone?: string;
    designation?: string | null;
    department?: { name?: string } | null;
  } | null;
  resolver?: { full_name?: string } | null;
}

const STATUS_STYLE: Record<SosStatus, string> = {
  ACTIVE: 'bg-red-500/15 text-red-400 border-red-500/40',
  RESOLVED: 'bg-[#16A34A]/15 text-[#86EFAC] border-[#16A34A]/40',
  DISMISSED: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
};

export default function SosAlertsPage() {
  const [tab, setTab] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [review, setReview] = useState<{ id: string; action: 'RESOLVE' | 'DISMISS' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await apiFetch<{ alerts: SosAlert[] }>(`/api/sos${tab === 'ACTIVE' ? '?status=ACTIVE' : ''}`);
      setAlerts(data.alerts ?? []);
      setError('');
    } catch (reason) {
      if (!background) setError(errorMessage(reason, 'Could not load SOS alerts.'));
    } finally {
      if (!background) setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const submitReview = async () => {
    if (!review) return;
    setReviewing(true);
    setReviewError('');
    try {
      await apiFetch('/api/sos', {
        method: 'PATCH',
        json: { id: review.id, action: review.action, ...(reviewNote.trim() ? { note: reviewNote.trim() } : {}) },
      });
      setNotice(review.action === 'RESOLVE' ? 'Alert marked as resolved.' : 'Alert dismissed.');
      setReview(null);
      setReviewNote('');
      await load(true);
    } catch (reason) {
      setReviewError(errorMessage(reason, 'Could not update the alert.'));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="SOS alerts"
        description="Emergency alerts sent from the employee app with the worker's live GPS position. This page refreshes every 30 seconds."
        actions={
          <button onClick={() => load()} className={btnSecondary} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      <div className="flex items-center gap-1.5">
        {(['ACTIVE', 'ALL'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              tab === value ? 'bg-[#16A34A] text-white' : 'dashboard-nav-link border dashboard-divider'
            }`}
          >
            {value === 'ACTIVE' ? 'Active' : 'All'}
          </button>
        ))}
      </div>

      {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
      <ErrorBanner message={error} onRetry={() => load()} retrying={loading} />

      {loading ? (
        <div className="dashboard-card rounded-lg"><LoadingRows rows={3} /></div>
      ) : alerts.length === 0 ? (
        <div className="dashboard-card rounded-lg">
          <EmptyState
            icon={Siren}
            title={tab === 'ACTIVE' ? 'No active SOS alerts' : 'No SOS alerts yet'}
            description="When an employee presses the SOS button in the app, the alert appears here with their live location."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="dashboard-card rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${alert.status === 'ACTIVE' ? 'bg-red-600 text-white' : 'bg-slate-800/60 text-slate-400'}`}>
                    <Siren className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold dashboard-strong truncate">{alert.user?.full_name || 'Unknown employee'}</p>
                    <p className="text-[11px] text-[#6B7280]">
                      {[alert.user?.designation, alert.user?.department?.name].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="text-[11px] text-[#6B7280]">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[alert.status]}`}>
                  {alert.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B7280]">
                <a
                  href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#86EFAC] hover:underline font-semibold"
                >
                  <ExternalLink className="w-3 h-3" /> Open live location (±{Math.round(alert.accuracy)} m)
                </a>
                {alert.user?.phone && (
                  <a href={`tel:${alert.user.phone}`} className="hover:underline">Call {alert.user.phone}</a>
                )}
                {alert.note && <span className="truncate max-w-full">Note: {alert.note}</span>}
                {alert.status !== 'ACTIVE' && alert.resolver?.full_name && (
                  <span>Handled by {alert.resolver.full_name}{alert.resolved_at ? ` · ${new Date(alert.resolved_at).toLocaleString()}` : ''}</span>
                )}
              </div>

              {alert.status === 'ACTIVE' && review?.id !== alert.id && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setReview({ id: alert.id, action: 'RESOLVE' }); setReviewNote(''); setReviewError(''); }} className={btnPrimary}>
                    Mark resolved
                  </button>
                  <button onClick={() => { setReview({ id: alert.id, action: 'DISMISS' }); setReviewNote(''); setReviewError(''); }} className={btnDanger}>
                    Dismiss
                  </button>
                </div>
              )}

              {review?.id === alert.id && (
                <div className="border dashboard-divider rounded-lg p-2.5 space-y-2">
                  <label className={labelClass}>
                    {review.action === 'RESOLVE' ? 'Resolution note (optional)' : 'Dismissal note (optional)'}
                  </label>
                  <input
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="e.g. Spoke to the employee — false alarm"
                    className={inputClass}
                    maxLength={300}
                  />
                  {reviewError && <p className="text-[11px] text-red-400">{reviewError}</p>}
                  <div className="flex items-center gap-1.5">
                    <button onClick={submitReview} disabled={reviewing} className={review.action === 'RESOLVE' ? btnPrimary : btnDanger}>
                      {reviewing ? 'Saving…' : review.action === 'RESOLVE' ? 'Confirm resolve' : 'Confirm dismiss'}
                    </button>
                    <button onClick={() => setReview(null)} disabled={reviewing} className={btnSecondary}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
