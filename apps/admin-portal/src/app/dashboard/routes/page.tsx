'use client';
import { useState, useEffect } from 'react';
import {
  Route,
  MapPin,
  Play,
  Pause,
  Clock,
  Coffee,
  Info,
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
    if (isPlaying && playback?.waypoints.length) {
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

  const currentWpt = playback?.waypoints[timelineIndex];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950 border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Route className="w-6 h-6 text-[#16A34A]" /> 15-Day Route Playback Visualizer
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Minute-by-minute timeline scrubber with dwell stop durations & road-snapped polylines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#6B7280] mb-1">Select Employee</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#16A34A]"
            >
              <option value="user-amit-employee">Amit Kumar (Sales Exec)</option>
              <option value="user-sneha-employee">Sneha Patel (Client Officer)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[#6B7280] mb-1">
              Date (Max 15-Day History)
            </label>
            <input
              type="date"
              min={minDateStr}
              max={maxDateStr}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#16A34A]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/25 text-xs text-[#86EFAC]">
        <Info className="w-4 h-4 text-[#16A34A] shrink-0" />
        <span>
          <strong className="text-white">Free Tier Policy:</strong> Route GPS trajectories and dwell stops are retained for 15 days. Older dates are automatically pruned by the 02:00 AM daily maintenance worker.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <div className="lg:col-span-2 rounded-2xl bg-slate-950 border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between z-10">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs backdrop-blur">
              <span className="text-[#6B7280]">Total Distance:</span>{' '}
              <strong className="text-white">{playback?.total_distance_km || 14.8} km</strong>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs backdrop-blur flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
              <span>Speed: {currentWpt?.speed || 0} km/h</span>
            </div>
          </div>

          <div className="relative w-full h-full flex flex-col items-center justify-center my-6">
            <div className="w-4/5 h-1 bg-gradient-to-r from-emerald-500 via-[#16A34A] to-green-400 rounded-full relative my-8">
              {playback?.stops.map((stop, i) => {
                const percent = (i / Math.max(1, (playback.stops.length || 1) - 1)) * 100;
                return (
                  <div
                    key={stop.id}
                    style={{ left: `${percent}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white font-extrabold text-[10px] flex items-center justify-center shadow-lg shadow-green-600/50 border-2 border-white">
                      {i + 1}
                    </div>
                    <div className="mt-2 p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-[10px] text-slate-200 whitespace-nowrap shadow-xl">
                      <p className="font-bold text-white">{stop.address_name}</p>
                      <p className="text-[#86EFAC]">Dwell: {stop.duration_minutes} mins</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="z-10 bg-slate-900/95 border border-slate-700 p-4 rounded-xl space-y-3 backdrop-blur">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center justify-center transition shadow-md shadow-green-600/30"
                >
                  {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <span className="font-semibold text-white">Playback Timeline</span>
              </div>
              <span className="text-[#6B7280]">
                Waypoint {timelineIndex + 1} of {playback?.waypoints.length || 1}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={(playback?.waypoints.length || 1) - 1}
              value={timelineIndex}
              onChange={(e) => {
                setTimelineIndex(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#16A34A]"
            />
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden">
          <h3 className="font-bold text-sm text-white mb-3 px-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#16A34A]" /> Dwell Stops & Locations ({playback?.stops.length || 0})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {playback?.stops.map((stop, index) => (
              <div key={stop.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-md bg-[#16A34A]/20 text-[#86EFAC] font-bold text-[10px] flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-bold text-white text-sm truncate">{stop.address_name}</span>
                </div>
                <div className="space-y-1 text-[#6B7280] text-[11px]">
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                    {new Date(stop.start_time).toLocaleTimeString()} - {new Date(stop.end_time).toLocaleTimeString()}
                  </p>
                  <p className="text-[#86EFAC] font-semibold">Stay Duration: {stop.duration_minutes} minutes</p>
                </div>
              </div>
            ))}

            {playback?.break_intervals.map((b, i) => (
              <div key={i} className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs">
                <p className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
                  <Coffee className="w-3.5 h-3.5" /> Lunch Break (Personal Time)
                </p>
                <p className="text-[11px] text-[#6B7280]">Duration: {b.duration_minutes} mins (Tracking Paused)</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
