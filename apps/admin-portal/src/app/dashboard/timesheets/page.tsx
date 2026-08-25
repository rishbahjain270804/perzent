'use client';
import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  User,
  Building,
  RefreshCw,
  DollarSign,
} from 'lucide-react';

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchTimesheets = () => {
    setLoading(true);
    fetch(`/api/timesheets?start_date=${startDate}&end_date=${endDate}`)
      .then((res) => res.json())
      .then((data) => {
        setTimesheets(data.timesheets || []);
        setMeta({
          total_records: data.total_records || 0,
          total_net_hours: data.total_net_hours || 0,
          total_overtime_hours: data.total_overtime_hours || 0,
          standard_daily_hours: data.standard_daily_hours || 8.0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTimesheets();
  }, [startDate, endDate]);

  const handleExportCsv = () => {
    window.location.href = `/api/timesheets?start_date=${startDate}&end_date=${endDate}&format=csv`;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base md:text-lg font-bold dashboard-strong tracking-tight">Timesheets & Payroll</h1>
          <p className="text-xs text-[#6B7280]">Payroll-ready hours roll-up with automatic overtime calculations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTimesheets}
            className="p-2 rounded border border-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export to CSV (XLS)
          </button>
        </div>
      </div>

      {/* Date Filters & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="dashboard-card p-3 rounded-lg border border-slate-700/40 col-span-1 md:col-span-1">
          <label className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold block mb-1">Date Range</label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white w-full"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-white w-full"
            />
          </div>
        </div>

        <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Total Shifts</span>
          <p className="text-xl font-bold text-slate-200 mt-0.5">{meta.total_records || 0}</p>
        </div>

        <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Total Net Hours</span>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{meta.total_net_hours || 0} <span className="text-xs font-normal text-slate-400">hrs</span></p>
        </div>

        <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Overtime Hours</span>
          <p className="text-xl font-bold text-amber-400 mt-0.5">{meta.total_overtime_hours || 0} <span className="text-xs font-normal text-slate-400">hrs</span></p>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card rounded-lg overflow-hidden border border-slate-700/40">
        <div className="p-3 border-b border-slate-700/40 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Payroll Timesheet Records</span>
          <span className="text-[11px] text-slate-400">Cap: {meta.standard_daily_hours || 8.0} hrs/day</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Calculating timesheets…</div>
        ) : timesheets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No timesheet records found for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] text-[#6B7280] uppercase tracking-wider">
                  <th className="p-3 font-semibold">Employee</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Gross</th>
                  <th className="p-3 font-semibold">Break</th>
                  <th className="p-3 font-semibold">Net Hours</th>
                  <th className="p-3 font-semibold">Regular</th>
                  <th className="p-3 font-semibold text-amber-400">Overtime</th>
                  <th className="p-3 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {timesheets.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-3 font-medium dashboard-strong">
                      <div>
                        <p className="leading-tight">{row.user_name}</p>
                        <p className="text-[10px] text-slate-400">{row.phone}</p>
                      </div>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{row.work_date}</td>
                    <td className="p-3 text-slate-400">{row.department}</td>
                    <td className="p-3 text-slate-300">{row.gross_hours}h</td>
                    <td className="p-3 text-slate-400">{row.break_hours}h</td>
                    <td className="p-3 font-bold text-emerald-400">{row.net_hours}h</td>
                    <td className="p-3 text-slate-300">{row.regular_hours}h</td>
                    <td className="p-3 font-semibold text-amber-400">{row.overtime_hours > 0 ? `+${row.overtime_hours}h` : '0h'}</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">{row.site_name}</td>
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
