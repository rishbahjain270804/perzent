'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, UserCheck, Coffee, RefreshCw, LogOut, Info } from 'lucide-react';
import { apiFetch, errorMessage, formatTime, todayInTimezone, shiftDate, minutesToHours } from '@/lib/client';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  Modal,
  SearchBar,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  Notice,
  useSession,
  inputClass,
  labelClass,
  helpClass,
  btnPrimary,
  btnSecondary,
  btnDanger,
  btnGhost,
  iconBtn,
  errorText,
  tableHeadRow,
  tableRow,
} from '@/components';

type AttendanceStatus = 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'AUTO_CHECKED_OUT';

interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  work_date: string;
  punch_in_time: string;
  punch_out_time?: string | null;
  punch_in_by?: string | null;
  punch_out_by?: string | null;
  override_reason?: string | null;
  status: AttendanceStatus;
  gross_worked_minutes: number;
  total_break_minutes: number;
  net_worked_minutes: number;
}

interface EmployeeOption {
  id: string;
  full_name: string;
  phone: string;
  status?: string;
}

const isOpenShift = (status: AttendanceStatus) => status === 'CHECKED_IN' || status === 'ON_BREAK';

export default function AttendancePage() {
  const { session } = useSession();
  const company = session?.company;
  const timeZone = company?.timezone;

  const [from, setFrom] = useState(() => shiftDate(todayInTimezone(), -6));
  const [to, setTo] = useState(() => todayInTimezone());
  const [userFilter, setUserFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [notice, setNotice] = useState('');

  // Force check-out
  const [checkoutTarget, setCheckoutTarget] = useState<AttendanceRecord | null>(null);
  const [overrideTime, setOverrideTime] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // Manual check-in
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [checkInError, setCheckInError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const rangeError = from && to && from > to ? '"From" must be on or before "To".' : '';

  const fetchAttendance = useCallback(async () => {
    if (rangeError) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (userFilter) params.set('user_id', userFilter);
      const data = await apiFetch<AttendanceRecord[]>(`/api/attendance?${params.toString()}`);
      setRecords(Array.isArray(data) ? data : []);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not load attendance.'));
    } finally {
      setLoading(false);
    }
  }, [from, to, userFilter, rangeError]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    apiFetch<EmployeeOption[]>('/api/employees')
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.user_name?.toLowerCase().includes(q) || r.work_date?.includes(q));
  }, [records, searchQuery]);

  const stats = {
    total: records.length,
    inProgress: records.filter((r) => isOpenShift(r.status)).length,
    completed: records.filter((r) => r.status === 'CHECKED_OUT').length,
    auto: records.filter((r) => r.status === 'AUTO_CHECKED_OUT').length,
  };

  const openCheckout = (record: AttendanceRecord) => {
    setCheckoutTarget(record);
    setOverrideTime('');
    setOverrideReason('');
    setCheckoutError('');
  };

  const handleForceCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!checkoutTarget) return;
    if (overrideReason.trim().length < 3) {
      setCheckoutError('Enter a reason for the audit trail (at least 3 characters).');
      return;
    }
    setCheckingOut(true);
    setCheckoutError('');
    try {
      await apiFetch('/api/attendance', {
        method: 'POST',
        json: {
          action: 'force_checkout',
          attendance_id: checkoutTarget.id,
          reason: overrideReason.trim(),
          ...(overrideTime ? { override_time: overrideTime } : {}),
        },
      });
      setNotice(`${checkoutTarget.user_name} checked out${overrideTime ? ` at ${overrideTime}` : ''}.`);
      setCheckoutTarget(null);
      fetchAttendance();
    } catch (reason) {
      setCheckoutError(errorMessage(reason, 'Could not check out this shift.'));
    } finally {
      setCheckingOut(false);
    }
  };

  const openCheckIn = () => {
    setManualUserId(userFilter || employees[0]?.id || '');
    setManualDate(todayInTimezone(timeZone));
    setManualTime('');
    setManualReason('');
    setCheckInError('');
    setCheckInOpen(true);
  };

  const handleManualCheckIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualUserId) {
      setCheckInError('Choose an employee.');
      return;
    }
    if (!manualTime) {
      setCheckInError('Enter the check-in time.');
      return;
    }
    if (manualReason.trim().length < 3) {
      setCheckInError('Enter a reason for the audit trail (at least 3 characters).');
      return;
    }
    setCheckingIn(true);
    setCheckInError('');
    try {
      await apiFetch('/api/attendance', {
        method: 'POST',
        json: {
          action: 'manual_checkin',
          user_id: manualUserId,
          work_date: manualDate,
          check_in_time: manualTime,
          reason: manualReason.trim(),
        },
      });
      const name = employees.find((e) => e.id === manualUserId)?.full_name || 'Employee';
      setNotice(`${name} checked in at ${manualTime} on ${manualDate}.`);
      setCheckInOpen(false);
      fetchAttendance();
    } catch (reason) {
      setCheckInError(errorMessage(reason, 'Could not record the check-in.'));
    } finally {
      setCheckingIn(false);
    }
  };

  const punchOutCell = (record: AttendanceRecord) => {
    if (record.punch_out_time) return formatTime(record.punch_out_time, timeZone);
    if (record.status === 'AUTO_CHECKED_OUT') return `${company?.auto_checkout_time || '—'} (auto)`;
    return <span className="text-[#86EFAC]">In progress</span>;
  };

  const punchMeta = (record: AttendanceRecord) => {
    const bits: string[] = [];
    if (record.punch_in_by && record.punch_in_by !== 'EMPLOYEE') bits.push(`in by ${record.punch_in_by.toLowerCase()}`);
    if (record.punch_out_by && record.punch_out_by !== 'EMPLOYEE' && record.punch_out_by !== 'AUTO_SYSTEM') bits.push(`out by ${record.punch_out_by.toLowerCase()}`);
    if (bits.length === 0) return null;
    return (
      <p className="text-[10px] text-[#6B7280]" title={record.override_reason || undefined}>
        {bits.join(' · ')}{record.override_reason ? ' · reason on file' : ''}
      </p>
    );
  };

  const today = todayInTimezone(timeZone);

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Attendance"
        description={
          company
            ? `Auto check-out at ${company.auto_checkout_time} (${company.timezone}) · records kept ${company.attendance_retention_days} days`
            : 'Shift records with gross and net hours'
        }
        actions={
          <>
            <button onClick={fetchAttendance} disabled={loading} className={iconBtn} title="Refresh" aria-label="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openCheckIn} className={btnPrimary}>
              <UserCheck className="w-3.5 h-3.5" /> Manual check-in
            </button>
          </>
        }
      />

      {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}
      <ErrorBanner message={error} onRetry={fetchAttendance} retrying={loading} />

      {/* Filters */}
      <div className="dashboard-card rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <div>
          <label htmlFor="from" className={labelClass}>From</label>
          <input id="from" type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="to" className={labelClass}>To</label>
          <input id="to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label htmlFor="employee" className={labelClass}>Employee</label>
          <select id="employee" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={inputClass}>
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </div>
        {rangeError && <p className={`${errorText} col-span-full`}>{rangeError}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Shifts" value={stats.total} icon={CalendarCheck} hint={`${from} → ${to}`} />
        <StatCard label="In progress" value={stats.inProgress} icon={UserCheck} tone="success" />
        <StatCard label="Completed" value={stats.completed} icon={Coffee} tone="warning" />
        <StatCard label="Auto checked-out" value={stats.auto} icon={LogOut} tone={stats.auto > 0 ? 'danger' : 'default'} hint="Forgot to check out" />
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Filter by name or date…" meta={`${filteredRecords.length} records`} />

      {/* ─── Mobile Card List ─── */}
      <div className="md:hidden space-y-2">
        {loading && <div className="dashboard-card rounded-lg"><LoadingRows rows={3} /></div>}
        {!loading &&
          filteredRecords.map((rec) => (
            <div key={rec.id} className="dashboard-card rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-xs dashboard-strong truncate">{rec.user_name}</p>
                  <p className="font-mono text-[10px] text-[#6B7280]">{rec.work_date}</p>
                </div>
                <StatusBadge status={rec.status} />
              </div>
              <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-800/60 text-[10px]">
                <div>
                  <span className="text-[#6B7280] block">In</span>
                  <span className="font-mono text-slate-300">{formatTime(rec.punch_in_time, timeZone)}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Out</span>
                  <span className="font-mono text-slate-300">{punchOutCell(rec)}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Break</span>
                  <span className="font-mono text-amber-400">{rec.total_break_minutes}m</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Net</span>
                  <span className="font-mono font-bold text-emerald-400">{minutesToHours(rec.net_worked_minutes)}h</span>
                </div>
              </div>
              {punchMeta(rec)}
              {isOpenShift(rec.status) && (
                <div className="pt-1 flex justify-end border-t border-slate-800/40">
                  <button onClick={() => openCheckout(rec)} className={btnGhost}>
                    <LogOut className="w-3 h-3" /> Force check-out
                  </button>
                </div>
              )}
            </div>
          ))}
        {!loading && filteredRecords.length === 0 && !error && (
          <div className="dashboard-card rounded-lg">
            <EmptyState icon={CalendarCheck} title="No attendance in this range" description="Widen the date range or pick another employee." compact />
          </div>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        {loading ? (
          <LoadingRows rows={5} />
        ) : filteredRecords.length === 0 ? (
          !error && (
            <EmptyState
              icon={CalendarCheck}
              title="No attendance in this range"
              description="Shifts appear here when employees check in on the app. Widen the date range or pick another employee."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={tableHeadRow}>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">In</th>
                  <th className="px-3 py-2">Out</th>
                  <th className="px-3 py-2">Gross</th>
                  <th className="px-3 py-2">Break</th>
                  <th className="px-3 py-2">Net</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className={tableRow}>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{rec.work_date}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold dashboard-strong leading-tight">{rec.user_name}</p>
                      {punchMeta(rec)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300">{formatTime(rec.punch_in_time, timeZone)}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300">{punchOutCell(rec)}</td>
                    <td className="px-3 py-2 font-mono text-slate-300">{minutesToHours(rec.gross_worked_minutes)}h</td>
                    <td className="px-3 py-2 font-mono text-amber-400">{rec.total_break_minutes}m</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-400">{minutesToHours(rec.net_worked_minutes)}h</td>
                    <td className="px-3 py-2"><StatusBadge status={rec.status} /></td>
                    <td className="px-3 py-2 text-right">
                      {isOpenShift(rec.status) ? (
                        <button onClick={() => openCheckout(rec)} className={btnGhost}>
                          <LogOut className="w-3 h-3" /> Force check-out
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-[#6B7280] flex items-start gap-1">
        <Info className="w-3 h-3 shrink-0 mt-px" />
        Times are shown in the company timezone{timeZone ? ` (${timeZone})` : ''}. Manual corrections are recorded with who made them and the reason.
      </p>

      {/* ─── Force check-out ─── */}
      <Modal
        open={!!checkoutTarget}
        onClose={() => !checkingOut && setCheckoutTarget(null)}
        title="Force check-out"
        description={checkoutTarget ? `${checkoutTarget.user_name} · ${checkoutTarget.work_date} · checked in ${formatTime(checkoutTarget.punch_in_time, timeZone)}` : undefined}
        size="sm"
      >
        <form onSubmit={handleForceCheckout} className="space-y-2.5" noValidate>
          <div>
            <label htmlFor="override_time" className={labelClass}>Check-out time <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="override_time" type="time" value={overrideTime} onChange={(e) => setOverrideTime(e.target.value)} className={inputClass} />
            <p className={helpClass}>Leave empty to use the current time. Interpreted in {timeZone || 'the company timezone'}.</p>
          </div>
          <div>
            <label htmlFor="override_reason" className={labelClass}>Reason (audit trail)</label>
            <textarea
              id="override_reason"
              required
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Why is this shift being closed by a manager?"
              className={inputClass}
            />
          </div>
          {checkoutError && <p role="alert" className={errorText}>{checkoutError}</p>}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setCheckoutTarget(null)} disabled={checkingOut} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={checkingOut || overrideReason.trim().length < 3} className={btnDanger}>
              {checkingOut ? 'Checking out…' : 'Confirm check-out'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Manual check-in ─── */}
      <Modal open={checkInOpen} onClose={() => !checkingIn && setCheckInOpen(false)} title="Manual check-in" description="Records a shift start on behalf of an employee." size="sm">
        <form onSubmit={handleManualCheckIn} className="space-y-2.5" noValidate>
          <div>
            <label htmlFor="manual_user" className={labelClass}>Employee</label>
            <select id="manual_user" required value={manualUserId} onChange={(e) => setManualUserId(e.target.value)} className={inputClass}>
              <option value="">Choose an employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.phone})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="manual_date" className={labelClass}>Work date</label>
              <input id="manual_date" type="date" required max={today} value={manualDate} onChange={(e) => setManualDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="manual_time" className={labelClass}>Check-in time</label>
              <input id="manual_time" type="time" required value={manualTime} onChange={(e) => setManualTime(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="manual_reason" className={labelClass}>Reason (audit trail)</label>
            <textarea
              id="manual_reason"
              required
              rows={2}
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Why is the check-in being recorded manually?"
              className={inputClass}
            />
          </div>
          {checkInError && <p role="alert" className={errorText}>{checkInError}</p>}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setCheckInOpen(false)} disabled={checkingIn} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={checkingIn || !manualUserId || !manualTime || !manualDate || manualReason.trim().length < 3} className={btnPrimary}>
              {checkingIn ? 'Recording…' : 'Record check-in'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
