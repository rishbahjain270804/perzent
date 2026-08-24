'use client';
import { useState, useEffect } from 'react';
import {
  Route,
  MapPin,
  Play,
  Pause,
  Clock,
  Coffee,
  RefreshCw,
} from 'lucide-react';
import { DailyRoutePlayback } from '@perzent/shared-types';

export default function RoutePlaybackPage() {
  const [selectedUser, setSelectedUser] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [playback, setPlayback] = useState<DailyRoutePlayback | null>(null);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 15);
  const minDateStr = minDate.toISOString().split('T')[0];
  const maxDateStr = new Date().toISOString().split('T')[0];

  const fetchRoute = () => {
    if (!selectedUser) return;
    setLoading(true);
    fetch(`/api/routes?user_id=${selectedUser}&date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        setPlayback(data);
        setTimelineIndex(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data);
          setSelectedUser((current) => current || data[0]?.id || '');
        }
      });
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [selectedUser, selectedDate]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && playback?.waypoints?.length) {
      timer = setInterval(() => {
        setTimelineIndex((prev) => {
          if (prev >= playback.waypoints.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playback]);

  const currentWpt = playback?.waypoints?.[timelineIndex];

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">15-Day Route Playback & Dwell Stops</h1>
          <p className="text-[10px] md:text-[11px] text-[#6B7280]">
            Recorded GPS breadcrumbs • Dwell time analysis • Daily route history
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-700 bg-[#0B1120] text-xs text-white focus:outline-none focus:border-[#16A34A]"
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.full_name}</option>
            ))}
          </select>

          <input
            type="date"
            min={minDateStr}
            max={maxDateStr}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1.5 rounded border border-slate-700 bg-[#0B1120] text-xs text-white focus:outline-none focus:border-[#16A34A]"
          />
        </div>
      </div>

      {/* 4-Cell Metric Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-[#6B7280] text-[10px] uppercase font-semibold">Total Distance</span>
          <p className="text-lg md:text-xl font-bold dashboard-strong mt-0.5 tabular-nums">
            {playback?.total_distance_km ? `${playback.total_distance_km.toFixed(1)} km` : '0.0 km'}
          </p>
          <span className="text-[10px] text-[#6B7280]">Traversed route</span>
        </div>

        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-emerald-400 text-[10px] uppercase font-semibold">Dwell Stops</span>
          <p className="text-lg md:text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">
            {playback?.stops?.length || 0}
          </p>
          <span className="text-[10px] text-[#6B7280]">&gt;2 min duration stops</span>
        </div>

        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-blue-400 text-[10px] uppercase font-semibold">GPS Waypoints</span>
          <p className="text-lg md:text-xl font-bold text-blue-400 mt-0.5 tabular-nums">
            {playback?.waypoints?.length || 0}
          </p>
          <span className="text-[10px] text-[#6B7280]">Recorded pings</span>
        </div>

        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-amber-400 text-[10px] uppercase font-semibold">Retention</span>
          <p className="text-lg md:text-xl font-bold text-amber-400 mt-0.5 tabular-nums">15 Days</p>
          <span className="text-[10px] text-[#6B7280]">Rolling window</span>
        </div>
      </div>

      {/* Route Scrubber Bar */}
      <div className="p-3 rounded-lg dashboard-card space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center gap-1.5 transition"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Pause' : 'Play Route'}
            </button>
            <span className="text-slate-300 font-mono text-[11px]">
              {currentWpt ? new Date(currentWpt.recorded_at).toLocaleTimeString() : '00:00:00'}
            </span>
          </div>

          <span className="text-[#6B7280] text-[10px] md:text-[11px] font-mono">
            {timelineIndex + 1} / {playback?.waypoints?.length || 0} pts
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={Math.max(0, (playback?.waypoints?.length || 1) - 1)}
          value={timelineIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setTimelineIndex(parseInt(e.target.value));
          }}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#16A34A]"
        />
      </div>

      {/* ─── Mobile Stops Cards ─── */}
      <div className="md:hidden space-y-2">
        <span className="font-semibold text-xs dashboard-strong">Dwell Stops ({playback?.stops?.length || 0})</span>
        {playback?.stops?.map((stop, idx) => (
          <div key={stop.id || idx} className="dashboard-card rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-400 font-mono">Stop #{idx + 1}</span>
              <span className="font-bold text-xs dashboard-strong">{stop.duration_minutes} mins</span>
            </div>
            <p className="font-semibold text-xs dashboard-strong">{stop.address_name || 'Client Location'}</p>
            <div className="flex justify-between text-[10px] text-[#6B7280] pt-1 border-t border-slate-800/60 font-mono">
              <span>{new Date(stop.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(stop.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>{stop.latitude.toFixed(3)}°, {stop.longitude.toFixed(3)}°</span>
            </div>
          </div>
        ))}
        {(!playback?.stops || playback.stops.length === 0) && (
          <p className="text-center text-[#6B7280] text-[11px] py-6">No dwell stops recorded for this date.</p>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Dwell Stops & Client Locations</span>
          <span className="text-[11px] text-[#6B7280]">
            {playback?.stops?.length || 0} recorded stops on {selectedDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-3 py-2">Stop #</th>
                <th className="px-3 py-2">Location / Client Site</th>
                <th className="px-3 py-2">Arrival</th>
                <th className="px-3 py-2">Departure</th>
                <th className="px-3 py-2">Dwell Duration</th>
                <th className="px-3 py-2 text-right">GPS Coordinates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {playback?.stops?.map((stop, idx) => (
                <tr key={stop.id || idx} className="hover:bg-slate-800/20 transition">
                  <td className="px-3 py-2 font-mono font-bold text-emerald-400">
                    #{idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold dashboard-strong leading-tight">{stop.address_name || 'Client Site'}</p>
                    <p className="text-[10px] text-[#6B7280] leading-tight">Verified Stationary Pin</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                    {new Date(stop.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                    {new Date(stop.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 font-mono font-bold dashboard-strong">
                    {stop.duration_minutes} mins
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-slate-400">
                    {stop.latitude.toFixed(4)}° N, {stop.longitude.toFixed(4)}° E
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
