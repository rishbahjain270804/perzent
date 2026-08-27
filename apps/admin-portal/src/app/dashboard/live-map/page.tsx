'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Circle, LayerGroup, Map as LeafletMap, Marker, Polyline } from 'leaflet';
import {
  AlertTriangle,
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
import type { DailyRoutePlayback } from '@perzent/shared-types';
import { apiFetch, errorMessage, isAbortError, formatTime, todayInTimezone, isValidYmd, type SessionInfo } from '@/lib/client';
import { directConfigFromSession, directRpc, type DirectConfig, type LivePositionRow } from '@/lib/direct';
import { useSession } from '@/components/useSession';
import {
  freshnessOf,
  freshnessLabel,
  secondsSincePing,
  speedKmh,
  isOnShift,
  SHIFT_META,
  DISCONNECTED_AFTER_SECONDS,
  type LiveMember,
  type Freshness,
} from '@/components/liveStatus';

type MapMode = 'LIVE' | 'DAY';
type Leaflet = typeof import('leaflet');
/** With direct access the API roster is only re-read this often; positions come from the RPC every poll. */
const ROSTER_REFRESH_MS = 60_000;

interface MarkerState {
  marker: Marker;
  accuracyCircle?: Circle;
  lat: number;
  lng: number;
  heading: number;
  animFrame?: number;
  iconKey: string;
  kind: 'vehicle' | 'idle';
  liveTrailPoints: Array<[number, number]>;
  livePolyline?: Polyline;
}

const LIVE_POLL_MS = 5_000;
const DAY_POLL_MS = 15_000;
const MAX_TRAIL_POINT_MARKERS = 400;

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

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

const normalizeHeading = (value: number) => ((value % 360) + 360) % 360;

/** Signed shortest rotation from `from` to `to`, in (-180, 180]. */
const shortestArcDelta = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

const headingBucket = (heading: number) => Math.round(normalizeHeading(heading) / 45) % 8;

function speedBucket(kmh: number) {
  if (kmh < 3) return 0;
  if (kmh < 15) return 1;
  if (kmh < 40) return 2;
  if (kmh < 80) return 3;
  return 4;
}

const yesNo = (value: boolean | undefined, yes: string, no: string) => (value === undefined ? 'Not reported' : value ? yes : no);

function vehicleIconHtml(
  member: LiveMember,
  freshness: Freshness,
  moving: boolean,
  kmh: number,
  heading: number,
  seconds: number | null,
  reducedMotion: boolean
) {
  const meta = SHIFT_META[member.shift_status];
  const stateClass = freshness === 'stale' ? 'is-stale' : freshness === 'disconnected' ? 'is-disconnected' : '';
  const halos = freshness === 'live' && !reducedMotion ? '<div class="swiggy-radar-halo"></div><div class="swiggy-radar-halo-2"></div>' : '';
  const beam = moving && freshness === 'live' && !reducedMotion ? '<div class="swiggy-headlight-beam"></div>' : '';
  let pill = '';
  if (freshness === 'stale') {
    pill = `<div class="swiggy-status-pill is-stale" data-role="pill">${freshnessLabel('stale', seconds)}</div>`;
  } else if (freshness === 'disconnected') {
    pill = `<div class="swiggy-status-pill is-disconnected" data-role="pill">GPS/Net lost</div>`;
  } else if (moving) {
    pill = `<div class="swiggy-speed-badge" data-role="pill">${kmh} km/h</div>`;
  }
  return `<div class="swiggy-marker-wrap ${stateClass}" style="--marker-color:${meta.color}">${halos}<div class="swiggy-vehicle-disc" style="transform: rotate(${Math.round(heading)}deg);">${beam}<svg viewBox="0 0 24 24" class="swiggy-vehicle-icon" aria-hidden="true"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg></div>${pill}</div>`;
}

function makeVehicleIcon(leaflet: Leaflet, html: string) {
  return leaflet.divIcon({ className: 'employee-live-marker', html, iconSize: [46, 46], iconAnchor: [23, 23] });
}

function makeIdleIcon(leaflet: Leaflet) {
  return leaflet.divIcon({
    className: 'employee-idle-marker',
    html: '<span class="employee-idle-dot"></span>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function applyRotation(state: MarkerState, heading: number) {
  const disc = state.marker.getElement()?.querySelector<HTMLElement>('.swiggy-vehicle-disc');
  if (disc) disc.style.transform = `rotate(${Math.round(heading)}deg)`;
}

function memberTooltip(member: LiveMember, freshness: Freshness, seconds: number | null, timeZone?: string) {
  const location = member.current_location;
  const telemetry = member.telemetry;
  const moving = !!member.is_moving;
  const kmh = speedKmh(member);
  const precisionLabel = !location ? '—' : location.accuracy <= 10 ? `±${Math.round(location.accuracy)} m (🎯 High Precision)` : location.accuracy <= 25 ? `±${Math.round(location.accuracy)} m (⚡ Good Signal)` : `±${Math.round(location.accuracy)} m (📡 Moderate Signal)`;

  const rows: Array<[string, string]> = [
    ['Status', SHIFT_META[member.shift_status].label],
    ['Signal', freshness === 'idle' ? 'Not on shift' : freshnessLabel(freshness, seconds)],
    ['Speed', moving ? `${kmh} km/h (moving)` : 'Stationary'],
    ['Location', location?.address_name || 'Address unavailable'],
    ['Last ping', formatTime(location?.last_ping_at, timeZone)],
    ['Accuracy', precisionLabel],
    ['Battery', member.battery_level == null ? 'Unavailable' : `${member.battery_level}%`],
    ['Device', member.device_model || 'Unavailable'],
    ['GPS', yesNo(telemetry?.location_services_enabled, 'On', 'Off')],
    ['Location permission', yesNo(telemetry?.location_permission_granted, 'Allowed', 'Blocked')],
    ['Power saver', yesNo(telemetry?.battery_power_save, 'On', 'Off')],
    ['Mock location', yesNo(telemetry?.mock_location_detected, 'Detected', 'Clear')],
  ];
  if (member.has_tamper_alert) rows.push(['Alert', member.tamper_reason || 'Tamper alert']);
  return buildTooltip(member.full_name, rows);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function LiveMapInner() {
  const searchParams = useSearchParams();
  const paramUser = searchParams.get('user_id');
  const paramDate = searchParams.get('date');
  const { session } = useSession();
  const timeZone = session?.company?.timezone;

  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const liveLayerRef = useRef<LayerGroup | null>(null);
  const trailLayerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const markerStatesRef = useRef(new Map<string, MarkerState>());
  const hasFittedRef = useRef(false);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const reducedMotionRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState<MapMode>(paramUser ? 'DAY' : 'LIVE');
  const [team, setTeam] = useState<LiveMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(paramUser);
  const [followSelected, setFollowSelected] = useState(false);
  const followSelectedRef = useRef(false);
  const selectedIdRef = useRef<string | null>(selectedId);

  useEffect(() => {
    followSelectedRef.current = followSelected;
  }, [followSelected]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  const [selectedDate, setSelectedDate] = useState(() => (isValidYmd(paramDate) ? paramDate : todayInTimezone()));
  const [playback, setPlayback] = useState<DailyRoutePlayback | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState('');
  const [routeError, setRouteError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const selectedUser = useMemo(() => team.find((member) => member.user_id === selectedId) || null, [selectedId, team]);
  const locatedTeam = useMemo(() => team.filter((member) => member.current_location), [team]);
  const onShiftCount = useMemo(() => team.filter(isOnShift).length, [team]);
  const today = todayInTimezone(timeZone);

  /* Reduced-motion preference */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = query.matches;
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  /* Database-direct positions (Supabase RPC) when the session carries a direct-access token. The
     full roster (designation, device, telemetry, tamper reasons) still comes from /api/live-team,
     refreshed once a minute; positions/freshness come from the cheap RPC every poll. */
  const directRef = useRef<DirectConfig | null>(null);
  const rosterRef = useRef<Map<string, LiveMember>>(new Map());
  const rosterAtRef = useRef(0);
  useEffect(() => {
    directRef.current = directConfigFromSession(session as (SessionInfo & { supabase?: DirectConfig | null }) | null);
  }, [session]);

  const mergePositions = useCallback((rows: LivePositionRow[], nowTs: number): LiveMember[] => {
    return rows.map((row) => {
      const base = rosterRef.current.get(row.user_id);
      const onShift = row.shift_status === 'CHECKED_IN' || row.shift_status === 'ON_BREAK';
      const lastPoint = row.last_point_at ? Date.parse(row.last_point_at) : NaN;
      const lastSeen = row.last_seen_at ? Date.parse(row.last_seen_at) : NaN;
      const presence = Math.max(Number.isFinite(lastPoint) ? lastPoint : 0, onShift && Number.isFinite(lastSeen) ? lastSeen : 0);
      const seconds = presence > 0 ? Math.max(0, Math.floor((nowTs - presence) / 1000)) : null;
      const disconnected = row.shift_status === 'CHECKED_IN' && seconds !== null && seconds > DISCONNECTED_AFTER_SECONDS;
      const tamper = disconnected
        ? `No GPS ping for over ${Math.round(DISCONNECTED_AFTER_SECONDS / 60)} minutes (location or internet off)`
        : row.mock_location
          ? 'Mock/fake location app detected'
          : !row.gps_enabled && row.shift_status === 'CHECKED_IN'
            ? 'Location services turned off'
            : base?.tamper_reason ?? null;
      const hasLocation = row.latitude !== null && row.longitude !== null;
      return {
        ...(base ?? {
          user_id: row.user_id,
          full_name: row.full_name,
          designation: '',
          department_name: undefined,
          dwell_minutes: 0,
          gps_enabled: row.gps_enabled,
        }),
        user_id: row.user_id,
        full_name: row.full_name,
        shift_status: row.shift_status,
        punch_in_time: row.punch_in_time,
        punch_out_time: base?.punch_out_time ?? null,
        current_location: hasLocation
          ? {
              latitude: row.latitude as number,
              longitude: row.longitude as number,
              accuracy: row.accuracy,
              speed: row.speed,
              heading: row.heading,
              address_name: `${(row.latitude as number).toFixed(4)}, ${(row.longitude as number).toFixed(4)}`,
              last_ping_at: row.last_point_at || row.punch_in_time || new Date(nowTs).toISOString(),
            }
          : base?.current_location,
        is_moving: row.speed > 0.8,
        battery_level: row.battery_level ?? base?.battery_level,
        gps_enabled: row.gps_enabled && !disconnected,
        is_gps_disconnected: disconnected,
        seconds_since_last_ping: seconds,
        has_tamper_alert: Boolean(tamper),
        tamper_reason: tamper,
      } as LiveMember;
    });
  }, []);

  /* Polling: in-flight guard, AbortController, pauses while the tab is hidden. */
  const fetchLiveTeam = useCallback(async (manual = false) => {
    if (inFlightRef.current) return;
    if (!manual && typeof document !== 'undefined' && document.hidden) return;
    inFlightRef.current = true;
    if (manual) setRefreshing(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let result: LiveMember[] | null = null;
      if (directRef.current) {
        const nowTs = Date.now();
        if (rosterRef.current.size === 0 || nowTs - rosterAtRef.current > ROSTER_REFRESH_MS) {
          const roster = await apiFetch<LiveMember[]>('/api/live-team', { signal: controller.signal });
          if (Array.isArray(roster)) {
            rosterRef.current = new Map(roster.map((member) => [member.user_id, member]));
            rosterAtRef.current = nowTs;
          }
        }
        const rows = await directRpc<LivePositionRow[]>('live_team_positions', {}, controller.signal);
        if (Array.isArray(rows)) result = mergePositions(rows, nowTs);
      }
      if (!result) {
        result = await apiFetch<LiveMember[]>('/api/live-team', { signal: controller.signal });
      }
      if (!Array.isArray(result)) throw new Error('Unexpected live-team response');
      setTeam(result);
      setLastRefreshed(new Date());
      setNow(Date.now());
      setError(''); // only clear an existing error once a poll succeeds
    } catch (reason) {
      if (isAbortError(reason)) return;
      setError(errorMessage(reason, 'Could not load the live team'));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [mergePositions]);

  useEffect(() => {
    fetchLiveTeam(true);
    const interval = window.setInterval(() => fetchLiveTeam(false), mode === 'LIVE' ? LIVE_POLL_MS : DAY_POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) fetchLiveTeam(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      abortRef.current?.abort();
    };
  }, [fetchLiveTeam, mode]);

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
      trailLayerRef.current = leaflet.layerGroup().addTo(map);
      liveLayerRef.current = leaflet.layerGroup().addTo(map);
      setMapReady(true);
    });
    return () => {
      mounted = false;
      for (const state of markerStatesRef.current.values()) {
        if (state.animFrame) cancelAnimationFrame(state.animFrame);
      }
      markerStatesRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      liveLayerRef.current = null;
      trailLayerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  /* Day-route fetch (DAY mode only) */
  useEffect(() => {
    if (mode !== 'DAY' || !selectedId) return;
    const controller = new AbortController();
    setRouteLoading(true);
    setRouteError('');
    apiFetch<DailyRoutePlayback>(`/api/routes?user_id=${encodeURIComponent(selectedId)}&date=${selectedDate}`, { signal: controller.signal })
      .then((result) => setPlayback(result))
      .catch((reason) => {
        if (isAbortError(reason)) return;
        setPlayback(null);
        setRouteError(errorMessage(reason, 'Could not load this route'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRouteLoading(false);
      });
    return () => controller.abort();
  }, [mode, selectedDate, selectedId]);

  /* Smooth glide + shortest-arc rotation + circle/polyline sync + Camera Lock via requestAnimationFrame */
  const animateMarker = useCallback((state: MarkerState, targetLat: number, targetLng: number, targetHeading: number, userId: string, durationMs = 2800) => {
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    if (reducedMotionRef.current) {
      state.lat = targetLat;
      state.lng = targetLng;
      state.heading = normalizeHeading(targetHeading);
      state.marker.setLatLng([targetLat, targetLng]);
      state.accuracyCircle?.setLatLng([targetLat, targetLng]);
      applyRotation(state, state.heading);
      if (followSelectedRef.current && selectedIdRef.current === userId) {
        mapRef.current?.panTo([targetLat, targetLng], { animate: false });
      }
      state.animFrame = undefined;
      return;
    }
    const startLat = state.lat;
    const startLng = state.lng;
    const startHeading = state.heading;
    const delta = shortestArcDelta(startHeading, targetHeading);
    const startTime = performance.now();

    const frame = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      // Smooth Hermite cubic ease for ultra-smooth vehicle gliding
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      state.lat = startLat + (targetLat - startLat) * ease;
      state.lng = startLng + (targetLng - startLng) * ease;
      state.heading = normalizeHeading(startHeading + delta * ease);
      state.marker.setLatLng([state.lat, state.lng]);
      state.accuracyCircle?.setLatLng([state.lat, state.lng]);
      applyRotation(state, state.heading);
      if (followSelectedRef.current && selectedIdRef.current === userId) {
        mapRef.current?.panTo([state.lat, state.lng], { animate: false });
      }
      state.animFrame = progress < 1 ? requestAnimationFrame(frame) : undefined;
    };
    state.animFrame = requestAnimationFrame(frame);
  }, []);

  /* Mode switch: clear the layer that belongs to the other mode. */
  useEffect(() => {
    if (!mapReady) return;
    if (mode === 'LIVE') {
      trailLayerRef.current?.clearLayers();
      hasFittedRef.current = false;
    } else {
      for (const state of markerStatesRef.current.values()) {
        if (state.animFrame) cancelAnimationFrame(state.animFrame);
        if (state.accuracyCircle) liveLayerRef.current?.removeLayer(state.accuracyCircle);
        if (state.livePolyline) liveLayerRef.current?.removeLayer(state.livePolyline);
      }
      markerStatesRef.current.clear();
      liveLayerRef.current?.clearLayers();
    }
  }, [mode, mapReady]);

  /* LIVE markers: diff against existing states; setIcon only when the icon key changes. */
  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = liveLayerRef.current;
    if (!mapReady || !leaflet || !map || !layer || mode !== 'LIVE') return;

    const states = markerStatesRef.current;
    const nowTs = Date.now();
    const currentIds = new Set(locatedTeam.map((member) => member.user_id));

    for (const [userId, state] of states.entries()) {
      if (!currentIds.has(userId)) {
        if (state.animFrame) cancelAnimationFrame(state.animFrame);
        if (state.accuracyCircle) layer.removeLayer(state.accuracyCircle);
        if (state.livePolyline) layer.removeLayer(state.livePolyline);
        layer.removeLayer(state.marker);
        states.delete(userId);
      }
    }

    const bounds: Array<[number, number]> = [];

    locatedTeam.forEach((member) => {
      const location = member.current_location!;
      const freshness = freshnessOf(member, nowTs);
      const kind: MarkerState['kind'] = freshness === 'idle' ? 'idle' : 'vehicle';
      const heading = normalizeHeading(location.heading || 0);
      const kmh = speedKmh(member);
      const moving = !!member.is_moving;
      const seconds = secondsSincePing(member, nowTs);
      const iconKey =
        kind === 'idle'
          ? 'idle'
          : `${member.shift_status}|${freshness}|${headingBucket(heading)}|${speedBucket(kmh)}|${moving ? 1 : 0}`;
      const tooltip = memberTooltip(member, freshness, seconds, timeZone);

      let state = states.get(member.user_id);
      if (state && state.kind !== kind) {
        if (state.animFrame) cancelAnimationFrame(state.animFrame);
        if (state.accuracyCircle) layer.removeLayer(state.accuracyCircle);
        if (state.livePolyline) layer.removeLayer(state.livePolyline);
        layer.removeLayer(state.marker);
        states.delete(member.user_id);
        state = undefined;
      }

      if (!state) {
        const icon =
          kind === 'idle'
            ? makeIdleIcon(leaflet)
            : makeVehicleIcon(leaflet, vehicleIconHtml(member, freshness, moving, kmh, heading, seconds, reducedMotionRef.current));
        const marker = leaflet
          .marker([location.latitude, location.longitude], { icon, zIndexOffset: kind === 'idle' ? 0 : 500 })
          .addTo(layer);
        marker.bindTooltip(tooltip, { direction: 'top', offset: [0, kind === 'idle' ? -6 : -18], opacity: 1, className: 'perzent-leaflet-tooltip' });
        marker.on('click', () => {
          setSelectedId(member.user_id);
          setPlayback(null);
          setMode('DAY');
        });

        // Dynamic precision accuracy circle
        let accuracyCircle: Circle | undefined;
        if (kind === 'vehicle' && location.accuracy) {
          accuracyCircle = leaflet.circle([location.latitude, location.longitude], {
            radius: Math.max(6, location.accuracy),
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            weight: 1.5,
            className: 'swiggy-accuracy-circle',
          }).addTo(layer);
        }

        const liveTrailPoints: Array<[number, number]> = [[location.latitude, location.longitude]];

        states.set(member.user_id, {
          marker,
          accuracyCircle,
          lat: location.latitude,
          lng: location.longitude,
          heading,
          iconKey,
          kind,
          liveTrailPoints,
        });
      } else {
        state.marker.setTooltipContent(tooltip);

        if (state.iconKey !== iconKey) {
          state.marker.setIcon(makeVehicleIcon(leaflet, vehicleIconHtml(member, freshness, moving, kmh, state.heading, seconds, reducedMotionRef.current)));
          state.iconKey = iconKey;
          applyRotation(state, state.heading);
        } else {
          // Cheap text-only refresh of the pill (speed / stale seconds) without rebuilding the icon.
          const pill = state.marker.getElement()?.querySelector<HTMLElement>('[data-role="pill"]');
          if (pill) {
            if (freshness === 'stale') pill.textContent = freshnessLabel('stale', seconds);
            else if (freshness === 'live' && moving) pill.textContent = `${kmh} km/h`;
          }
        }

        // Update accuracy radius
        if (state.accuracyCircle && location.accuracy) {
          state.accuracyCircle.setRadius(Math.max(6, location.accuracy));
        }

        // Append live breadcrumb polyline when moving
        if (kind === 'vehicle' && moving) {
          const lastPt = state.liveTrailPoints[state.liveTrailPoints.length - 1];
          if (!lastPt || lastPt[0] !== location.latitude || lastPt[1] !== location.longitude) {
            state.liveTrailPoints.push([location.latitude, location.longitude]);
            if (state.liveTrailPoints.length > 25) state.liveTrailPoints.shift();
            if (state.liveTrailPoints.length > 1) {
              if (!state.livePolyline) {
                state.livePolyline = leaflet.polyline(state.liveTrailPoints, {
                  color: '#2563eb',
                  weight: 4,
                  opacity: 0.75,
                  className: 'live-trail-dash',
                }).addTo(layer);
              } else {
                state.livePolyline.setLatLngs(state.liveTrailPoints);
              }
            }
          }
        }

        const moved = state.lat !== location.latitude || state.lng !== location.longitude;
        if (kind === 'vehicle') {
          if (moved || Math.abs(shortestArcDelta(state.heading, heading)) > 1) {
            animateMarker(state, location.latitude, location.longitude, heading, member.user_id);
          }
        } else if (moved) {
          state.lat = location.latitude;
          state.lng = location.longitude;
          state.marker.setLatLng([location.latitude, location.longitude]);
          state.accuracyCircle?.setLatLng([location.latitude, location.longitude]);
        }
      }

      bounds.push([location.latitude, location.longitude]);
    });

    if (!hasFittedRef.current && bounds.length > 0) {
      if (bounds.length === 1) map.setView(bounds[0], 15, { animate: !reducedMotionRef.current });
      else map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16, animate: !reducedMotionRef.current });
      hasFittedRef.current = true;
    }
  }, [locatedTeam, mapReady, mode, animateMarker, timeZone]);

  /* DAY trail: depends only on playback + mode, not on the polled team. */
  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = trailLayerRef.current;
    if (!mapReady || !leaflet || !map || !layer || mode !== 'DAY') return;

    layer.clearLayers();
    if (!playback) return;

    const bounds: Array<[number, number]> = [];
    const positions = playback.waypoints.map((point) => [point.latitude, point.longitude] as [number, number]);
    if (positions.length > 1) {
      leaflet.polyline(positions, { color: '#2563eb', weight: 5, opacity: 0.85, className: 'live-trail-dash' }).addTo(layer);
    }

    playback.stops.forEach((stop, index) => {
      const marker = leaflet.circleMarker([stop.latitude, stop.longitude], {
        radius: 7,
        color: '#1d4ed8',
        fillColor: '#60a5fa',
        fillOpacity: 1,
        weight: 3,
      }).addTo(layer);
      marker.bindTooltip(
        buildTooltip(`Stop ${index + 1}`, [
          ['Place', stop.address_name || 'Address unavailable'],
          ['Arrived', formatTime(stop.start_time, timeZone)],
          ['Left', formatTime(stop.end_time, timeZone)],
          ['Duration', `${stop.duration_minutes} min`],
        ]),
        { direction: 'top', offset: [0, -12], opacity: 1, className: 'perzent-leaflet-tooltip' }
      );
      bounds.push([stop.latitude, stop.longitude]);
    });

    if (bounds.length === 1) map.setView(bounds[0], 15, { animate: !reducedMotionRef.current });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16, animate: !reducedMotionRef.current });
  }, [playback, mapReady, mode, timeZone]);

  /* Roster interactions: hover highlights (tooltip only), click pans, trail button opens DAY. */
  const highlight = (member: LiveMember) => {
    if (mode !== 'LIVE') return;
    markerStatesRef.current.get(member.user_id)?.marker.openTooltip();
  };
  const unhighlight = (member: LiveMember) => {
    markerStatesRef.current.get(member.user_id)?.marker.closeTooltip();
  };
  const panToMember = (member: LiveMember) => {
    setSelectedId(member.user_id);
    if (mode !== 'LIVE' || !member.current_location) return;
    mapRef.current?.panTo([member.current_location.latitude, member.current_location.longitude], { animate: !reducedMotionRef.current });
    markerStatesRef.current.get(member.user_id)?.marker.openTooltip();
  };
  const openDay = (userId: string) => {
    setSelectedId(userId);
    setPlayback(null);
    setRouteError('');
    setMode('DAY');
  };
  const backToLive = () => {
    setMode('LIVE');
    setPlayback(null);
    setRouteError('');
  };

  const dayName = selectedUser?.full_name || playback?.user_name || 'Employee';
  const rosterMembers = mode === 'LIVE' ? team : selectedUser ? [selectedUser] : [];

  return (
    <div className="map-page space-y-4 max-w-[1600px] mx-auto text-slate-900">
      <section className="map-toolbar">
        <div>
          <div className="flex items-center gap-2">
            <span className="map-eyebrow"><LocateFixed className="w-3.5 h-3.5" /> Workforce location</span>
            {mode === 'LIVE' && <span className="map-live-pill"><i /> Live · 3 s</span>}
          </div>
          <h1>{mode === 'LIVE' ? 'All employees — live view' : `${dayName} — full day`}</h1>
          <p>
            {mode === 'LIVE'
              ? `${onShiftCount} on shift · ${locatedTeam.length} of ${team.length} employees have a stored position`
              : `${selectedDate} · ${playback?.waypoints.length || 0} route points · ${playback?.stops.length || 0} stops · ${playback?.total_distance_km ?? 0} km`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {mode === 'LIVE' && selectedId && (
            <button
              type="button"
              className={`map-secondary-button ${followSelected ? '!bg-blue-600 !text-white !border-blue-600' : ''}`}
              onClick={() => setFollowSelected((prev) => !prev)}
              title="Lock map camera on selected vehicle"
            >
              <Navigation className={`w-3.5 h-3.5 ${followSelected ? 'animate-pulse' : ''}`} />
              {followSelected ? 'Camera Locked' : 'Lock Camera'}
            </button>
          )}
          {mode === 'DAY' && (
            <>
              <label className="map-date-control">
                <CalendarDays className="w-3.5 h-3.5" />
                <input type="date" max={today} value={selectedDate} onChange={(event) => isValidYmd(event.target.value) && setSelectedDate(event.target.value)} aria-label="Route date" />
              </label>
              <button className="map-secondary-button" onClick={backToLive}>
                <ArrowLeft className="w-3.5 h-3.5" /> All employees live
              </button>
            </>
          )}
          <button className="map-secondary-button" onClick={() => fetchLiveTeam(true)} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="map-error flex flex-col sm:flex-row sm:items-center justify-between gap-2" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => fetchLiveTeam(true)} disabled={refreshing} className="map-secondary-button !min-h-0 !py-1">
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Retry
          </button>
        </div>
      )}
      {mode === 'DAY' && routeError && <div className="map-error" role="alert">{routeError}</div>}

      <section className="map-layout">
        <aside className="map-roster">
          <div className="map-roster-heading">
            <div>
              <strong>{mode === 'LIVE' ? 'Team now' : 'Selected employee'}</strong>
              <span>{lastRefreshed ? `Updated ${formatTime(lastRefreshed.toISOString(), timeZone)}` : loading ? 'Loading positions…' : 'Not updated yet'}</span>
            </div>
            <span>{mode === 'LIVE' ? team.length : 1}</span>
          </div>

          <div className="map-roster-list">
            {rosterMembers.map((member) => {
              const meta = SHIFT_META[member.shift_status];
              const freshness = freshnessOf(member, now);
              const label = freshnessLabel(freshness, secondsSincePing(member, now));
              return (
                <div
                  key={member.user_id}
                  className={`map-employee-card ${selectedId === member.user_id ? 'is-selected' : ''}`}
                  onMouseEnter={() => highlight(member)}
                  onMouseLeave={() => unhighlight(member)}
                >
                  <button
                    type="button"
                    className="map-employee-main"
                    onClick={() => panToMember(member)}
                    onFocus={() => highlight(member)}
                    onBlur={() => unhighlight(member)}
                    title={mode === 'LIVE' ? 'Centre the map on this employee' : undefined}
                  >
                    <span className="map-avatar">{member.full_name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="map-employee-name">
                        {member.full_name}
                        {member.has_tamper_alert && <AlertTriangle className="inline w-3 h-3 text-red-500 ml-1 align-text-bottom" aria-label="Tamper alert" />}
                      </span>
                      <span className="map-employee-location">
                        {member.current_location?.address_name || (isOnShift(member) ? 'Waiting for GPS' : 'No location received today')}
                      </span>
                      <span className="map-employee-meta">
                        <i style={{ background: meta.color }} /> {meta.label}
                        {freshness !== 'idle' && <span className={`map-fresh-pill is-${freshness}`}>{label}</span>}
                        {member.current_location && <> · {formatTime(member.current_location.last_ping_at, timeZone)}</>}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="map-employee-trail"
                    onClick={() => openDay(member.user_id)}
                    title="Open full-day trail"
                    aria-label={`Open full-day trail for ${member.full_name}`}
                  >
                    <Route className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {mode === 'DAY' && !selectedUser && (
              <div className="map-employee-card">
                <span className="map-avatar">{dayName.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="map-employee-name">{dayName}</span>
                  <span className="map-employee-location">{loading ? 'Loading roster…' : 'Not in today\'s live roster'}</span>
                </span>
              </div>
            )}
            {mode === 'LIVE' && !loading && team.length === 0 && !error && (
              <p className="text-[11px] text-slate-500 px-2 py-4 text-center">No employees yet. Add staff on the Employees page.</p>
            )}
          </div>

          {mode === 'LIVE' && (
            <div className="map-roster-help">
              <Navigation className="w-4 h-4" />
              <span>Hover to highlight, click to centre the map. Use the trail button (or click a marker) for the full-day route.</span>
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
          <div ref={mapNodeRef} className="map-canvas" role="region" aria-label={mode === 'LIVE' ? 'Live employee map' : 'Employee full-day route map'} />
          {!mapReady && <div className="map-loading"><RefreshCw className="w-5 h-5 animate-spin" /> Loading map…</div>}
          {routeLoading && <div className="map-route-loading"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading day trail</div>}

          {mode === 'LIVE' && !loading && locatedTeam.length === 0 && (
            <div className="map-empty-state">
              <Users className="w-7 h-7" />
              <strong>No live positions yet</strong>
              <span>Employees appear here once they check in on the Android app and the first GPS point arrives.</span>
            </div>
          )}
          {mode === 'DAY' && !routeLoading && !routeError && playback && playback.waypoints.length === 0 && playback.stops.length === 0 && (
            <div className="map-empty-state">
              <Route className="w-7 h-7" />
              <strong>No route recorded for this day</strong>
              <span>Choose another date, or confirm the employee was checked in with location enabled.</span>
            </div>
          )}

          <div className="map-legend">
            {mode === 'LIVE' ? (
              <>
                <span><i style={{ background: '#16a34a' }} /> On duty</span>
                <span><i style={{ background: '#d97706' }} /> Break</span>
                <span><i style={{ background: '#fbbf24' }} /> Stale</span>
                <span><i style={{ background: '#ef4444' }} /> GPS/Net lost</span>
                <span><i style={{ background: '#94a3b8' }} /> Off duty</span>
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

export default function LiveMapPage() {
  return (
    <Suspense fallback={<div className="map-page text-xs text-[#6B7280] p-4">Loading map…</div>}>
      <LiveMapInner />
    </Suspense>
  );
}
