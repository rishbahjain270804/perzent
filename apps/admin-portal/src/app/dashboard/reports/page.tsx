'use client';
import { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Briefcase,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export default function ReportsAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  const fetchAnalytics = () => {
    setLoading(true);
    fetch(`/api/reports/analytics?days=${days}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base md:text-lg font-bold dashboard-strong tracking-tight">Reports & Attendance Analytics</h1>
          <p className="text-xs text-[#6B7280]">Punctuality patterns, late clock-ins, and labor productivity breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="p-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white"
          >
            <option value="7">Last 7 Days</option>
            <option value="15">Last 15 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded border border-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-xs text-slate-500">Generating analytics metrics…</div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Punctuality Rate</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400">{data.punctuality_rate_percentage}%</p>
              <p className="text-[10px] text-slate-400 mt-1">{data.on_time_shifts} on-time shifts</p>
            </div>

            <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Late Clock-ins</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400">{data.late_shifts}</p>
              <p className="text-[10px] text-slate-400 mt-1">Past 9:30 AM IST</p>
            </div>

            <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Total Hours Worked</span>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-cyan-400">{data.total_hours_worked} <span className="text-xs font-normal text-slate-400">hrs</span></p>
              <p className="text-[10px] text-slate-400 mt-1">Avg {data.average_shift_hours} hrs / shift</p>
            </div>

            <div className="dashboard-card p-3 rounded-lg border border-slate-700/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Approved Leaves</span>
                <Briefcase className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <p className="text-2xl font-bold text-slate-200">{data.total_approved_leaves}</p>
              <p className="text-[10px] text-slate-400 mt-1">Recorded PTO</p>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="dashboard-card rounded-lg p-4 border border-slate-700/40">
            <h3 className="text-xs font-bold dashboard-strong mb-3">Department Productivity & Punctuality</h3>
            <div className="space-y-3">
              {data.department_breakdown?.map((dept: any) => {
                const onTimeRate = dept.punches > 0 ? Math.round(((dept.punches - dept.late_punches) / dept.punches) * 100) : 100;
                return (
                  <div key={dept.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium dashboard-strong">{dept.name}</span>
                      <span className="text-slate-400">{dept.total_hours} hrs • {dept.punches} shifts ({onTimeRate}% on-time)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${onTimeRate}%` }}
                      />
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${100 - onTimeRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
