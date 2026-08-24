'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  MapPin,
  Coffee,
  AlertTriangle,
  ArrowUpRight,
  Battery,
  RefreshCw,
} from 'lucide-react';
import { LiveTeamMember } from '@perzent/shared-types';

export default function DashboardOverviewPage() {
  const [team, setTeam] = useState<LiveTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveTeam = () => {
    fetch('/api/live-team')
      .then((res) => res.json())
      .then((data) => { setTeam(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLiveTeam();
    const interval = setInterval(fetchLiveTeam, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalEmployees = team.length;
  const checkedIn = team.filter((m) => m.shift_status === 'CHECKED_IN').length;
  const onBreak = team.filter((m) => m.shift_status === 'ON_BREAK').length;
  const tamperAlerts = team.filter((m) => m.has_tamper_alert).length;

  const statusColor = (s: string) => {
    if (s === 'CHECKED_IN') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
    if (s === 'ON_BREAK') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (s === 'CHECKED_OUT') return 'bg-slate-700/40 text-slate-400 border-slate-600/30';
    return 'bg-slate-800/30 text-slate-500 border-slate-700/20';
  };

  const statusLabel = (m: LiveTeamMember) => {
    if (m.shift_status === 'CHECKED_IN') return m.is_moving ? 'Moving' : 'Stationary';
    if (m.shift_status === 'ON_BREAK') return 'Break';
    if (m.shift_status === 'CHECKED_OUT') return 'Done';
    return 'Off';
  };

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">Overview</h1>
        <div className="flex items-center gap-1.5">
          <button onClick={fetchLiveTeam} className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-white transition" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link href="/dashboard/live-map" className="px-2.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-[11px] flex items-center gap-1 transition">
            <MapPin className="w-3 h-3" /> Map
          </Link>
        </div>
      </div>

      {/* Stats — 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Enrolled', value: totalEmployees, icon: Users, color: 'text-slate-300' },
          { label: 'On Duty', value: checkedIn, icon: MapPin, color: 'text-emerald-400' },
          { label: 'On Break', value: onBreak, icon: Coffee, color: 'text-amber-400' },
          { label: 'Alerts', value: tamperAlerts, icon: AlertTriangle, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="dashboard-card p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#6B7280] uppercase tracking-wide font-medium">{stat.label}</span>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <p className={`text-lg md:text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Mobile Card List ─── */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold dashboard-strong">Field Team</span>
          <Link href="/dashboard/live-map" className="text-[10px] text-emerald-400 flex items-center gap-0.5">
            Map <ArrowUpRight className="w-2.5 h-2.5" />
          </Link>
        </div>
        {team.map((m) => (
          <div key={m.user_id} className="dashboard-card rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px] shrink-0">
                  {m.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs dashboard-strong truncate">{m.full_name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{m.designation}</p>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${statusColor(m.shift_status)}`}>
                {statusLabel(m)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-[#6B7280] mt-2 pt-2 border-t border-slate-800/50">
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" />
                <span className="font-medium text-slate-300">{m.battery_level ?? '—'}%</span>
              </div>
              <div className="truncate">{m.current_location?.address_name?.split(',')[0] || 'GPS...'}</div>
              <div className="text-right">
                <Link href={`/dashboard/routes?user_id=${m.user_id}`} className="text-emerald-400 font-medium">Trail →</Link>
              </div>
            </div>
          </div>
        ))}
        {team.length === 0 && !loading && (
          <p className="text-center text-[#6B7280] text-[11px] py-8">No field employees enrolled yet.</p>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Field Team Roster</span>
          <Link href="/dashboard/live-map" className="text-[10px] font-medium text-emerald-400 hover:text-white flex items-center gap-1 transition">
            Interactive Map <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-3 py-2">Representative</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Battery</th>
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {team.map((m) => (
                <tr key={m.user_id} className="hover:bg-slate-800/20 transition">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px]">
                        {m.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold dashboard-strong leading-tight">{m.full_name}</p>
                        <p className="text-[10px] text-[#6B7280]">{m.department_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor(m.shift_status)}`}>
                      {m.shift_status === 'CHECKED_IN' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {statusLabel(m)}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[160px]">
                    <p className="truncate text-slate-300 text-[11px]">{m.current_location?.address_name || 'Acquiring GPS'}</p>
                    {(m.dwell_minutes ?? 0) > 0 && <p className="text-[10px] text-[#6B7280]">{m.dwell_minutes}m dwell</p>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-bold text-emerald-400 tabular-nums text-[11px]">{m.battery_level ?? '—'}%</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-400">{m.device_model}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/dashboard/routes?user_id=${m.user_id}`} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-200 transition">
                      Trail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
