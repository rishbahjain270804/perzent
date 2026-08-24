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
  Smartphone,
  CheckCircle2,
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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Live Fleet Map & Device Matrix</h1>
          <p className="text-[11px] text-[#6B7280]">
            Continuous GPS coordinates • Live Sound, Brightness, Storage, RAM & Battery telemetry • Updated {lastRefreshed}
          </p>
        </div>
        <button
          onClick={fetchLiveTeam}
          disabled={loading}
          className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition inline-flex items-center gap-1 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Main Grid: Map & Telemetry Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Left 2 Cols: Interactive Map Simulation */}
        <div className="lg:col-span-2 border border-slate-800 bg-[#0B1120] rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Live Field Position Canvas</span>
            {selectedUser && (
              <span className="text-[#86EFAC] font-mono text-[11px]">
                {selectedUser.current_location?.latitude.toFixed(4)}° N, {selectedUser.current_location?.longitude.toFixed(4)}° E
              </span>
            )}
          </div>

          <div className="flex-1 bg-slate-950 p-4 relative flex flex-col justify-between">
            {/* Map Grid Visualization */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

            {/* Selected Representative Pin Box */}
            {selectedUser && (
              <div className="relative z-10 max-w-sm p-3 rounded border border-slate-800 bg-[#0B1120]/95 space-y-1.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{selectedUser.full_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                    {selectedUser.shift_status === 'CHECKED_IN' ? 'On Duty' : 'On Break'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                  {selectedUser.current_location?.address_name || 'Delhi NCR Region'}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-[#6B7280] font-mono pt-1 border-t border-slate-800">
                  <span>Dwell: {selectedUser.dwell_minutes}m</span>
                  <span>Accuracy: ±4.2m</span>
                  <span>Battery: {selectedUser.battery_level}%</span>
                </div>
              </div>
            )}

            {/* Team Position Markers Strip */}
            <div className="relative z-10 grid grid-cols-3 gap-2 mt-auto pt-4">
              {team.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => setSelectedUser(m)}
                  className={`p-2 rounded border text-left text-xs transition ${
                    selectedUser?.user_id === m.user_id
                      ? 'border-[#16A34A] bg-[#16A34A]/10 text-white'
                      : 'border-slate-800 bg-[#0B1120] text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-semibold truncate">{m.full_name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{m.current_location?.address_name || 'En Route'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Selected User Hardware Matrix */}
        <div className="border border-slate-800 bg-[#0B1120] rounded-lg p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-white">{selectedUser?.full_name || 'Device Diagnostics'}</h3>
                <p className="text-[10px] text-[#6B7280] font-mono">{selectedUser?.device_model || 'Android Telemetry'}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                {selectedUser?.department_name}
              </span>
            </div>

            {/* Hardware Metrics Table / Grid */}
            <div className="space-y-3 pt-3 text-xs">
              {/* Battery */}
              <div className="p-2.5 rounded border border-slate-800 bg-slate-900/50 space-y-1">
                <div className="flex justify-between items-center text-[#6B7280] text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Battery className="w-3.5 h-3.5 text-[#16A34A]" /> Battery Status
                  </span>
                  <span className="font-mono text-[#86EFAC] font-bold">{telemetry.battery_level}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-[#6B7280] font-mono">
                  <span>State: {telemetry.battery_status}</span>
                  <span>Temp: {telemetry.battery_temperature}°C</span>
                  <span>Health: {telemetry.battery_health}</span>
                </div>
              </div>

              {/* Sound & Ringer */}
              <div className="p-2.5 rounded border border-slate-800 bg-slate-900/50 space-y-1">
                <div className="flex justify-between items-center text-[#6B7280] text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Device Sound
                  </span>
                  <span className="font-mono text-white font-bold">{telemetry.sound_volume}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-[#6B7280] font-mono">
                  <span>Mode: {telemetry.sound_mode}</span>
                  <span>Ringer: Active</span>
                </div>
              </div>

              {/* RAM Usage */}
              <div className="p-2.5 rounded border border-slate-800 bg-slate-900/50 space-y-1">
                <div className="flex justify-between items-center text-[#6B7280] text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" /> R.A.M Pressure
                  </span>
                  <span className="font-mono text-white font-bold">{telemetry.ram_usage_pct}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-[#6B7280] font-mono">
                  <span>Used: {telemetry.ram_used_gb} GB</span>
                  <span>Total: {telemetry.ram_total_gb} GB</span>
                </div>
              </div>

              {/* Storage */}
              <div className="p-2.5 rounded border border-slate-800 bg-slate-900/50 space-y-1">
                <div className="flex justify-between items-center text-[#6B7280] text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Internal Storage
                  </span>
                  <span className="font-mono text-white font-bold">{telemetry.storage_free_pct}% Free</span>
                </div>
                <div className="flex justify-between text-[10px] text-[#6B7280] font-mono">
                  <span>Used: {telemetry.storage_used_gb} GB</span>
                  <span>Free: {telemetry.storage_free_gb} GB</span>
                </div>
              </div>

              {/* Brightness */}
              <div className="p-2.5 rounded border border-slate-800 bg-slate-900/50 space-y-1">
                <div className="flex justify-between items-center text-[#6B7280] text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Sun className="w-3.5 h-3.5 text-amber-300" /> Display Brightness
                  </span>
                  <span className="font-mono text-white font-bold">{telemetry.brightness_level}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-[#6B7280] font-mono">
                  <span>Auto-Adaptive: {telemetry.brightness_auto ? 'Yes' : 'No'}</span>
                  <span>Anti-Glance: Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[10px] text-[#6B7280] flex items-center justify-between">
            <span>Hardware Lock ID:</span>
            <span className="font-mono text-slate-300">{selectedUser?.device_uuid ? `${selectedUser.device_uuid.slice(0, 12)}...` : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
