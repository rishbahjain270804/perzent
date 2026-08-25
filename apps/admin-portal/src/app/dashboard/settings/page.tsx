'use client';
import { useEffect, useState } from 'react';
import {
  Settings,
  Clock,
  Coffee,
  Database,
  Save,
  CheckCircle2,
  Globe,
  MapPin,
  Plus,
  Trash2,
  Building,
} from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    auto_checkout_time: '23:40',
    max_break_minutes: 30,
    standard_daily_hours: 8.0,
    route_retention_days: 15,
    attendance_retention_days: 45,
    timezone: 'Asia/Kolkata',
  });

  const [sites, setSites] = useState<any[]>([]);
  const [newSite, setNewSite] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 150,
  });
  const [siteLoading, setSiteLoading] = useState(false);

  const fetchSites = () => {
    fetch('/api/sites')
      .then((res) => res.json())
      .then((data) => setSites(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Could not load settings');
        setSettings(await response.json());
      })
      .catch((reason) => setError(reason.message));
    fetchSites();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not save settings');
      return;
    }
    setSettings(result);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteLoading(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSite.name,
          address: newSite.address,
          latitude: parseFloat(newSite.latitude),
          longitude: parseFloat(newSite.longitude),
          radius_meters: Number(newSite.radius_meters) || 150,
        }),
      });
      if (res.ok) {
        setNewSite({ name: '', address: '', latitude: '', longitude: '', radius_meters: 150 });
        fetchSites();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add site');
      }
    } catch {
      alert('Network error');
    } finally {
      setSiteLoading(false);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Are you sure you want to remove this site?')) return;
    await fetch(`/api/sites?id=${id}`, { method: 'DELETE' });
    fetchSites();
  };

  return (
    <div className="max-w-4xl space-y-4 mx-auto text-xs pb-16 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">Organization Policies & Geofences</h1>
          <p className="text-[10px] md:text-[11px] text-[#6B7280]">
            Attendance cutoff rules, daily shift hours, and verified physical site boundaries
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-2.5 rounded-lg border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#86EFAC] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> Policy values saved successfully.
        </div>
      )}
      {error && <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300">{error}</div>}

      <form onSubmit={handleSave} className="space-y-3">
        {/* Policy Section 1: Auto Cutoff & Working Hours */}
        <div className="p-3.5 rounded-lg dashboard-card space-y-2.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4 text-[#16A34A]" />
            <h3 className="font-bold text-xs dashboard-strong">Daily Shift & Auto Check-Out Policy</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Auto-Checkout Cutoff Time
              </label>
              <input
                type="time"
                value={settings.auto_checkout_time}
                onChange={(e) => setSettings({ ...settings, auto_checkout_time: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white font-mono text-xs focus:border-[#16A34A] focus:outline-none"
              />
              <p className="text-[10px] text-[#6B7280] mt-1">Default: 11:40 PM IST cutoff</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Standard Daily Hours (Cap)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={settings.standard_daily_hours ?? 8.0}
                onChange={(e) => setSettings({ ...settings, standard_daily_hours: parseFloat(e.target.value) || 8.0 })}
                className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs font-mono focus:border-[#16A34A] focus:outline-none"
              />
              <p className="text-[10px] text-[#6B7280] mt-1">Overtime counts past this threshold</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Timezone Standard</label>
              <input
                type="text"
                disabled
                value="(GMT+5:30) Asia/Kolkata (IST)"
                className="w-full px-2.5 py-1.5 rounded border border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-mono"
              />
              <p className="text-[10px] text-[#6B7280] mt-1">System clock reference</p>
            </div>
          </div>
        </div>

        {/* Policy Section 2: Breaks */}
        <div className="p-3.5 rounded-lg dashboard-card space-y-2.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Coffee className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-xs dashboard-strong">Lunch & Break Duration Cap</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Max Allowed Break
              </label>
              <select
                value={settings.max_break_minutes}
                onChange={(e) => setSettings({ ...settings, max_break_minutes: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs focus:border-[#16A34A] focus:outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes (Recommended)</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Break Tracking Mode</label>
              <input
                type="text"
                disabled
                value="Auto GPS Paused During Break"
                className="w-full px-2.5 py-1.5 rounded border border-slate-800 bg-slate-900/60 text-slate-400 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Policy Section 3: Data Retention */}
        <div className="p-3.5 rounded-lg dashboard-card space-y-2.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Database className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-xs dashboard-strong">Data Retention Policy</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Route Breadcrumbs History
              </label>
              <input
                type="text"
                disabled
                value="15 Days Rolling Retention"
                className="w-full px-2.5 py-1.5 rounded border border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Attendance Timesheets & Invoices
              </label>
              <input
                type="text"
                disabled
                value="45 Days Full Audit Trail"
                className="w-full px-2.5 py-1.5 rounded border border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Save Policy Changes
          </button>
        </div>
      </form>

      {/* Geofence Sites Management */}
      <div className="p-4 rounded-lg dashboard-card space-y-3 border border-slate-700/40">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs dashboard-strong">Geofenced Work Sites</h3>
          </div>
          <span className="text-[11px] text-slate-400">{sites.length} Active Sites</span>
        </div>

        {/* List of Sites */}
        <div className="space-y-2">
          {sites.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-2">No physical geofence sites configured yet. Add your first site below.</p>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="p-2.5 rounded bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-white">{site.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {site.latitude.toFixed(4)}°N, {site.longitude.toFixed(4)}°E • Radius: {site.radius_meters}m
                  </p>
                  {site.address && <p className="text-[10px] text-slate-500 mt-0.5">{site.address}</p>}
                </div>
                <button
                  onClick={() => handleDeleteSite(site.id)}
                  className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                  title="Delete Site"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Site Form */}
        <form onSubmit={handleAddSite} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5 pt-3">
          <h4 className="font-semibold text-[11px] text-slate-300">Add New Site Location</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Site Name (e.g. Main Office)"
              value={newSite.name}
              onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white"
              required
            />
            <input
              type="text"
              placeholder="Address / City"
              value={newSite.address}
              onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={newSite.latitude}
              onChange={(e) => setNewSite({ ...newSite, latitude: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white font-mono"
              required
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={newSite.longitude}
              onChange={(e) => setNewSite({ ...newSite, longitude: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white font-mono"
              required
            />
            <input
              type="number"
              placeholder="Radius (m)"
              value={newSite.radius_meters}
              onChange={(e) => setNewSite({ ...newSite, radius_meters: parseInt(e.target.value) || 150 })}
              className="px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-white font-mono"
              required
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={siteLoading}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Geofence Site
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
