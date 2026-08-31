'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Download, RefreshCw, Clock } from 'lucide-react';
import { apiFetch, errorMessage, todayInTimezone, shiftDate } from '@/lib/client';
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  inputClass,
  labelClass,
  btnPrimary,
  iconBtn,
  errorText,
  tableHeadRow,
  tableRow,
} from '@/components';

interface TimesheetRow {
  id: string;
  user_name: string;
  phone?: string;
  department?: string;
  site_name?: string;
  work_date: string;
  gross_hours: number;
  break_hours: number;
  net_hours: number;
  regular_hours: number;
  overtime_hours: number;
  needs_review?: boolean;
  review_reason?: string | null;
}

const ReviewBadge = ({ row }: { row: { needs_review?: boolean; review_reason?: string | null } }) =>
  row.needs_review ? (
    <span
      title={row.review_reason || 'Needs review'}
      className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
    >
      Review
    </span>
  ) : null;

interface TimesheetResponse {
  timesheets?: TimesheetRow[];
  total_records?: number;
  total_net_hours?: number;
  total_overtime_hours?: number;
  standard_daily_hours?: number;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [meta, setMeta] = useState({ total_records: 0, total_net_hours: 0, total_overtime_hours: 0, standard_daily_hours: 8 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState(() => shiftDate(todayInTimezone(), -14));
  const [endDate, setEndDate] = useState(() => todayInTimezone());

  const rangeError = startDate && endDate && startDate > endDate ? 'Start date must be on or before the end date.' : '';

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (userFilter) params.set('user_id', userFilter);
    return params;
  }, [startDate, endDate, userFilter]);

  const fetchTimesheets = useCallback(async () => {
    if (rangeError || !startDate || !endDate) return;
    setLoading(true);
    try {
      const data = await apiFetch<TimesheetResponse>(`/api/timesheets?${buildQuery().toString()}`);
      setTimesheets(Array.isArray(data?.timesheets) ? data.timesheets : []);
      setMeta({
        total_records: data?.total_records || 0,
        total_net_hours: data?.total_net_hours || 0,
        total_overtime_hours: data?.total_overtime_hours || 0,
        standard_daily_hours: data?.standard_daily_hours || 8,
      });
      setError('');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not load timesheets.'));
    } finally {
      setLoading(false);
    }
  }, [buildQuery, rangeError, startDate, endDate]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  useEffect(() => {
    apiFetch<EmployeeOption[]>('/api/employees')
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]));
  }, []);

  const handleExportCsv = () => {
    if (rangeError) return;
    const params = buildQuery();
    params.set('format', 'csv');
    window.location.href = `/api/timesheets?${params.toString()}`;
  };

  const today = todayInTimezone();

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Timesheets"
        description={`Net hours per employee-day with overtime beyond ${meta.standard_daily_hours} h. Export for payroll.`}
        actions={
          <>
            <button onClick={fetchTimesheets} disabled={loading || !!rangeError} className={iconBtn} title="Refresh" aria-label="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleExportCsv} disabled={!!rangeError || loading || timesheets.length === 0} className={btnPrimary}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </>
        }
      />

      <ErrorBanner message={error} onRetry={fetchTimesheets} retrying={loading} />

      <div className="dashboard-card rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <div>
          <label htmlFor="start_date" className={labelClass}>From</label>
          <input id="start_date" type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="end_date" className={labelClass}>To</label>
          <input id="end_date" type="date" value={endDate} min={startDate} max={today} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label htmlFor="ts_employee" className={labelClass}>Employee</label>
          <select id="ts_employee" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={inputClass}>
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </div>
        {rangeError && <p role="alert" className={`${errorText} col-span-full`}>{rangeError}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Shifts" value={meta.total_records} icon={FileSpreadsheet} />
        <StatCard label="Net hours" value={meta.total_net_hours} icon={Clock} tone="success" />
        <StatCard label="Overtime" value={meta.total_overtime_hours} tone={meta.total_overtime_hours > 0 ? 'warning' : 'default'} hint={`beyond ${meta.standard_daily_hours} h/day`} />
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {loading && <div className="dashboard-card rounded-lg"><LoadingRows rows={3} /></div>}
        {!loading &&
          timesheets.map((row) => (
            <div key={row.id} className="dashboard-card rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-xs dashboard-strong truncate">{row.user_name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{row.department || 'No department'} · {row.site_name || 'Field'}</p>
                </div>
                <span className="font-mono text-[10px] text-[#6B7280] flex items-center gap-1.5"><ReviewBadge row={row} />{row.work_date}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-800/60 text-[10px]">
                <div><span className="text-[#6B7280] block">Gross</span><span className="font-mono text-slate-300">{row.gross_hours}h</span></div>
                <div><span className="text-[#6B7280] block">Break</span><span className="font-mono text-slate-400">{row.break_hours}h</span></div>
                <div><span className="text-[#6B7280] block">Net</span><span className="font-mono font-bold text-emerald-400">{row.net_hours}h</span></div>
                <div><span className="text-[#6B7280] block">OT</span><span className="font-mono font-semibold text-amber-400">{row.overtime_hours > 0 ? `+${row.overtime_hours}h` : '0h'}</span></div>
              </div>
            </div>
          ))}
        {!loading && timesheets.length === 0 && !error && (
          <div className="dashboard-card rounded-lg">
            <EmptyState icon={FileSpreadsheet} title="No timesheet rows" description="Nothing recorded for this range. Widen the dates or pick another employee." compact />
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Timesheet rows</span>
          <span className="text-[11px] text-slate-400">{startDate} → {endDate}</span>
        </div>
        {loading ? (
          <LoadingRows rows={5} />
        ) : timesheets.length === 0 ? (
          !error && <EmptyState icon={FileSpreadsheet} title="No timesheet rows" description="Nothing recorded for this range. Widen the dates or pick another employee." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={tableHeadRow}>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Gross</th>
                  <th className="p-3">Break</th>
                  <th className="p-3">Net</th>
                  <th className="p-3">Regular</th>
                  <th className="p-3 text-amber-400">Overtime</th>
                  <th className="p-3">Site</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {timesheets.map((row) => (
                  <tr key={row.id} className={tableRow}>
                    <td className="p-3 font-medium dashboard-strong">
                      <p className="leading-tight">{row.user_name}</p>
                      <p className="text-[10px] text-slate-400">{row.phone}</p>
                    </td>
                    <td className="p-3 text-slate-300 font-mono"><span className="flex items-center gap-1.5">{row.work_date}<ReviewBadge row={row} /></span></td>
                    <td className="p-3 text-slate-400">{row.department || '—'}</td>
                    <td className="p-3 text-slate-300">{row.gross_hours}h</td>
                    <td className="p-3 text-slate-400">{row.break_hours}h</td>
                    <td className="p-3 font-bold text-emerald-400">{row.net_hours}h</td>
                    <td className="p-3 text-slate-300">{row.regular_hours}h</td>
                    <td className="p-3 font-semibold text-amber-400">{row.overtime_hours > 0 ? `+${row.overtime_hours}h` : '0h'}</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">{row.site_name || 'Field'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
