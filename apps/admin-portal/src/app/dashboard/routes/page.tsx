'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { LayerGroup, Map as LeafletMap, Marker } from 'leaflet';
import { Route, MapPin, Play, Pause, Clock, Coffee, RefreshCw, SkipBack, Users } from 'lucide-react';
import type { DailyRoutePlayback } from '@perzent/shared-types';
import { apiFetch, errorMessage, isAbortError, formatTime, todayInTimezone, shiftDate, isValidYmd } from '@/lib/client';
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  useSession,
  inputClass,
  labelClass,
  btnPrimary,
  btnSecondary,
  btnGhost,
  tableHeadRow,
  tableRow,
} from '@/components';

type Leaflet = typeof import('leaflet');

interface EmployeeOption {
  id: string;
  full_name: string;
  status?: string;
}

const PLAYBACK_STEP_MS = 700;

function tooltipNode(title: string, rows: Array<[string, string]>) {
  const card = document.createElement('div');
  card.className = 'perzent-map-hover-card';
  const heading = document.createElement('strong');
  heading.textContent = title;
  card.appendChild(heading);
  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    const key = document.createElement('span');
    const content = document.createElement('b');
    key.textContent = label;
    content.textContent = value;
    row.append(key, content);
    card.appendChild(row);
  });
  return card;
}

function RoutesInner() {
  const searchParams = useSearchParams();
  const paramUser = searchParams.get('user_id');
  const { session, loading: sessionLoading, error: sessionError, reload: reloadSession } = useSession();
  const timeZone = session?.company?.timezone;
  const retentionDays = session?.company?.route_retention_days ?? null;

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState('');
  const [selectedUser, setSelectedUser] = useState(paramUser || '');
  const [selectedDate, setSelectedDate] = useState('');
  const [playback, setPlayback] = useState<DailyRoutePlayback | null>(null);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const playbackMarkerRef = useRef<Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const today = todayInTimezone(timeZone);
  const minDate = retentionDays ? shiftDate(today, -retentionDays) : undefined;

  /* Default date = today in the COMPANY timezone (once we know it; fall back to local if auth fails). */
  useEffect(() => {
    if (selectedDate) return;
    if (session) setSelectedDate(todayInTimezone(session.company?.timezone));
    else if (sessionError) setSelectedDate(todayInTimezone());
  }, [session, sessionError, selectedDate]);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const data = await apiFetch<EmployeeOption[]>('/api/employees');
      const list = Array.isArray(data) ? data : [];
      setEmployees(list);
      setEmployeesError('');
      setSelectedUser((current) => current || list[0]?.id || '');
    } catch (reason) {
      setEmployeesError(errorMessage(reason, 'Could not load employees.'));
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    if (!selectedUser || !selectedDate) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setIsPlaying(false);
    apiFetch<DailyRoutePlayback>(`/api/routes?user_id=${encodeURIComponent(selectedUser)}&date=${selectedDate}`, { signal: controller.signal })
      .then((data) => {
        setPlayback(data);
        setTimelineIndex(0);
      })
      .catch((reason) => {
        if (isAbortError(reason)) return;
        setPlayback(null);
        setError(errorMessage(reason, 'Could not load this route.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedUser, selectedDate, reloadToken]);

  /* Playback timer */
  useEffect(() => {
    if (!isPlaying || !playback?.waypoints?.length) return;
    const timer = window.setInterval(() => {
      setTimelineIndex((previous) => {
        if (previous >= playback.waypoints.length - 1) {
          setIsPlaying(false);
          return previous;
        }
        return previous + 1;
      });
    }, PLAYBACK_STEP_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, playback]);

  /* Map bootstrap */
  useEffect(() => {
    let mounted = true;
    import('leaflet').then((leaflet) => {
      if (!mounted || !mapNodeRef.current || mapRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet.map(mapNodeRef.current, { zoomControl: false, attributionControl: true }).setView([22.8, 79.1], 5);
      leaflet.control.zoom({ position: 'bottomright' }).addTo(map);
      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' })
        .addTo(map);
      mapRef.current = map;
      layerRef.current = leaflet.layerGroup().addTo(map);
      setMapReady(true);
    });
    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
      playbackMarkerRef.current = null;
      setMapReady(false);
    };
  }, []);

  /* Draw the day: polyline, start/end, stops, playback marker */
  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!mapReady || !leaflet || !map || !layer) return;
    layer.clearLayers();
    playbackMarkerRef.current = null;
    if (!playback) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bounds: Array<[number, number]> = [];
    const positions = playback.waypoints.map((point) => [point.latitude, point.longitude] as [number, number]);
    positions.forEach((position) => bounds.push(position));

    if (positions.length > 1) {
      leaflet.polyline(positions, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(layer);
    }

    const endpoint = (index: number, color: string, title: string) => {
      const point = playback.waypoints[index];
      leaflet
        .circleMarker([point.latitude, point.longitude], { radius: 8, color, weight: 3, fillColor: color, fillOpacity: 0.95 })
        .addTo(layer)
        .bindTooltip(tooltipNode(title, [['Time', formatTime(point.recorded_at, timeZone)]]), {
          direction: 'top',
          offset: [0, -8],
          opacity: 1,
          className: 'perzent-leaflet-tooltip',
        });
    };
    if (playback.waypoints.length > 0) endpoint(0, '#16a34a', 'Shift started');
    if (playback.waypoints.length > 1) endpoint(playback.waypoints.length - 1, '#dc2626', 'Latest / final point');

    playback.stops.forEach((stop, index) => {
      leaflet
        .marker([stop.latitude, stop.longitude], {
          icon: leaflet.divIcon({ className: 'map-stop-marker', html: `<span class="map-stop-badge">${index + 1}</span>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
          zIndexOffset: 400,
        })
        .addTo(layer)
        .bindTooltip(
          tooltipNode(`Stop ${index + 1} · ${stop.duration_minutes} min`, [
            ['Place', stop.address_name || 'Address unavailable'],
            ['Arrived', formatTime(stop.start_time, timeZone)],
            ['Left', formatTime(stop.end_time, timeZone)],
          ]),
          { direction: 'top', offset: [0, -12], opacity: 1, className: 'perzent-leaflet-tooltip' }
        );
      bounds.push([stop.latitude, stop.longitude]);
    });

    if (playback.waypoints.length > 0) {
      const first = playback.waypoints[0];
      const marker = leaflet
        .marker([first.latitude, first.longitude], {
          icon: leaflet.divIcon({
            className: 'route-playback-marker',
            html: `<div class="route-playback-disc" style="transform: rotate(${Math.round(first.heading || 0)}deg)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          zIndexOffset: 1000,
        })
        .addTo(layer);
      playbackMarkerRef.current = marker;
    }

    if (bounds.length === 1) map.setView(bounds[0], 15, { animate: !reducedMotion });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: !reducedMotion });
  }, [playback, mapReady, timeZone]);

  /* Move the playback marker with the timeline */
  useEffect(() => {
    const marker = playbackMarkerRef.current;
    const map = mapRef.current;
    const point = playback?.waypoints?.[timelineIndex];
    if (!marker || !map || !point) return;
    marker.setLatLng([point.latitude, point.longitude]);
    const disc = marker.getElement()?.querySelector<HTMLElement>('.route-playback-disc');
    if (disc) disc.style.transform = `rotate(${Math.round(point.heading || 0)}deg)`;
    if (isPlaying) map.panInside([point.latitude, point.longitude], { padding: [60, 60] });
  }, [timelineIndex, playback, isPlaying]);

  const currentWpt = playback?.waypoints?.[timelineIndex];
  const hasRoute = !!playback && (playback.waypoints.length > 0 || playback.stops.length > 0);
  const totalBreakMinutes = playback?.break_intervals?.reduce((sum, interval) => sum + (interval.duration_minutes || 0), 0) || 0;

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Route playback"
        description={
          retentionDays
            ? `Recorded GPS points and dwell stops · kept for ${retentionDays} days (${timeZone})`
            : 'Recorded GPS points and dwell stops for one employee-day'
        }
        actions={
          <div className="flex flex-wrap items-end gap-1.5">
            <div>
              <label htmlFor="route_user" className="sr-only">Employee</label>
              <select id="route_user" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className={inputClass} disabled={employeesLoading}>
                {employees.length === 0 && <option value="">{employeesLoading ? 'Loading…' : 'No employees'}</option>}
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="route_date" className="sr-only">Date</label>
              <input
                id="route_date"
                type="date"
                min={minDate}
                max={today}
                value={selectedDate}
                onChange={(e) => isValidYmd(e.target.value) && setSelectedDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              onClick={() => setReloadToken((value) => value + 1)}
              disabled={loading || !selectedUser || !selectedDate}
              className={btnSecondary}
              title="Reload route"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <ErrorBanner message={sessionError} onRetry={reloadSession} retrying={sessionLoading} />
      <ErrorBanner message={employeesError} onRetry={loadEmployees} retrying={employeesLoading} />
      <ErrorBanner message={error} onRetry={() => setReloadToken((value) => value + 1)} retrying={loading} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Distance" value={playback ? `${(playback.total_distance_km || 0).toFixed(1)} km` : '—'} icon={Route} />
        <StatCard label="Dwell stops" value={playback?.stops?.length ?? '—'} icon={MapPin} tone="success" hint="Computed from real GPS clusters" />
        <StatCard label="GPS points" value={playback?.waypoints?.length ?? '—'} icon={Clock} tone="info" />
        <StatCard label="Breaks" value={playback ? `${totalBreakMinutes} min` : '—'} icon={Coffee} tone="warning" hint={playback ? `${playback.break_intervals?.length || 0} break(s)` : undefined} />
      </div>

      {!employeesLoading && employees.length === 0 && !employeesError && (
        <div className="dashboard-card rounded-lg">
          <EmptyState
            icon={Users}
            title="No employees yet"
            description="Add staff first; their routes appear here once they check in with location enabled."
            action={<Link href="/dashboard/employees" className={btnPrimary}>Add employees</Link>}
          />
        </div>
      )}

      {/* Map */}
      <div className="dashboard-card rounded-lg overflow-hidden relative">
        <div ref={mapNodeRef} className="w-full h-[52vh] min-h-[320px] bg-[#e8eef5]" role="region" aria-label="Route map" />
        {!mapReady && <div className="map-loading"><RefreshCw className="w-5 h-5 animate-spin" /> Loading map…</div>}
        {loading && mapReady && <div className="map-route-loading"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading route</div>}
        {mapReady && !loading && !error && playback && !hasRoute && (
          <div className="map-empty-state">
            <Route className="w-7 h-7" />
            <strong>No route recorded for this day</strong>
            <span>Choose another date, or confirm the employee was checked in with location enabled.</span>
          </div>
        )}
        <div className="map-legend">
          <span><i style={{ background: '#16a34a' }} /> Start</span>
          <span><i style={{ background: '#2563eb' }} /> Route</span>
          <span><i style={{ background: '#f59e0b' }} /> Stop</span>
          <span><i style={{ background: '#dc2626' }} /> End</span>
        </div>
      </div>

      {/* Scrubber */}
      <div className="p-3 rounded-lg dashboard-card space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isPlaying && playback && timelineIndex >= playback.waypoints.length - 1) setTimelineIndex(0);
                setIsPlaying((value) => !value);
              }}
              disabled={!playback?.waypoints?.length}
              className={btnPrimary}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setTimelineIndex(0);
              }}
              disabled={!playback?.waypoints?.length || timelineIndex === 0}
              className={btnGhost}
              title="Back to start"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <span className="text-slate-300 font-mono text-[11px]">
              {currentWpt ? formatTime(currentWpt.recorded_at, timeZone) : '--:--'}
              {currentWpt ? ` · ${Math.round((currentWpt.speed || 0) * 3.6)} km/h` : ''}
            </span>
          </div>
          <span className="text-[#6B7280] text-[10px] md:text-[11px] font-mono">
            {playback?.waypoints?.length ? `${timelineIndex + 1} / ${playback.waypoints.length}` : '0 / 0'} pts
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, (playback?.waypoints?.length || 1) - 1)}
          value={timelineIndex}
          disabled={!playback?.waypoints?.length}
          onChange={(e) => {
            setIsPlaying(false);
            setTimelineIndex(parseInt(e.target.value, 10) || 0);
          }}
          aria-label="Route timeline"
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#16A34A] disabled:opacity-40"
        />
      </div>

      {/* Stops — mobile */}
      <div className="md:hidden space-y-2">
        <span className="font-semibold text-xs dashboard-strong">Dwell stops ({playback?.stops?.length || 0})</span>
        {loading && <div className="dashboard-card rounded-lg"><LoadingRows rows={2} /></div>}
        {!loading &&
          playback?.stops?.map((stop, index) => (
            <div key={stop.id || index} className="dashboard-card rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-400 font-mono">Stop {index + 1}</span>
                <span className="font-bold text-xs dashboard-strong">{stop.duration_minutes} min</span>
              </div>
              <p className="font-semibold text-xs dashboard-strong">{stop.address_name || 'Address unavailable'}</p>
              <div className="flex justify-between text-[10px] text-[#6B7280] pt-1 border-t border-slate-800/60 font-mono">
                <span>{formatTime(stop.start_time, timeZone)} – {formatTime(stop.end_time, timeZone)}</span>
                <span>{stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</span>
              </div>
            </div>
          ))}
        {!loading && playback && (!playback.stops || playback.stops.length === 0) && (
          <p className="text-center text-[#6B7280] text-[11px] py-4">No dwell stops on this day.</p>
        )}
      </div>

      {/* Stops — desktop */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Dwell stops</span>
          <span className="text-[11px] text-[#6B7280]">{playback?.stops?.length || 0} on {selectedDate || '—'}</span>
        </div>
        {loading ? (
          <LoadingRows rows={3} />
        ) : !playback || playback.stops.length === 0 ? (
          <EmptyState icon={MapPin} title="No dwell stops" description="Stops are places where the employee stayed for a few minutes. None were detected on this day." compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={tableHeadRow}>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Place</th>
                  <th className="px-3 py-2">Arrived</th>
                  <th className="px-3 py-2">Left</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2 text-right">Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {playback.stops.map((stop, index) => (
                  <tr key={stop.id || index} className={tableRow}>
                    <td className="px-3 py-2 font-mono font-bold text-amber-400">{index + 1}</td>
                    <td className="px-3 py-2 font-semibold dashboard-strong">{stop.address_name || 'Address unavailable'}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300">{formatTime(stop.start_time, timeZone)}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300">{formatTime(stop.end_time, timeZone)}</td>
                    <td className="px-3 py-2 font-mono font-bold dashboard-strong">{stop.duration_minutes} min</td>
                    <td className="px-3 py-2 text-right font-mono text-[10px] text-slate-400">{stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className={labelClass}>
        Routes older than the retention window are deleted automatically; change it under Settings.
      </p>
    </div>
  );
}

export default function RoutePlaybackPage() {
  return (
    <Suspense fallback={<div className="text-xs text-[#6B7280] p-4">Loading…</div>}>
      <RoutesInner />
    </Suspense>
  );
}
