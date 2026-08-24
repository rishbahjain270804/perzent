'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, Marker } from 'leaflet';
import {
  ArrowLeft,
  Battery,
  CalendarDays,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Users,
} from 'lucide-react';
import type { DailyRoutePlayback, LiveTeamMember } from '@perzent/shared-types';

type MapMode = 'LIVE' | 'DAY';

const today = () => new Date().toLocaleDateString('en-CA');

const statusMeta: Record<LiveTeamMember['shift_status'], { label: string; color: string; surface: string }> = {
  CHECKED_IN: { label: 'On duty', color: '#16a34a', surface: '#dcfce7' },
  ON_BREAK: { label: 'On break', color: '#d97706', surface: '#fef3c7' },
  CHECKED_OUT: { label: 'Checked out', color: '#64748b', surface: '#e2e8f0' },
  OFF_DUTY: { label: 'Off duty', color: '#94a3b8', surface: '#f1f5f9' },
};

function formatTime(value?: string) {
  if (!value) return 'No ping';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildTooltip(title: string, rows: Array<[string, string]>) {
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

export default function LiveMapPage() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const liveMarkerRefs = useRef(new Map<string, Marker>());

  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState<MapMode>('LIVE');
  const [team, setTeam] = useState<LiveTeamMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [playback, setPlayback] = useState<DailyRoutePlayback | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const selectedUser = useMemo(
    () => team.find((member) => member.user_id === selectedId) || null,
    [selectedId, team]
  );
  const locatedTeam = useMemo(() => team.filter((member) => member.current_location), [team]);

  const fetchLiveTeam = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/live-team', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load the live team');
      if (!Array.isArray(result)) throw new Error('Unexpected live-team response');
      setTeam(result);
      setLastRefreshed(new Date());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the live team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveTeam();
    const interval = window.setInterval(fetchLiveTeam, 10_000);
    return () => window.clearInterval(interval);
  }, [fetchLiveTeam]);

  useEffect(() => {
    let mounted = true;
    import('leaflet').then((leaflet) => {
      if (!mounted || !mapNodeRef.current || mapRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([22.8, 79.1], 5);
      leaflet.control.zoom({ position: 'bottomright' }).addTo(map);
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
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
    };
  }, []);

  useEffect(() => {
    if (mode !== 'DAY' || !selectedId) return;
    let current = true;
    setRouteLoading(true);
    setError('');
    fetch(`/api/routes?user_id=${encodeURIComponent(selectedId)}&date=${selectedDate}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load this route');
        if (current) setPlayback(result);
      })
      .catch((reason) => {
        if (current) {
          setPlayback(null);
          setError(reason.message || 'Could not load this route');
        }
      })
      .finally(() => current && setRouteLoading(false));
    return () => { current = false; };
  }, [mode, selectedDate, selectedId]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!mapReady || !leaflet || !map || !layer) return;

    layer.clearLayers();
    liveMarkerRefs.current.clear();
    const bounds: Array<[number, number]> = [];

    if (mode === 'LIVE') {
      locatedTeam.forEach((member) => {
        const location = member.current_location!;
        const meta = statusMeta[member.shift_status];
        const icon = leaflet.divIcon({
          className: 'employee-live-marker',
          html: `<span class="employee-live-marker-ring" style="--marker-color:${meta.color}"></span><span class="employee-live-marker-dot" style="--marker-color:${meta.color}"></span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const marker = leaflet.marker([location.latitude, location.longitude], { icon }).addTo(layer);
        marker.bindTooltip(buildTooltip(member.full_name, [
          ['Status', meta.label],
          ['Location', location.address_name || 'Address unavailable'],
          ['Last ping', formatTime(location.last_ping_at)],
          ['Accuracy', `±${Math.round(location.accuracy)} m`],
          ['Battery', member.battery_level == null ? 'Unavailable' : `${member.battery_level}%`],
        ]), {
          direction: 'top',
          offset: [0, -12],
          opacity: 1,
          className: 'perzent-leaflet-tooltip',
        });
        marker.on('click', () => {
          setSelectedId(member.user_id);
          setMode('DAY');
        });
        liveMarkerRefs.current.set(member.user_id, marker);
        bounds.push([location.latitude, location.longitude]);
      });
    } else if (playback) {
      const positions = playback.waypoints.map((point) => [point.latitude, point.longitude] as [number, number]);
      if (positions.length > 1) {
        leaflet.polyline(positions, { color: '#2563eb', weight: 4, opacity: 0.7 }).addTo(layer);
      }
      playback.waypoints.forEach((point, index) => {
        const isStart = index === 0;
        const isEnd = index === playback.waypoints.length - 1;
        const marker = leaflet.circleMarker([point.latitude, point.longitude], {
          radius: isStart || isEnd ? 7 : 4,
          color: isStart ? '#16a34a' : isEnd ? '#dc2626' : '#ffffff',
          weight: isStart || isEnd ? 3 : 2,
          fillColor: isStart ? '#16a34a' : isEnd ? '#dc2626' : '#2563eb',
          fillOpacity: 0.95,
        }).addTo(layer);
        marker.bindTooltip(buildTooltip(
          isStart ? 'Shift started' : isEnd ? 'Latest / final point' : `Route point ${index + 1}`,
          [
            ['Time', formatTime(point.recorded_at)],
            ['Speed', `${Math.round(point.speed)} km/h`],
            ['Accuracy', `±${Math.round(point.accuracy)} m`],
          ]
        ), { direction: 'top', offset: [0, -8], opacity: 1, className: 'perzent-leaflet-tooltip' });
        bounds.push([point.latitude, point.longitude]);
      });
      playback.stops.forEach((stop) => {
        const marker = leaflet.circleMarker([stop.latitude, stop.longitude], {
          radius: 8,
          color: '#ffffff',
          weight: 3,
          fillColor: '#f59e0b',
          fillOpacity: 1,
        }).addTo(layer);
        marker.bindTooltip(buildTooltip('Recorded stop', [
          ['Place', stop.address_name],
          ['Arrived', formatTime(stop.start_time)],
          ['Duration', `${stop.duration_minutes} min`],
        ]), { direction: 'top', offset: [0, -9], opacity: 1, className: 'perzent-leaflet-tooltip' });
        bounds.push([stop.latitude, stop.longitude]);
      });
    }

    if (bounds.length === 1) map.setView(bounds[0], 15, { animate: true });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16, animate: true });
  }, [locatedTeam, mapReady, mode, playback]);

  const focusLiveEmployee = (member: LiveTeamMember) => {
    const marker = liveMarkerRefs.current.get(member.user_id);
    if (!marker || !member.current_location) return;
    marker.openTooltip();
    mapRef.current?.panTo([member.current_location.latitude, member.current_location.longitude], { animate: true });
  };

  const openDay = (member: LiveTeamMember) => {
    setSelectedId(member.user_id);
    setPlayback(null);
    setMode('DAY');
  };

  return (
    <div className="map-page space-y-4 max-w-[1600px] mx-auto text-slate-900">
      <section className="map-toolbar">
        <div>
          <div className="flex items-center gap-2">
            <span className="map-eyebrow"><LocateFixed className="w-3.5 h-3.5" /> Workforce location</span>
            {mode === 'LIVE' && <span className="map-live-pill"><i /> Live</span>}
          </div>
          <h1>{mode === 'LIVE' ? 'All employees — live view' : `${selectedUser?.full_name || 'Employee'} — full day`}</h1>
          <p>
            {mode === 'LIVE'
              ? `${locatedTeam.length} of ${team.length} employees have a stored live position`
              : `${selectedDate} · ${playback?.waypoints.length || 0} route points · ${playback?.total_distance_km || 0} km`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {mode === 'DAY' && (
            <>
              <label className="map-date-control">
                <CalendarDays className="w-3.5 h-3.5" />
                <input type="date" max={today()} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              </label>
              <button className="map-secondary-button" onClick={() => setMode('LIVE')}>
                <ArrowLeft className="w-3.5 h-3.5" /> All employees live
              </button>
            </>
          )}
          <button className="map-secondary-button" onClick={fetchLiveTeam} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      {error && <div className="map-error">{error}</div>}

      <section className="map-layout">
        <aside className="map-roster">
          <div className="map-roster-heading">
            <div>
              <strong>{mode === 'LIVE' ? 'Team now' : 'Selected employee'}</strong>
              <span>{lastRefreshed ? `Updated ${formatTime(lastRefreshed.toISOString())}` : 'Loading positions…'}</span>
            </div>
            <span>{mode === 'LIVE' ? team.length : 1}</span>
          </div>

          <div className="map-roster-list">
            {(mode === 'LIVE' ? team : selectedUser ? [selectedUser] : []).map((member) => {
              const meta = statusMeta[member.shift_status];
              return (
                <button
                  key={member.user_id}
                  className={`map-employee-card ${selectedId === member.user_id ? 'is-selected' : ''}`}
                  onMouseEnter={() => mode === 'LIVE' && focusLiveEmployee(member)}
                  onMouseLeave={() => liveMarkerRefs.current.get(member.user_id)?.closeTooltip()}
                  onFocus={() => mode === 'LIVE' && focusLiveEmployee(member)}
                  onClick={() => openDay(member)}
                >
                  <span className="map-avatar">{member.full_name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="map-employee-name">{member.full_name}</span>
                    <span className="map-employee-location">
                      {member.current_location?.address_name || 'No location received today'}
                    </span>
                    <span className="map-employee-meta">
                      <i style={{ background: meta.color }} /> {meta.label}
                      {member.current_location && <> · {formatTime(member.current_location.last_ping_at)}</>}
                    </span>
                  </span>
                  <Route className="w-4 h-4 text-slate-400" />
                </button>
              );
            })}
          </div>

          {mode === 'LIVE' && (
            <div className="map-roster-help">
              <Navigation className="w-4 h-4" />
              <span>Hover an employee or map dot for details. Click either to open the full-day trail.</span>
            </div>
          )}

          {mode === 'DAY' && selectedUser && (
            <div className="map-selected-summary">
              <div><MapPin className="w-4 h-4" /><span>Latest</span><strong>{selectedUser.current_location?.address_name || 'Unavailable'}</strong></div>
              <div><Clock3 className="w-4 h-4" /><span>Dwell</span><strong>{selectedUser.dwell_minutes} min</strong></div>
              <div><Battery className="w-4 h-4" /><span>Battery</span><strong>{selectedUser.battery_level == null ? '—' : `${selectedUser.battery_level}%`}</strong></div>
            </div>
          )}
        </aside>

        <div className="map-canvas-wrap">
          <div ref={mapNodeRef} className="map-canvas" aria-label={mode === 'LIVE' ? 'Live employee map' : 'Employee full-day route map'} />
          {!mapReady && <div className="map-loading"><RefreshCw className="w-5 h-5 animate-spin" /> Loading map…</div>}
          {routeLoading && <div className="map-route-loading"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading day trail</div>}

          {mode === 'LIVE' && !loading && locatedTeam.length === 0 && (
            <div className="map-empty-state">
              <Users className="w-7 h-7" />
              <strong>No live positions yet</strong>
              <span>Employees appear here after the mobile app uploads a GPS waypoint.</span>
            </div>
          )}
          {mode === 'DAY' && !routeLoading && playback && playback.waypoints.length === 0 && playback.stops.length === 0 && (
            <div className="map-empty-state">
              <Route className="w-7 h-7" />
              <strong>No route recorded for this day</strong>
              <span>Choose another date or confirm that route tracking uploaded waypoints.</span>
            </div>
          )}

          <div className="map-legend">
            {mode === 'LIVE' ? (
              <>
                <span><i style={{ background: '#16a34a' }} /> On duty</span>
                <span><i style={{ background: '#d97706' }} /> Break</span>
                <span><i style={{ background: '#94a3b8' }} /> Offline</span>
              </>
            ) : (
              <>
                <span><i style={{ background: '#16a34a' }} /> Start</span>
                <span><i style={{ background: '#2563eb' }} /> Route point</span>
                <span><i style={{ background: '#f59e0b' }} /> Stop</span>
                <span><i style={{ background: '#dc2626' }} /> End/latest</span>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
