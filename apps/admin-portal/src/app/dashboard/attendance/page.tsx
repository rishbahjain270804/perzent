'use client';
import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  UserCheck,
  Coffee,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AttendanceSummary } from '@perzent/shared-types';

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceSummary | null>(null);
  const [overrideTime, setOverrideTime] = useState('14:00');
  const [overrideReason, setOverrideReason] = useState('Left office early for personal appointment');

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [manualTime, setManualTime] = useState('09:00');
  const [manualReason, setManualReason] = useState('Phone battery discharged in morning');

  const fetchAttendance = () => {
    setLoading(true);
    fetch('/api/attendance')
      .then((res) => res.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttendance();
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data);
          setManualUserId(data[0]?.id || '');
        }
      });
  }, []);

  const handleForceCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'force_checkout',
        attendance_id: selectedRecord.id,
        override_time: overrideTime,
        reason: overrideReason,
      }),
    });

    setShowCheckoutModal(false);
    fetchAttendance();
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'manual_checkin',
        user_id: manualUserId,
        check_in_time: new Date(`${new Date().toISOString().slice(0, 10)}T${manualTime}:00+05:30`).toISOString(),
        reason: manualReason,
      }),
    });

    setShowCheckInModal(false);
    fetchAttendance();
  };

  const filteredRecords = records.filter(
    (r) =>
      r.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.work_date?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">Attendance & Timesheets</h1>
          <p className="text-[10px] md:text-[11px] text-[#6B7280]">
            Auditable records • Gross vs net work hours • Break deductions
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={fetchAttendance}
            className="p-1.5 rounded border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowCheckInModal(true)}
            className="px-2.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <UserCheck className="w-3.5 h-3.5" /> Manual Check-In
          </button>
        </div>
      </div>

      {/* 4-Cell Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-[#6B7280] text-[10px] uppercase font-semibold">Today's Shifts</span>
          <p className="text-lg md:text-xl font-bold dashboard-strong mt-0.5 tabular-nums">{records.length}</p>
          <span className="text-[10px] text-[#6B7280]">Punched logs</span>
        </div>
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-emerald-400 text-[10px] uppercase font-semibold">In Progress</span>
          <p className="text-lg md:text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">
            {records.filter((r) => r.status === 'CHECKED_IN' || r.status === 'ON_BREAK').length}
          </p>
          <span className="text-[10px] text-[#6B7280]">Currently on duty</span>
        </div>
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-amber-400 text-[10px] uppercase font-semibold">Completed</span>
          <p className="text-lg md:text-xl font-bold text-amber-400 mt-0.5 tabular-nums">
            {records.filter((r) => r.status === 'CHECKED_OUT' || r.status === 'AUTO_CHECKED_OUT').length}
          </p>
          <span className="text-[10px] text-[#6B7280]">Signed off</span>
        </div>
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-blue-400 text-[10px] uppercase font-semibold">Retention</span>
          <p className="text-lg md:text-xl font-bold text-blue-400 mt-0.5 tabular-nums">45 Days</p>
          <span className="text-[10px] text-[#6B7280]">Full audit trail</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rep or date..."
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-700 bg-[#0B1120] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <span className="text-[10px] md:text-[11px] text-[#6B7280]">{filteredRecords.length} records</span>
      </div>

      {/* ─── Mobile Card List ─── */}
      <div className="md:hidden space-y-2">
        {filteredRecords.map((rec) => {
          const grossHours = (rec.gross_worked_minutes / 60).toFixed(1);
          const netHours = (rec.net_worked_minutes / 60).toFixed(1);

          return (
            <div key={rec.id} className="dashboard-card rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs dashboard-strong">{rec.user_name}</p>
                  <p className="font-mono text-[10px] text-[#6B7280]">{rec.work_date}</p>
                </div>
                {rec.status === 'CHECKED_IN' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span> Active
                  </span>
                )}
                {rec.status === 'ON_BREAK' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Coffee className="w-2.5 h-2.5" /> Lunch
                  </span>
                )}
                {rec.status === 'CHECKED_OUT' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                    Completed
                  </span>
                )}
                {rec.status === 'AUTO_CHECKED_OUT' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400">
                    Auto-Out
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/60 text-[10px]">
                <div>
                  <span className="text-[#6B7280] block">In:</span>
                  <span className="font-mono text-slate-300">
                    {new Date(rec.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Out:</span>
                  <span className="font-mono text-slate-300">
                    {rec.punch_out_time
                      ? new Date(rec.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Net:</span>
                  <span className="font-mono font-bold text-emerald-400">{netHours}h</span>
                </div>
              </div>

              {(rec.status === 'CHECKED_IN' || rec.status === 'ON_BREAK') && (
                <div className="pt-1 flex justify-end border-t border-slate-800/40">
                  <button
                    onClick={() => {
                      setSelectedRecord(rec);
                      setShowCheckoutModal(true);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition"
                  >
                    Override Out
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filteredRecords.length === 0 && !loading && (
          <p className="text-center text-[#6B7280] text-[11px] py-8">No attendance records found.</p>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Representative</th>
                <th className="px-3 py-2">Punch In</th>
                <th className="px-3 py-2">Punch Out</th>
                <th className="px-3 py-2">Gross (Hours)</th>
                <th className="px-3 py-2">Break (Mins)</th>
                <th className="px-3 py-2">Net Work</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredRecords.map((rec) => {
                const grossHours = (rec.gross_worked_minutes / 60).toFixed(1);
                const netHours = (rec.net_worked_minutes / 60).toFixed(1);

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/20 transition">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{rec.work_date}</td>
                    <td className="px-3 py-2 font-semibold dashboard-strong">{rec.user_name}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                      {new Date(rec.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                      {rec.punch_out_time
                        ? new Date(rec.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : rec.status === 'AUTO_CHECKED_OUT'
                        ? '11:40 PM (Auto)'
                        : <span className="text-[#86EFAC]">In Progress</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">{grossHours}h</td>
                    <td className="px-3 py-2 font-mono text-amber-400">{rec.total_break_minutes}m</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-400">{netHours}h</td>
                    <td className="px-3 py-2">
                      {rec.status === 'CHECKED_IN' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span> Active
                        </span>
                      )}
                      {rec.status === 'ON_BREAK' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Coffee className="w-2.5 h-2.5" /> Lunch
                        </span>
                      )}
                      {rec.status === 'CHECKED_OUT' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          Completed
                        </span>
                      )}
                      {rec.status === 'AUTO_CHECKED_OUT' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400">
                          11:40 PM Auto
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {rec.status === 'CHECKED_IN' || rec.status === 'ON_BREAK' ? (
                        <button
                          onClick={() => {
                            setSelectedRecord(rec);
                            setShowCheckoutModal(true);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition"
                        >
                          Override Out
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Force Checkout Modal */}
      {showCheckoutModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="max-w-md w-full dashboard-card rounded-lg p-4 sm:p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <h3 className="font-bold text-sm dashboard-strong">Manager Force Check-Out</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleForceCheckout} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Representative</label>
                <input
                  type="text"
                  disabled
                  value={selectedRecord.user_name}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-800 bg-slate-900/60 text-slate-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Override Check-Out Time</label>
                <input
                  type="time"
                  required
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Manager Audit Reason</label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs placeholder-slate-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  Confirm Force Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="max-w-md w-full dashboard-card rounded-lg p-4 sm:p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <h3 className="font-bold text-sm dashboard-strong">Manual Punch In</h3>
              <button onClick={() => setShowCheckInModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Select Employee</label>
                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Check-In Time</label>
                <input
                  type="time"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Audit Reason</label>
                <textarea
                  required
                  rows={2}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs placeholder-slate-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold"
                >
                  Record Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
