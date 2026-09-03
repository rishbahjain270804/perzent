import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Live team map for the owner app. Renders Leaflet + OpenStreetMap tiles inside a WebView — the
 * same free, key-less map stack the web dashboard uses — so there is no Google Maps API key or
 * billing to set up. Marker positions are pushed in from React via injectJavaScript.
 */

export interface MapMember {
  user_id: string;
  full_name: string;
  latitude: number;
  longitude: number;
  moving?: boolean;
  stale?: boolean;
}

const HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;background:#eaf2ec}
  .pin{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;
    background:#0f172a;color:#fff;font:700 11px system-ui;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}
  .pin.moving{background:#16a34a}
  .pin.stale{background:#dc2626}
  .lbl{font:600 11px system-ui;color:#0f172a}
</style></head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([20.5937, 78.9629], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var markers = {};
  var didFit = false;
  function icon(m){
    var cls = m.stale ? 'pin stale' : (m.moving ? 'pin moving' : 'pin');
    var initials = (m.full_name||'?').split(' ').slice(0,2).map(function(p){return p[0]||''}).join('').toUpperCase();
    return L.divIcon({ className:'', html:'<div class="'+cls+'">'+initials+'</div>', iconSize:[30,30], iconAnchor:[15,15] });
  }
  window.updateMarkers = function(list){
    var seen = {};
    var pts = [];
    list.forEach(function(m){
      seen[m.user_id] = true;
      pts.push([m.latitude, m.longitude]);
      if (markers[m.user_id]) {
        markers[m.user_id].setLatLng([m.latitude, m.longitude]).setIcon(icon(m));
      } else {
        markers[m.user_id] = L.marker([m.latitude, m.longitude], { icon: icon(m) }).addTo(map).bindPopup(m.full_name);
      }
    });
    Object.keys(markers).forEach(function(id){ if(!seen[id]){ map.removeLayer(markers[id]); delete markers[id]; } });
    if (!didFit && pts.length) { didFit = true; map.fitBounds(pts, { padding:[50,50], maxZoom:15 }); }
  };
  document.addEventListener('message', function(e){ try{ window.updateMarkers(JSON.parse(e.data)); }catch(_){} });
  window.addEventListener('message', function(e){ try{ window.updateMarkers(JSON.parse(e.data)); }catch(_){} });
</script></body></html>`;

export function OwnerMap({ members }: { members: MapMember[] }) {
  const ref = useRef<WebView>(null);
  const payload = useMemo(() => JSON.stringify(members), [members]);

  return (
    <View style={styles.wrap}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: HTML }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => ref.current?.injectJavaScript(`window.updateMarkers && window.updateMarkers(${payload}); true;`)}
        injectedJavaScript={`window.__initial=${payload};true;`}
      />
      {/* Re-push whenever members change */}
      <PushOnChange webRef={ref} payload={payload} />
    </View>
  );
}

function PushOnChange({ webRef, payload }: { webRef: React.RefObject<WebView | null>; payload: string }) {
  React.useEffect(() => {
    webRef.current?.injectJavaScript(`window.updateMarkers && window.updateMarkers(${payload}); true;`);
  }, [payload, webRef]);
  return null;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#eaf2ec' },
  web: { flex: 1, backgroundColor: '#eaf2ec' },
});
