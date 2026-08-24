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
        setRecords(data);
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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Attendance & Break Timesheets</h1>
          <p className="text-[11px] text-[#6B7280]">
            Auditable records • Gross vs net work hours • Recorded break deductions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttendance}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowCheckInModal(true)}
            className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <UserCheck className="w-3.5 h-3.5" /> Manual Check-In
          </button>
        </div>
      </div>

      {/* 4-Cell Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-800 bg-[#0B1120] rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-800">
        <div className="p-3.5">
          <span className="text-[#6B7280] text-[11px]">Today's Shifts</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{records.length}</p>
          <span className="text-[10px] text-[#6B7280]">Punched logs</span>
        </div>
        <div className="p-3.5">
          <span className="text-[#86EFAC] text-[11px]">Active In Progress</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-[#86EFAC]">
            {records.filter((r) => r.status === 'CHECKED_IN' || r.status === 'ON_BREAK').length}
          </p>
          <span className="text-[10px] text-[#6B7280]">Currently on duty</span>
        </div>
        <div className="p-3.5">
          <span className="text-amber-400 text-[11px]">Completed Shifts</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-amber-400">
            {records.filter((r) => r.status === 'CHECKED_OUT' || r.status === 'AUTO_CHECKED_OUT').length}
          </p>
          <span className="text-[10px] text-[#6B7280]">Signed off</span>
        </div>
        <div className="p-3.5">
          <span className="text-blue-400 text-[11px]">Retention Policy</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-blue-400">45 Days</p>
          <span className="text-[10px] text-[#6B7280]">Full audit trail</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search representative or date (YYYY-MM-DD)..."
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-[#0B1120] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <span className="text-[11px] text-[#6B7280]">{filteredRecords.length} timesheet records</span>
      </div>

      {/* Dense Tabular Timesheet */}
      <div className="border border-slate-800 bg-[#0B1120] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Representative</th>
                <th className="px-4 py-2.5">Punch In</th>
                <th className="px-4 py-2.5">Punch Out</th>
                <th className="px-4 py-2.5">Gross (Hours)</th>
                <th className="px-4 py-2.5">Break (Mins)</th>
                <th className="px-4 py-2.5">Net Work</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredRecords.map((rec) => {
                const grossHours = (rec.gross_worked_minutes / 60).toFixed(1);
                const netHours = (rec.net_worked_minutes / 60).toFixed(1);

                return (
                  <tr key={rec.id} className="hover:bg-slate-850/40 transition">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{rec.work_date}</td>
                    <td className="px-4 py-2.5 font-semibold text-white">{rec.user_name}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300">
                      {new Date(rec.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300">
                      {rec.punch_out_time
                        ? new Date(rec.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : rec.status === 'AUTO_CHECKED_OUT'
                        ? '11:40 PM (Auto)'
                        : <span className="text-[#86EFAC]">In Progress</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{grossHours}h</td>
                    <td className="px-4 py-2.5 font-mono text-amber-400">{rec.total_break_minutes}m</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-white">{netHours}h</td>
                    <td className="px-4 py-2.5">
                      {rec.status === 'CHECKED_IN' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span> Active
                        </span>
                      )}
                      {rec.status === 'ON_BREAK' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Coffee className="w-2.5 h-2.5" /> Lunch
                        </span>
                      )}
                      {rec.status === 'CHECKED_OUT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          Completed
                        </span>
                      )}
                      {rec.status === 'AUTO_CHECKED_OUT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400">
                          11:40 PM Auto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {rec.status === 'CHECKED_IN' || rec.status === 'ON_BREAK' ? (
                        <button
                          onClick={() => {
                            setSelectedRecord(rec);
                            setShowCheckoutModal(true);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-[#0B1120] border border-slate-800 rounded-lg p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Manager Check-Out Override</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleForceCheckout} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Representative</label>
                <input
                  type="text"
                  disabled
                  value={selectedRecord.user_name}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-400 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Effective Check-Out Time</label>
                <input
                  type="time"
                  required
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reason for Override</label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-[#0B1120] border border-slate-800 rounded-lg p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Manual Punch-In Override</h3>
              <button onClick={() => setShowCheckInModal(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleManualCheckIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Representative</label>
                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs"
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.department_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Punch-In Time</label>
                <input
                  type="time"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Justification Reason</label>
                <textarea
                  required
                  rows={2}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold"
                >
                  Save Manual Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
