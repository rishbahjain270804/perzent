'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, BarChart3, Download } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/client';
import { PageHeader, EmptyState, ErrorBanner, LoadingRows, useSession, iconBtn, btnSecondary, tableHeadRow, tableRow } from '@/components';
import { Segmented, downloadCsv } from '@/components/DashboardTools';

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
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

function Metric({ label, value, sub, tone = 'default' }: { label: string; value: string | number; sub?: string; tone?: 'default' | 'good' | 'warn' }) {
  const color = tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'dashboard-strong';
  return (
    <div className="px-1">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[#6B7280]">{label}</p>
      <p className={`text-2xl font-black tabular-nums leading-tight mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#6B7280] mt-0.5">{sub}</p>}
    </div>
  );
}

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

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      `report_${days}d.csv`,
      ['Department', 'Hours', 'Shifts', 'Late', 'On-time %'],
      departments.map((d) => [d.name, d.total_hours.toFixed(1), d.punches, d.late_punches, d.punches > 0 ? Math.round(((d.punches - d.late_punches) / d.punches) * 100) : 100]),
    );
  };

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Reports"
        description={`Punctuality, hours and leave. Late = check-in after 09:30 company time${timeZone ? ` (${timeZone})` : ''}.`}
        actions={
          <>
            <Segmented value={days} onChange={setDays} options={RANGES} ariaLabel="Period" />
            <button onClick={exportCsv} disabled={!data || departments.length === 0} className={btnSecondary}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
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
          {/* Compact metric row */}
          <div className="dashboard-card rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 divide-slate-800 md:divide-x">
            <Metric label="Punctuality" value={`${data.punctuality_rate_percentage}%`} tone="good" sub={`${data.on_time_shifts} on-time shifts`} />
            <Metric label="Late check-ins" value={data.late_shifts} tone={data.late_shifts > 0 ? 'warn' : 'default'} sub="after 09:30" />
            <Metric label="Hours worked" value={data.total_hours_worked} sub={`avg ${data.average_shift_hours} h / shift`} />
            <Metric label="Approved leaves" value={data.total_approved_leaves} sub="in this period" />
          </div>

          {/* Departments — clean table instead of progress-bar decoration */}
          <div className="dashboard-card rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800/60">
              <span className="font-semibold text-xs dashboard-strong">By department</span>
            </div>
            {departments.length === 0 ? (
              <EmptyState icon={BarChart3} title="No shifts in this period" description="Department figures appear once shifts are recorded." compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={tableHeadRow}>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2 text-right">Hours</th>
                      <th className="px-3 py-2 text-right">Shifts</th>
                      <th className="px-3 py-2 text-right">On-time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {departments.map((dept) => {
                      const onTimeRate = dept.punches > 0 ? Math.round(((dept.punches - dept.late_punches) / dept.punches) * 100) : 100;
                      return (
                        <tr key={dept.name} className={tableRow}>
                          <td className="px-3 py-2 font-medium dashboard-strong">{dept.name}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{dept.total_hours.toFixed(1)}h</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{dept.punches}</td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${onTimeRate >= 90 ? 'text-emerald-400' : onTimeRate >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{onTimeRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
