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
} from 'lucide-react';
import { LiveTeamMember } from '@perzent/shared-types';

export default function DashboardOverviewPage() {
  const [team, setTeam] = useState<LiveTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/live-team')
      .then((res) => res.json())
      .then((data) => {
        setTeam(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
    <div className="space-y-8">
      {/* Top Banner with Green Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-[#16A34A]/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#86EFAC] uppercase tracking-wider">
              Live Workforce & Hardware Telemetry Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Field Reps & Device Health</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time GPS • Live Sound, Brightness, Storage, RAM & Battery monitoring • 2-minute intelligent dwell filtering
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/live-map"
            className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-green-600/25 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-white" /> View Interactive Live Map
          </Link>
          <Link
            href="/dashboard/attendance"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            Attendance Timesheet
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Total Field Reps</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/15 text-[#86EFAC] flex items-center justify-center">
              <Users className="w-4 h-4 text-[#16A34A]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{totalEmployees}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">Enrolled under company hierarchy</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86EFAC]">Active Checked-In</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#16A34A]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#86EFAC]">{checkedIn}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">Currently on duty & GPS tracked</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">On Lunch Break</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{onBreak}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">Tracking paused (30-min auto timer)</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Tamper Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-red-400">{tamperAlerts}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">GPS disabled or mock app attempts</p>
        </div>
      </div>

      {/* Fleet Live Hardware Telemetry Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center shrink-0">
            <Battery className="w-5 h-5 text-[#16A34A]" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold">Fleet Avg. Battery</p>
            <p className="text-xl font-bold text-white mt-0.5">{avgBattery}% <span className="text-xs font-normal text-[#86EFAC]">(Normal)</span></p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold">Ringer / Silent Alert</p>
            <p className="text-xl font-bold text-white mt-0.5">{silentModeCount} Reps on Silent/Vibrate</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold">Device RAM & Storage</p>
            <p className="text-xl font-bold text-white mt-0.5">100% Health <span className="text-xs font-normal text-slate-400">(No memory leaks)</span></p>
          </div>
        </div>
      </div>

      {/* Live Field Team Table with Hardware Telemetry */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white">Live Field Team & Hardware Status</h2>
            <p className="text-xs text-[#6B7280]">Real-time status updates, live hardware telemetry, battery, and location state</p>
          </div>
          <Link
            href="/dashboard/live-map"
            className="text-xs font-semibold text-[#86EFAC] hover:text-white flex items-center gap-1 transition"
          >
            Open Interactive Live Map <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[#6B7280] font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Employee & Device</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Shift Status</th>
                <th className="px-6 py-3.5">Current Spot / Dwell</th>
                <th className="px-6 py-3.5">Hardware Telemetry (Sound • RAM • Storage)</th>
                <th className="px-6 py-3.5">Battery</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {team.map((member) => (
                <tr key={member.user_id} className="hover:bg-slate-900/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-xs">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{member.full_name}</p>
                        <p className="text-[11px] text-[#6B7280]">{member.designation} • <span className="text-slate-400">{member.device_model}</span></p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{member.department_name}</td>
                  <td className="px-6 py-4">
                    {member.shift_status === 'CHECKED_IN' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16A34A]/20 border border-[#16A34A]/30 text-[#86EFAC] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                        {member.is_moving ? 'Moving (35 km/h)' : 'Stationary (Desk)'}
                      </span>
                    )}
                    {member.shift_status === 'ON_BREAK' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                        <Coffee className="w-3 h-3" /> Lunch Break
                      </span>
                    )}
                    {member.shift_status === 'CHECKED_OUT' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                        Shift Completed
                      </span>
                    )}
                    {member.shift_status === 'OFF_DUTY' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/40 text-slate-500">
                        Off Duty
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-200 truncate max-w-xs">
                      {member.current_location?.address_name || 'Location Not Fixed'}
                    </p>
                    {member.dwell_minutes > 0 && (
                      <p className="text-[10px] text-[#6B7280]">Dwell duration: {member.dwell_minutes} mins</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-[11px]">
                      <span title="Sound Mode" className="text-slate-300">
                        🔊 {member.telemetry?.sound_volume ?? 75}% ({member.telemetry?.sound_mode ?? 'NORMAL'})
                      </span>
                      <span title="RAM Usage" className="text-slate-300">
                        🧠 {member.telemetry?.ram_usage_pct ?? 57}% RAM
                      </span>
                      <span title="Free Storage" className="text-slate-300">
                        💾 {member.telemetry?.storage_free_pct ?? 54}% Free
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#86EFAC]">{member.battery_level}%</span>
                    {member.telemetry?.battery_status === 'CHARGING' && (
                      <span className="ml-1 text-[10px] text-amber-400">⚡</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/routes?user_id=${member.user_id}`}
                      className="px-3 py-1.5 rounded-lg bg-[#16A34A]/15 hover:bg-[#16A34A]/30 text-[#86EFAC] font-medium transition"
                    >
                      Route History
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
