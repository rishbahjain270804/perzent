'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, Briefcase, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/client';
import { PageHeader, StatCard, EmptyState, ErrorBanner, LoadingRows, useSession, inputClass, iconBtn } from '@/components';

interface DepartmentStat {
  name: string;
  total_hours: number;
  punches: number;
  late_punches: number;
}

interface AnalyticsResponse {
  punctuality_rate_percentage: number;
  on_time_shifts: number;
  late_shifts: number;
  total_hours_worked: number;
  average_shift_hours: number;
  total_approved_leaves: number;
  department_breakdown?: DepartmentStat[];
}

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function ReportsAnalyticsPage() {
  const { session } = useSession();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<AnalyticsResponse>(`/api/reports/analytics?days=${days}`);
      setData(result);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not load analytics.'));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const departments = data?.department_breakdown || [];
  const timeZone = session?.company?.timezone;

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Reports"
        description={`Punctuality, hours and leave for the selected period. Late = check-in after 09:30 company time${timeZone ? ` (${timeZone})` : ''}.`}
        actions={
          <>
            <select value={days} onChange={(e) => setDays(e.target.value)} className={inputClass} aria-label="Period">
              {RANGES.map((range) => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            <button onClick={fetchAnalytics} disabled={loading} className={iconBtn} title="Refresh" aria-label="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      />

      <ErrorBanner message={error} onRetry={fetchAnalytics} retrying={loading} />

      {loading && !data ? (
        <div className="dashboard-card rounded-lg"><LoadingRows rows={4} label="Calculating" /></div>
      ) : !data ? (
        !error && <div className="dashboard-card rounded-lg"><EmptyState icon={BarChart3} title="No data yet" description="Reports fill in once employees start checking in." /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="Punctuality" value={`${data.punctuality_rate_percentage}%`} icon={TrendingUp} tone="success" hint={`${data.on_time_shifts} on-time shifts`} />
            <StatCard label="Late check-ins" value={data.late_shifts} icon={AlertTriangle} tone={data.late_shifts > 0 ? 'warning' : 'default'} hint="After 09:30 company time" />
            <StatCard label="Hours worked" value={data.total_hours_worked} icon={Clock} tone="info" hint={`Avg ${data.average_shift_hours} h / shift`} />
            <StatCard label="Approved leaves" value={data.total_approved_leaves} icon={Briefcase} hint="In this period" />
          </div>

          <div className="dashboard-card rounded-lg p-4">
            <h3 className="text-xs font-bold dashboard-strong mb-3">Departments — hours and on-time rate</h3>
            {departments.length === 0 ? (
              <EmptyState icon={BarChart3} title="No shifts in this period" description="Department figures appear once shifts are recorded." compact />
            ) : (
              <div className="space-y-3">
                {departments.map((dept) => {
                  const onTimeRate = dept.punches > 0 ? Math.round(((dept.punches - dept.late_punches) / dept.punches) * 100) : 100;
                  return (
                    <div key={dept.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium dashboard-strong truncate">{dept.name}</span>
                        <span className="text-slate-400 text-[11px] shrink-0">
                          {dept.total_hours.toFixed(1)} h · {dept.punches} shift{dept.punches === 1 ? '' : 's'} · {onTimeRate}% on time
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex" role="img" aria-label={`${onTimeRate}% on time`}>
                        <div className="bg-emerald-500 h-full transition-all motion-reduce:transition-none" style={{ width: `${onTimeRate}%` }} />
                        <div className="bg-amber-500 h-full transition-all motion-reduce:transition-none" style={{ width: `${100 - onTimeRate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
