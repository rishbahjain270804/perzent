'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, RefreshCw, Check, X } from 'lucide-react';
import { apiFetch, errorMessage, formatDate } from '@/lib/client';
import {
  PageHeader,
  StatusBadge,
  Modal,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  Notice,
  inputClass,
  labelClass,
  btnPrimary,
  btnSecondary,
  btnDanger,
  iconBtn,
  errorText,
  tableHeadRow,
  tableRow,
} from '@/components';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type ReviewAction = 'APPROVE' | 'REJECT';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  review_notes?: string | null;
  created_at?: string;
  user?: { full_name?: string; designation?: string | null; department?: { name?: string } | null } | null;
  reviewer?: { full_name?: string } | null;
}

const STATUS_TABS: Array<{ value: LeaveStatus | 'ALL'; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ALL', label: 'All' },
];

export default function LeavesManagementPage() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('PENDING');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [review, setReview] = useState<{ request: LeaveRequest; action: ReviewAction } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const data = await apiFetch<{ requests?: LeaveRequest[] }>(`/api/leave${query}`);
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not load leave requests.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openReview = (request: LeaveRequest, action: ReviewAction) => {
    setReview({ request, action });
    setReviewNotes('');
    setReviewError('');
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!review) return;
    setReviewing(true);
    setReviewError('');
    try {
      await apiFetch('/api/leave', {
        method: 'PATCH',
        json: { id: review.request.id, action: review.action, review_notes: reviewNotes.trim() || undefined },
      });
      setNotice(`${review.request.user?.full_name || 'Request'} — ${review.action === 'APPROVE' ? 'approved' : 'rejected'}.`);
      setReview(null);
      fetchLeaves();
    } catch (reason) {
      setReviewError(errorMessage(reason, 'Could not update the request.'));
    } finally {
      setReviewing(false);
    }
  };

  const actions = (request: LeaveRequest) =>
    request.status === 'PENDING' ? (
      <div className="inline-flex items-center gap-1.5">
        <button
          onClick={() => openReview(request, 'APPROVE')}
          className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium transition inline-flex items-center gap-1"
        >
          <Check className="w-3 h-3" /> Approve
        </button>
        <button
          onClick={() => openReview(request, 'REJECT')}
          className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-[11px] font-medium transition inline-flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Reject
        </button>
      </div>
    ) : (
      <span className="text-[10px] text-slate-500" title={request.review_notes || undefined}>
        {request.reviewer?.full_name ? `by ${request.reviewer.full_name}` : 'Processed'}
        {request.review_notes ? ' · notes' : ''}
      </span>
    );

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Leaves"
        description="Requests submitted by employees from the app. Approve or reject with optional notes."
        actions={
          <button onClick={fetchLeaves} disabled={loading} className={iconBtn} title="Refresh" aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
      <ErrorBanner message={error} onRetry={fetchLeaves} retrying={loading} />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
              statusFilter === tab.value ? 'bg-[#16A34A] border-[#16A34A] text-white' : 'border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {loading && <div className="dashboard-card rounded-lg"><LoadingRows rows={3} /></div>}
        {!loading &&
          requests.map((r) => (
            <div key={r.id} className="dashboard-card rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-xs dashboard-strong truncate">{r.user?.full_name || 'Employee'}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{r.user?.department?.name || r.user?.designation || 'Staff'}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/60 text-[10px]">
                <div><span className="text-[#6B7280] block">Type</span><span className="text-slate-300 font-semibold">{r.leave_type}</span></div>
                <div><span className="text-[#6B7280] block">Dates</span><span className="text-slate-300">{formatDate(r.start_date)} – {formatDate(r.end_date)}</span></div>
                <div><span className="text-[#6B7280] block">Days</span><span className="text-slate-300 font-bold">{r.total_days}</span></div>
              </div>
              <p className="text-[11px] text-slate-400">{r.reason}</p>
              {r.review_notes && <p className="text-[10px] text-[#6B7280]">Notes: {r.review_notes}</p>}
              <div className="pt-1 flex justify-end border-t border-slate-800/40">{actions(r)}</div>
            </div>
          ))}
        {!loading && requests.length === 0 && !error && (
          <div className="dashboard-card rounded-lg">
            <EmptyState icon={CalendarDays} title={`No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase() + ' '}requests`} description="Employees submit leave requests from the Android app." compact />
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Leave requests</span>
          <span className="text-[11px] text-[#6B7280]">{requests.length} shown</span>
        </div>
        {loading ? (
          <LoadingRows rows={4} />
        ) : requests.length === 0 ? (
          !error && (
            <EmptyState
              icon={CalendarDays}
              title={`No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase() + ' '}requests`}
              description="Employees submit leave requests from the Android app; they show up here for review."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={tableHeadRow}>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Dates</th>
                  <th className="px-3 py-2">Days</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {requests.map((r) => (
                  <tr key={r.id} className={tableRow}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                          {r.user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="leading-tight font-medium dashboard-strong">{r.user?.full_name || 'Employee'}</p>
                          <p className="text-[10px] text-slate-400">{r.user?.department?.name || r.user?.designation || 'Staff'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-300">{r.leave_type}</td>
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{formatDate(r.start_date)} – {formatDate(r.end_date)}</td>
                    <td className="px-3 py-2 font-bold text-slate-200">{r.total_days}</td>
                    <td className="px-3 py-2 text-slate-400 max-w-xs">
                      <p className="truncate" title={r.reason}>{r.reason}</p>
                      {r.review_notes && <p className="text-[10px] text-[#6B7280] truncate" title={r.review_notes}>Notes: {r.review_notes}</p>}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2 text-right">{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!review}
        onClose={() => !reviewing && setReview(null)}
        title={review?.action === 'APPROVE' ? 'Approve leave' : 'Reject leave'}
        description={
          review
            ? `${review.request.user?.full_name || 'Employee'} · ${review.request.leave_type} · ${formatDate(review.request.start_date)} – ${formatDate(review.request.end_date)} (${review.request.total_days} day${review.request.total_days === 1 ? '' : 's'})`
            : undefined
        }
        size="sm"
      >
        <form onSubmit={submitReview} className="space-y-2.5" noValidate>
          <p className="text-[11px] text-slate-400">Reason given: {review?.request.reason || '—'}</p>
          <div>
            <label htmlFor="review_notes" className={labelClass}>Notes for the employee <span className="font-normal text-slate-500">(optional)</span></label>
            <textarea id="review_notes" rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder={review?.action === 'REJECT' ? 'Why is this being rejected?' : 'Anything the employee should know'} className={inputClass} />
          </div>
          {reviewError && <p role="alert" className={errorText}>{reviewError}</p>}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setReview(null)} disabled={reviewing} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={reviewing} className={review?.action === 'APPROVE' ? btnPrimary : btnDanger}>
              {reviewing ? 'Saving…' : review?.action === 'APPROVE' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
