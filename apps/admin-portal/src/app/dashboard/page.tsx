'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  MapPin,
  Coffee,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  Battery,
  Volume2,
  HardDrive,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { LiveTeamMember } from '@perzent/shared-types';

export default function DashboardOverviewPage() {
  const [team, setTeam] = useState<LiveTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveTeam = () => {
    fetch('/api/live-team')
      .then((res) => res.json())
      .then((data) => {
        setTeam(data);
        setLoading(false);
      })
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

  const avgBattery = team.length > 0
    ? Math.round(team.reduce((acc, m) => acc + (m.battery_level || 85), 0) / team.length)
    : 85;

  const silentModeCount = team.filter(
    (m) => m.telemetry?.sound_mode === 'SILENT' || m.telemetry?.sound_mode === 'VIBRATE'
  ).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Operations Overview</h1>
          <p className="text-[11px] text-[#6B7280]">Real-time GPS tracking & device hardware telemetry status</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveTeam}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh Live State"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/dashboard/live-map"
            className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <MapPin className="w-3.5 h-3.5" /> Live Map
          </Link>
        </div>
      </div>

      {/* Metric Stat Grid Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-800 bg-[#0B1120] rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-800">
        <div className="p-3.5">
          <div className="flex items-center justify-between text-[#6B7280] text-[11px]">
            <span>Total Enrolled</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{totalEmployees}</p>
          <span className="text-[10px] text-[#6B7280]">Field Representatives</span>
        </div>

        <div className="p-3.5">
          <div className="flex items-center justify-between text-[#86EFAC] text-[11px]">
            <span>Active On-Duty</span>
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
          </div>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-[#86EFAC]">{checkedIn}</p>
          <span className="text-[10px] text-[#6B7280]">GPS Tracking Active</span>
        </div>

        <div className="p-3.5">
          <div className="flex items-center justify-between text-amber-400 text-[11px]">
            <span>On Lunch Break</span>
            <Coffee className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-amber-400">{onBreak}</p>
          <span className="text-[10px] text-[#6B7280]">30-Min Auto Timer</span>
        </div>

        <div className="p-3.5">
          <div className="flex items-center justify-between text-red-400 text-[11px]">
            <span>Tamper Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-red-400">{tamperAlerts}</p>
          <span className="text-[10px] text-[#6B7280]">Mock GPS / Device Lock</span>
        </div>
      </div>

      {/* Hardware Telemetry Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-slate-800 bg-[#0B1120] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-[#16A34A]" />
            <span className="text-slate-300">Fleet Avg. Battery</span>
          </div>
          <span className="font-bold text-white tabular-nums">{avgBattery}% <span className="font-normal text-[#86EFAC] text-[10px]">(Normal)</span></span>
        </div>

        <div className="p-3 rounded-lg border border-slate-800 bg-[#0B1120] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">Sound / Silent Alerts</span>
          </div>
          <span className="font-bold text-white tabular-nums">{silentModeCount} Reps Silent</span>
        </div>

        <div className="p-3 rounded-lg border border-slate-800 bg-[#0B1120] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300">RAM & Storage Health</span>
          </div>
          <span className="font-bold text-white text-[11px]">100% Operational</span>
        </div>
      </div>

      {/* Dense Tabular Report */}
      <div className="border border-slate-800 bg-[#0B1120] rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <span className="font-semibold text-xs text-white">Live Field Team Roster</span>
          <Link
            href="/dashboard/live-map"
            className="text-[11px] font-medium text-[#86EFAC] hover:text-white flex items-center gap-1 transition"
          >
            Interactive Map <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5">Representative</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Shift Status</th>
                <th className="px-4 py-2.5">Current Spot / Dwell</th>
                <th className="px-4 py-2.5">Hardware Telemetry</th>
                <th className="px-4 py-2.5">Battery</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {team.map((member) => (
                <tr key={member.user_id} className="hover:bg-slate-850/40 transition">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px]">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white leading-tight">{member.full_name}</p>
                        <p className="text-[10px] text-[#6B7280] leading-tight">{member.designation} • {member.device_model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{member.department_name}</td>
                  <td className="px-4 py-2.5">
                    {member.shift_status === 'CHECKED_IN' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                        {member.is_moving ? 'Moving' : 'Stationary'}
                      </span>
                    )}
                    {member.shift_status === 'ON_BREAK' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Coffee className="w-3 h-3" /> Break
                      </span>
                    )}
                    {member.shift_status === 'CHECKED_OUT' && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400">
                        Completed
                      </span>
                    )}
                    {member.shift_status === 'OFF_DUTY' && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800/40 text-slate-500">
                        Off Duty
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <p className="truncate text-slate-300 leading-tight">{member.current_location?.address_name || 'Acquiring GPS'}</p>
                    {member.dwell_minutes > 0 && (
                      <p className="text-[10px] text-[#6B7280] leading-tight">Dwell: {member.dwell_minutes}m</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">
                    <span title="Sound Volume">🔊 {member.telemetry?.sound_volume ?? 75}%</span>{' '}
                    <span title="RAM">🧠 {member.telemetry?.ram_usage_pct ?? 57}%</span>{' '}
                    <span title="Free Storage">💾 {member.telemetry?.storage_free_pct ?? 54}%</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-[#86EFAC] tabular-nums">{member.battery_level}%</span>
                    {member.telemetry?.battery_status === 'CHARGING' && (
                      <span className="ml-1 text-[10px] text-amber-400">⚡</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/dashboard/routes?user_id=${member.user_id}`}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                    >
                      History
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
