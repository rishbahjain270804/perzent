'use client';
import { useState, useEffect } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  AlertCircle,
  User,
} from 'lucide-react';

export default function LeavesManagementPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>({ paid: 12, sick: 6, casual: 6 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  const fetchLeaves = () => {
    setLoading(true);
    fetch('/api/leave')
      .then((res) => res.json())
      .then((data) => {
        if (data.requests) setRequests(data.requests);
        if (data.balances) setBalances(data.balances);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        fetchLeaves();
      } else {
        const err = await res.json();
        alert(err.error || 'Action failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({
          leave_type: 'CASUAL',
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date().toISOString().slice(0, 10),
          reason: '',
        });
        fetchLeaves();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit leave');
      }
    } catch {
      alert('Network error');
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'REJECTED') return 'bg-red-500/15 text-red-400 border-red-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base md:text-lg font-bold dashboard-strong tracking-tight">Leave & Absence (PTO)</h1>
          <p className="text-xs text-[#6B7280]">Request time off, manage leave balances and 1-tap approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLeaves} className="p-2 rounded border border-slate-700 text-slate-400 hover:text-white transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Request Leave
          </button>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Paid Leave</span>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{balances.paid ?? 12} <span className="text-xs font-normal text-slate-400">days</span></p>
        </div>
        <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Sick Leave</span>
          <p className="text-xl font-bold text-amber-400 mt-0.5">{balances.sick ?? 6} <span className="text-xs font-normal text-slate-400">days</span></p>
        </div>
        <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Casual Leave</span>
          <p className="text-xl font-bold text-cyan-400 mt-0.5">{balances.casual ?? 6} <span className="text-xs font-normal text-slate-400">days</span></p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="dashboard-card rounded-lg overflow-hidden border border-slate-700/40">
        <div className="p-3 border-b border-slate-700/40 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Leave Applications</span>
          <span className="text-[11px] text-slate-400">{requests.length} Total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading leave records…</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No leave requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] text-[#6B7280] uppercase tracking-wider">
                  <th className="p-3 font-semibold">Employee</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Duration</th>
                  <th className="p-3 font-semibold">Days</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-3 font-medium dashboard-strong">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                          {r.user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="leading-tight">{r.user?.full_name || 'Current User'}</p>
                          <p className="text-[10px] text-slate-400">{r.user?.department?.name || 'Staff'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-slate-300">{r.leave_type}</td>
                    <td className="p-3 text-slate-300">
                      {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-bold text-slate-200">{r.total_days}</td>
                    <td className="p-3 text-slate-400 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium ${statusBadge(r.status)}`}>
                        {r.status === 'APPROVED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {r.status === 'REJECTED' && <XCircle className="w-2.5 h-2.5" />}
                        {r.status === 'PENDING' && <Clock className="w-2.5 h-2.5" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {r.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleAction(r.id, 'APPROVE')}
                            disabled={actionLoading === r.id}
                            className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'REJECT')}
                            disabled={actionLoading === r.id}
                            className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-[11px] font-medium transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="dashboard-card bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-bold dashboard-strong mb-3">Submit Leave Request</h3>
            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Leave Type</label>
                <select
                  value={form.leave_type}
                  onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="CASUAL">Casual Leave (Balance: {balances.casual ?? 6})</option>
                  <option value="SICK">Sick Leave (Balance: {balances.sick ?? 6})</option>
                  <option value="PAID">Paid Vacation (Balance: {balances.paid ?? 12})</option>
                  <option value="UNPAID">Unpaid Absence</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Reason / Notes</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reason for time off…"
                  rows={3}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-xs text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-semibold text-white"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
