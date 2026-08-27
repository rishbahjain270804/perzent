'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Users, MapPin, Coffee, AlertTriangle, ArrowUpRight, Battery, RefreshCw, WifiOff } from 'lucide-react';
import { apiFetch, errorMessage, isAbortError, formatTime, todayInTimezone, relativeTime } from '@/lib/client';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  ErrorBanner,
  EmptyState,
  LoadingRows,
  useSession,
  iconBtn,
  btnGhost,
  tableHeadRow,
  tableRow,
} from '@/components';
import { freshnessOf, freshnessLabel, secondsSincePing, isOnShift, type LiveMember } from '@/components/liveStatus';

const POLL_MS = 30_000;

export default function DashboardOverviewPage() {
  const { session } = useSession();
  const timeZone = session?.company?.timezone;
  const [team, setTeam] = useState<LiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLiveTeam = useCallback(async (manual = false) => {
    if (inFlightRef.current) return;
    if (!manual && typeof document !== 'undefined' && document.hidden) return;
    inFlightRef.current = true;
    if (manual) setRefreshing(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await apiFetch<LiveMember[]>('/api/live-team', { signal: controller.signal });
      setTeam(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
      setError('');
    } catch (reason) {
      if (isAbortError(reason)) return;
      setError(errorMessage(reason, 'Could not load the live team.'));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveTeam(true);
    const interval = window.setInterval(() => fetchLiveTeam(false), POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) fetchLiveTeam(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      abortRef.current?.abort();
    };
  }, [fetchLiveTeam]);

  const now = Date.now();
  const totalEmployees = team.length;
  const checkedIn = team.filter((m) => m.shift_status === 'CHECKED_IN').length;
  const onBreak = team.filter((m) => m.shift_status === 'ON_BREAK').length;
  const tamperAlerts = team.filter((m) => m.has_tamper_alert).length;
  const disconnected = team.filter((m) => isOnShift(m) && freshnessOf(m, now) === 'disconnected').length;
  const today = todayInTimezone(timeZone);

  const trailHref = (member: LiveMember) => `/dashboard/live-map?user_id=${encodeURIComponent(member.user_id)}&date=${today}`;

  const statusLabel = (member: LiveMember) => {
    if (member.shift_status === 'CHECKED_IN') return member.is_moving ? 'Moving' : 'On duty';
    return undefined;
  };

  const renderFreshness = (member: LiveMember) => {
    const freshness = freshnessOf(member, now);
    if (freshness === 'idle') return null;
    const label = freshnessLabel(freshness, secondsSincePing(member, now));
    return <StatusBadge status={freshness.toUpperCase()} label={label} />;
  };

  const renderAlert = (member: LiveMember) => {
    if (!member.has_tamper_alert) return null;
    return (
      <p className="flex items-start gap-1 text-[10px] text-red-400 mt-1" title={member.tamper_reason || undefined}>
        <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
        <span className="truncate">{member.tamper_reason || 'Tamper alert'}</span>
      </p>
    );
  };

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      <PageHeader
        title="Overview"
        description={
          lastUpdated ? `Live team · updated ${formatTime(lastUpdated.toISOString(), timeZone)}` : 'Live team status for today'
        }
        actions={
          <>
            <button onClick={() => fetchLiveTeam(true)} disabled={refreshing} className={iconBtn} title="Refresh" aria-label="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard/live-map"
              className="px-2.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-[11px] flex items-center gap-1 transition"
            >
              <MapPin className="w-3 h-3" /> Live map
            </Link>
          </>
        }
      />

      <ErrorBanner message={error} onRetry={() => fetchLiveTeam(true)} retrying={refreshing} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Staff" value={totalEmployees} icon={Users} />
        <StatCard label="On duty" value={checkedIn} icon={MapPin} tone="success" />
        <StatCard label="On break" value={onBreak} icon={Coffee} tone="warning" />
        <StatCard
          label="Alerts"
          value={tamperAlerts + disconnected}
          icon={AlertTriangle}
          tone={tamperAlerts + disconnected > 0 ? 'danger' : 'default'}
          hint={disconnected > 0 ? `${disconnected} GPS/Net lost` : undefined}
        />
      </div>

      {/* ─── Mobile Card List ─── */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold dashboard-strong">Field team</span>
          <Link href="/dashboard/live-map" className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            Map <ArrowUpRight className="w-2.5 h-2.5" />
          </Link>
        </div>
        {loading && <div className="dashboard-card rounded-lg"><LoadingRows rows={3} /></div>}
        {team.map((m) => (
          <div key={m.user_id} className="dashboard-card rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px] shrink-0">
                  {m.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs dashboard-strong truncate">{m.full_name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{m.designation}{m.department_name ? ` · ${m.department_name}` : ''}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={m.shift_status} label={statusLabel(m)} />
                {renderFreshness(m)}
              </div>
            </div>
            {renderAlert(m)}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-[#6B7280] mt-2 pt-2 border-t border-slate-800/50">
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" />
                <span className="font-medium text-slate-300">{m.battery_level == null ? '—' : `${m.battery_level}%`}</span>
              </div>
              <div className="truncate" title={m.current_location?.address_name}>
                {m.current_location?.address_name?.split(',')[0] || (isOnShift(m) ? 'Waiting for GPS' : 'No shift today')}
              </div>
              <div className="text-right">
                <Link href={trailHref(m)} className="text-emerald-400 font-medium">Trail →</Link>
              </div>
            </div>
          </div>
        ))}
        {team.length === 0 && !loading && !error && (
          <div className="dashboard-card rounded-lg">
            <EmptyState
              icon={Users}
              title="No employees yet"
              description="Add staff on the Employees page, then have them sign in on the Android app."
              action={<Link href="/dashboard/employees" className={btnGhost}>Add employees</Link>}
              compact
            />
          </div>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Field team roster</span>
          <Link href="/dashboard/live-map" className="text-[10px] font-medium text-emerald-400 hover:text-white flex items-center gap-1 transition">
            Interactive map <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <LoadingRows rows={4} />
        ) : team.length === 0 ? (
          !error && (
            <EmptyState
              icon={Users}
              title="No employees yet"
              description="Add staff on the Employees page, then have them sign in on the Android app to appear here."
              action={<Link href="/dashboard/employees" className={btnGhost}>Add employees</Link>}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={tableHeadRow}>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Signal</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Battery</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {team.map((m) => {
                  const freshness = freshnessOf(m, now);
                  return (
                    <tr key={m.user_id} className={tableRow}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px]">
                            {m.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold dashboard-strong leading-tight">{m.full_name}</p>
                            <p className="text-[10px] text-[#6B7280]">{m.designation}{m.department_name ? ` · ${m.department_name}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={m.shift_status} label={statusLabel(m)} />
                        {renderAlert(m)}
                      </td>
                      <td className="px-3 py-2">
                        {freshness === 'idle' ? (
                          <span className="text-[10px] text-slate-500">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {renderFreshness(m)}
                            {freshness === 'disconnected' && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <WifiOff className="w-3 h-3" /> last ping {relativeTime(m.current_location?.last_ping_at, now)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <p className="truncate text-slate-300 text-[11px]" title={m.current_location?.address_name}>
                          {m.current_location?.address_name || (isOnShift(m) ? 'Waiting for GPS' : 'No shift today')}
                        </p>
                        {(m.dwell_minutes ?? 0) > 0 && isOnShift(m) && (
                          <p className="text-[10px] text-[#6B7280]">{m.dwell_minutes} min at this spot</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-bold text-emerald-400 tabular-nums text-[11px]">
                          {m.battery_level == null ? '—' : `${m.battery_level}%`}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-400">{m.device_model || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Link href={trailHref(m)} className={btnGhost}>Trail</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
