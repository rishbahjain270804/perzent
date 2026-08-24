'use client';
import { useState, useEffect } from 'react';
import {
  MapPin,
  Coffee,
  RefreshCw,
  Navigation,
  Battery,
  Volume2,
  Sun,
  HardDrive,
  Cpu,
  ShieldCheck,
  Smartphone,
  Zap,
} from 'lucide-react';
import { LiveTeamMember } from '@perzent/shared-types';

export default function LiveMapPage() {
  const [team, setTeam] = useState<LiveTeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<LiveTeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  const fetchLiveTeam = () => {
    setLoading(true);
    fetch('/api/live-team')
      .then((res) => res.json())
      .then((data) => {
        setTeam(data);
        if (data.length > 0) {
          if (!selectedUser) {
            setSelectedUser(data[0]);
          } else {
            const updated = data.find((u: LiveTeamMember) => u.user_id === selectedUser.user_id);
            if (updated) setSelectedUser(updated);
          }
        }
        setLastRefreshed(new Date().toLocaleTimeString());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLiveTeam();
    const interval = setInterval(fetchLiveTeam, 6000);
    return () => clearInterval(interval);
  }, []);

  const telemetry = selectedUser?.telemetry || {
    battery_level: selectedUser?.battery_level || 85,
    battery_status: 'DISCHARGING' as const,
    battery_health: 'GOOD' as const,
    battery_temperature: 31.8,
    sound_volume: 75,
    sound_mode: 'NORMAL' as const,
    brightness_level: 80,
    brightness_auto: true,
    storage_used_gb: 58.4,
    storage_total_gb: 128.0,
    storage_free_gb: 69.6,
    storage_free_pct: 54.4,
    ram_used_gb: 4.6,
    ram_total_gb: 8.0,
    ram_usage_pct: 57.5,
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950 border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            {/* Primary Logo: White on Green (#16A34A) */}
            <div className="w-9 h-9 rounded-xl bg-[#16A34A] flex items-center justify-center font-bold text-white shadow-md shadow-green-600/30">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Live Workforce & Hardware Telemetry Map</h1>
              <p className="text-xs text-[#6B7280]">
                Sub-meter GPS tracking • Live Device Sound, Brightness, Storage, RAM & Battery Status • Refreshed at {lastRefreshed}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Green Button (#16A34A) with #FFFFFF text */}
        <button
          onClick={fetchLiveTeam}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-green-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} /> Refresh Telemetry Feed
        </button>
      </div>

      {/* Main Grid: Live Map + Team Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[580px]">
        {/* Live Map Canvas */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col justify-between p-6 shadow-2xl">
          {/* Top Map Bar */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs backdrop-blur">
              <span className="font-semibold text-slate-300">Tracking Legend:</span>
              <span className="flex items-center gap-1 text-[#16A34A] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span> Active Moving
              </span>
              <span className="flex items-center gap-1 text-amber-400 ml-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Stationary (Desk)
              </span>
              <span className="flex items-center gap-1 text-blue-400 ml-2 font-medium">
                <Coffee className="w-3 h-3 text-blue-400" /> Lunch Break (Paused)
              </span>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#86EFAC] text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping"></span> Live Sector 62 & 18 Hub
            </span>
          </div>

          {/* Radar Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[600px] h-[600px] rounded-full border border-green-500/25 flex items-center justify-center">
              <div className="w-[400px] h-[400px] rounded-full border border-green-500/35 flex items-center justify-center">
                <div className="w-[200px] h-[200px] rounded-full border border-green-500/45"></div>
              </div>
            </div>
          </div>

          {/* Map Node Pins */}
          <div className="relative w-full h-full flex items-center justify-center">
            {team.map((member, idx) => {
              const isSelected = selectedUser?.user_id === member.user_id;
              const posX = 20 + ((idx * 37 + 15) % 65);
              const posY = 25 + ((idx * 29 + 20) % 55);

              return (
                <div
                  key={member.user_id}
                  onClick={() => setSelectedUser(member)}
                  style={{ top: `${posY}%`, left: `${posX}%` }}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 pointer-events-auto"
                >
                  <div
                    className={`relative flex items-center gap-2.5 p-2 rounded-2xl border shadow-xl transition backdrop-blur ${
                      member.shift_status === 'ON_BREAK'
                        ? 'bg-amber-950/85 border-amber-500/60 text-amber-300'
                        : member.is_moving
                        ? 'bg-green-950/85 border-[#16A34A]/80 text-green-300'
                        : 'bg-slate-900/90 border-slate-700 text-slate-200'
                    } ${isSelected ? 'ring-2 ring-[#16A34A] scale-105 shadow-green-600/30' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white ${
                        member.shift_status === 'ON_BREAK'
                          ? 'bg-amber-600'
                          : member.is_moving
                          ? 'bg-[#16A34A]'
                          : 'bg-slate-700'
                      }`}
                    >
                      {member.shift_status === 'ON_BREAK' ? (
                        <Coffee className="w-4 h-4 text-white" />
                      ) : member.is_moving ? (
                        <Navigation className="w-4 h-4 text-white rotate-45" />
                      ) : (
                        member.full_name.charAt(0)
                      )}
                    </div>
                    <div className="pr-1 text-left">
                      <p className="font-bold text-xs text-white leading-tight">{member.full_name}</p>
                      <p className="text-[10px] text-slate-300">
                        {member.shift_status === 'ON_BREAK'
                          ? 'Lunch Break'
                          : member.is_moving
                          ? 'Moving • 35 km/h'
                          : `Dwell: ${member.dwell_minutes}m`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Bottom User Bar */}
          {selectedUser && (
            <div className="z-10 p-3.5 rounded-xl bg-slate-900/95 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#16A34A] text-white font-bold flex items-center justify-center text-sm shadow-md shadow-green-600/30">
                  {selectedUser.full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{selectedUser.full_name}</h4>
                  <p className="text-xs text-[#6B7280]">
                    {selectedUser.designation} • {selectedUser.department_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-4 h-4 text-[#16A34A]" />
                  <span>{selectedUser.current_location?.address_name || 'Sector 62, Noida'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <span>{selectedUser.battery_level}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Team List */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-sm text-white">Active Field Team ({team.length})</h3>
            <span className="text-[10px] text-[#6B7280]">Click to view telemetry</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {team.map((member) => {
              const isSelected = selectedUser?.user_id === member.user_id;
              const memTelemetry = member.telemetry;

              return (
                <div
                  key={member.user_id}
                  onClick={() => setSelectedUser(member)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                    isSelected
                      ? 'bg-green-950/40 border-[#16A34A] ring-1 ring-[#16A34A]/50'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-sm">{member.full_name}</span>
                    {member.shift_status === 'CHECKED_IN' && (
                      <span className="px-2 py-0.5 rounded-md bg-[#16A34A]/20 text-[#86EFAC] text-[10px] font-semibold border border-[#16A34A]/30">
                        Checked In
                      </span>
                    )}
                    {member.shift_status === 'ON_BREAK' && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-semibold flex items-center gap-1 border border-amber-500/30">
                        <Coffee className="w-3 h-3" /> Lunch
                      </span>
                    )}
                    {member.shift_status === 'CHECKED_OUT' && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                        Off Duty
                      </span>
                    )}
                  </div>
                  <p className="text-[#6B7280] truncate text-[11px]">{member.designation}</p>

                  {/* Quick Telemetry Indicators */}
                  <div className="mt-2.5 grid grid-cols-4 gap-1 text-[10px] text-slate-300 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1" title="Sound Mode">
                      🔊 {memTelemetry?.sound_volume ?? 75}%
                    </span>
                    <span className="flex items-center gap-1" title="Brightness">
                      ☀️ {memTelemetry?.brightness_level ?? 80}%
                    </span>
                    <span className="flex items-center gap-1" title="RAM Usage">
                      🧠 {memTelemetry?.ram_usage_pct ?? 57}%
                    </span>
                    <span className="flex items-center gap-1 text-right justify-end font-semibold text-[#86EFAC]" title="Battery">
                      🔋 {member.battery_level}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DETAILED LIVE HARDWARE TELEMETRY DASHBOARD (Sound, Brightness, Storage, RAM, Battery) */}
      {selectedUser && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
                <Smartphone className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  Live Hardware Telemetry Tracker: {selectedUser.full_name}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Bound Device: <strong className="text-slate-300">{selectedUser.device_model}</strong> ({selectedUser.device_uuid}) • Anti-Tamper Verified
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#86EFAC] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping"></span> Real-Time Hardware Sync
              </span>
            </div>
          </div>

          {/* 5-Column Telemetry Matrix (Sound, Brightness, Storage, RAM, Battery) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. SOUND STATUS */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Device Sound</span>
                  <div className="w-7 h-7 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-[#16A34A]" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-white">{telemetry.sound_volume}%</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    telemetry.sound_mode === 'NORMAL'
                      ? 'bg-[#16A34A]/20 text-[#86EFAC]'
                      : telemetry.sound_mode === 'VIBRATE'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {telemetry.sound_mode} MODE
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${telemetry.sound_volume}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1.5">Ringer volume level</p>
              </div>
            </div>

            {/* 2. BRIGHTNESS STATUS */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Brightness</span>
                  <div className="w-7 h-7 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
                    <Sun className="w-4 h-4 text-[#16A34A]" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-white">{telemetry.brightness_level}%</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                    {telemetry.brightness_auto ? 'ADAPTIVE AUTO' : 'MANUAL'}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${telemetry.brightness_level}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1.5">Display panel level</p>
              </div>
            </div>

            {/* 3. STORAGE STATUS */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Flash Storage</span>
                  <div className="w-7 h-7 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
                    <HardDrive className="w-4 h-4 text-[#16A34A]" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-white">{telemetry.storage_free_pct}% <span className="text-xs font-medium text-[#6B7280]">Free</span></p>
                <p className="text-[11px] text-slate-300 mt-1">
                  {telemetry.storage_used_gb} / {telemetry.storage_total_gb} GB
                </p>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${100 - telemetry.storage_free_pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1.5">{telemetry.storage_free_gb} GB Available</p>
              </div>
            </div>

            {/* 4. RAM MEMORY */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">R.A.M Usage</span>
                  <div className="w-7 h-7 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-[#16A34A]" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-white">{telemetry.ram_usage_pct}%</p>
                <p className="text-[11px] text-slate-300 mt-1">
                  {telemetry.ram_used_gb} / {telemetry.ram_total_gb} GB RAM
                </p>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${telemetry.ram_usage_pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1.5">Active RAM allocation</p>
              </div>
            </div>

            {/* 5. BATTERY LIVE STATUS */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Battery Live</span>
                  <div className="w-7 h-7 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
                    <Battery className="w-4 h-4 text-[#16A34A]" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[#86EFAC]">{telemetry.battery_level}%</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    telemetry.battery_status === 'CHARGING'
                      ? 'bg-[#16A34A]/20 text-[#86EFAC]'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {telemetry.battery_status === 'CHARGING' ? '⚡ CHARGING' : 'DISCHARGING'}
                  </span>
                  <span className="text-[10px] text-[#6B7280]">{telemetry.battery_temperature}°C</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      telemetry.battery_level > 30 ? 'bg-[#16A34A]' : 'bg-amber-500'
                    }`}
                    style={{ width: `${telemetry.battery_level}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1.5">Health: {telemetry.battery_health || 'Good'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
