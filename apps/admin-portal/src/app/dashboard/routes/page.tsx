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
  const [selectedUser, setSelectedUser] = useState('user-amit-employee');
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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">15-Day Route Playback & Dwell Stops</h1>
          <p className="text-[11px] text-[#6B7280]">
            Road-snapped breadcrumbs • Dwell time analysis • 2-minute GPS waypoints
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-800 bg-[#0B1120] text-xs text-white focus:outline-none focus:border-[#16A34A]"
          >
            <option value="user-amit-employee">Amit Patel (North Region)</option>
            <option value="user-sneha-employee">Sneha Roy (East Region)</option>
            <option value="user-vikram-employee">Vikram Singh (West Region)</option>
          </select>

          <input
            type="date"
            min={minDateStr}
            max={maxDateStr}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-800 bg-[#0B1120] text-xs text-white focus:outline-none focus:border-[#16A34A]"
          />
        </div>
      </div>

      {/* 4-Cell Metric Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-800 bg-[#0B1120] rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-800">
        <div className="p-3.5">
          <span className="text-[#6B7280] text-[11px]">Total Distance</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">
            {playback?.total_distance_km ? `${playback.total_distance_km.toFixed(1)} km` : '0.0 km'}
          </p>
          <span className="text-[10px] text-[#6B7280]">Traversed route</span>
        </div>

        <div className="p-3.5">
          <span className="text-[#86EFAC] text-[11px]">Recorded Dwell Stops</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-[#86EFAC]">
            {playback?.stops?.length || 0}
          </p>
          <span className="text-[10px] text-[#6B7280]">&gt;2 min duration stops</span>
        </div>

        <div className="p-3.5">
          <span className="text-blue-400 text-[11px]">GPS Waypoints</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-blue-400">
            {playback?.waypoints?.length || 0}
          </p>
          <span className="text-[10px] text-[#6B7280]">2-minute pings</span>
        </div>

        <div className="p-3.5">
          <span className="text-amber-400 text-[11px]">History Retention</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-amber-400">15 Days</p>
          <span className="text-[10px] text-[#6B7280]">Rolling window</span>
        </div>
      </div>

      {/* Route Scrubber Bar */}
      <div className="p-3 rounded-lg border border-slate-800 bg-[#0B1120] space-y-2">
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

          <span className="text-[#6B7280] text-[11px] font-mono">
            {timelineIndex + 1} of {playback?.waypoints?.length || 0} points
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

      {/* Dense Tabular Dwell Stops Report */}
      <div className="border border-slate-800 bg-[#0B1120] rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <span className="font-semibold text-xs text-white">Dwell Stops & Client Locations</span>
          <span className="text-[11px] text-[#6B7280]">
            {playback?.stops?.length || 0} recorded stops on {selectedDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5">Stop #</th>
                <th className="px-4 py-2.5">Location / Client Site</th>
                <th className="px-4 py-2.5">Arrival</th>
                <th className="px-4 py-2.5">Departure</th>
                <th className="px-4 py-2.5">Dwell Duration</th>
                <th className="px-4 py-2.5 text-right">GPS Coordinates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {playback?.stops?.map((stop, idx) => (
                <tr key={stop.id || idx} className="hover:bg-slate-850/40 transition">
                  <td className="px-4 py-2.5 font-mono font-bold text-[#86EFAC]">
                    #{idx + 1}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-white leading-tight">{stop.address_name || 'Client Site'}</p>
                    <p className="text-[10px] text-[#6B7280] leading-tight">Verified Stationary Pin</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300">
                    {new Date(stop.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300">
                    {new Date(stop.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-white">
                    {stop.duration_minutes} mins
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[10px] text-slate-400">
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
