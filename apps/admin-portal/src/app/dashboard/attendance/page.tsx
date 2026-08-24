'use client';
import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  UserCheck,
  Info,
  X,
  Coffee,
} from 'lucide-react';
import { AttendanceSummary } from '@perzent/shared-types';

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceSummary | null>(null);
  const [overrideTime, setOverrideTime] = useState('14:00');
  const [overrideReason, setOverrideReason] = useState('Left office early for personal appointment');

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [manualUserId, setManualUserId] = useState('user-amit-employee');
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
        check_in_time: new Date().toISOString(),
        reason: manualReason,
      }),
    });

    setShowCheckInModal(false);
    fetchAttendance();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950 border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#16A34A]" /> 45-Day Attendance & Break Timesheet
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Audit gross vs net work hours, lunch break deductions, and manager checkout overrides
          </p>
        </div>

        <button
          onClick={() => setShowCheckInModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-green-600/25"
        >
          <UserCheck className="w-4 h-4 text-white" /> Manual Check-In Override
        </button>
      </div>

      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/25 text-xs text-[#86EFAC]">
        <Info className="w-4 h-4 text-[#16A34A] shrink-0" />
        <span>
          <strong className="text-white">Free Tier Policy:</strong> Attendance records and break logs are maintained for 45 days. Auto check-out activates nightly at 11:40 PM IST.
        </span>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[#6B7280] font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Punch In</th>
                <th className="px-6 py-4">Punch Out</th>
                <th className="px-6 py-4">Gross Time</th>
                <th className="px-6 py-4">Break Time</th>
                <th className="px-6 py-4">Net Work Time</th>
                <th className="px-6 py-4">Punched By</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/50 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white text-sm">{r.user_name}</p>
                    <p className="text-[11px] text-[#6B7280]">ID: {r.user_id.slice(0, 10)}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">{r.work_date}</td>
                  <td className="px-6 py-4 text-[#86EFAC] font-medium">
                    {new Date(r.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    {r.punch_out_time ? (
                      <span className="text-slate-200 font-medium">
                        {new Date(r.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {r.punch_out_override_time && (
                          <span className="block text-[10px] text-amber-400">Override: {r.punch_out_override_time}</span>
                        )}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/20 text-[#86EFAC] font-semibold text-[10px] border border-[#16A34A]/30">
                        Active Shift
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {Math.floor(r.gross_worked_minutes / 60)}h {r.gross_worked_minutes % 60}m
                  </td>
                  <td className="px-6 py-4 text-amber-400 font-medium flex items-center gap-1">
                    <Coffee className="w-3.5 h-3.5" /> {r.total_break_minutes}m
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {Math.floor(r.net_worked_minutes / 60)}h {r.net_worked_minutes % 60}m
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-300">
                      {r.punch_out_by || r.punch_in_by}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!r.punch_out_time && (
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setShowCheckoutModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium text-xs transition"
                      >
                        Force Check-Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCheckoutModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white">Force Check-Out Employee</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              If <strong>{selectedRecord.user_name}</strong> forgot to punch out (e.g. left midday at 2:00 PM), select their actual departure time. Points after this time will be excluded and remote tracking halted.
            </p>

            <form onSubmit={handleForceCheckout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">
                  Actual Departure Time
                </label>
                <input
                  type="time"
                  required
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">
                  Reason for Manual Checkout
                </label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Employee left early for personal emergency"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-500/20"
                >
                  Confirm Force Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white">Manual Check-In on Behalf of Employee</h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Select Employee</label>
                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  <option value="user-amit-employee">Amit Kumar (Field Sales)</option>
                  <option value="user-sneha-employee">Sneha Patel (Client Officer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Shift Start Time</label>
                <input
                  type="time"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Employee phone was uncharged upon arrival"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-xs font-semibold text-white shadow-lg shadow-green-600/25"
                >
                  Save Manual Punch-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
