'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Coffee, Database, Save, Globe, MapPin, Plus, Trash2, KeyRound, Tablet, ShieldCheck, Smartphone, ExternalLink } from 'lucide-react';
import { apiFetch, errorMessage, TIMEZONE_OPTIONS } from '@/lib/client';
import {
  PageHeader,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  Notice,
  inputClass,
  labelClass,
  helpClass,
  btnPrimary,
  btnSecondary,
  errorText,
} from '@/components';

interface CompanySettings {
  auto_checkout_time: string;
  max_break_minutes: number;
  standard_daily_hours: number;
  route_retention_days: number;
  attendance_retention_days: number;
  timezone: string;
  plan_tier?: string;
}

interface Site {
  id: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

const LIMITS = {
  max_break_minutes: { min: 5, max: 180 },
  standard_daily_hours: { min: 1, max: 24 },
  route_retention_days: { min: 7, max: 90 },
  attendance_retention_days: { min: 30, max: 365 },
} as const;

const inRange = (value: number, key: keyof typeof LIMITS) => Number.isFinite(value) && value >= LIMITS[key].min && value <= LIMITS[key].max;

export default function SettingsPage() {
  /* Policies */
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  /* Sites */
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState('');
  const [newSite, setNewSite] = useState({ name: '', address: '', latitude: '', longitude: '', radius_meters: '150' });
  const [siteFormError, setSiteFormError] = useState('');
  const [addingSite, setAddingSite] = useState(false);
  const [deletingSite, setDeletingSite] = useState<string | null>(null);

  /* Password */
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await apiFetch<CompanySettings>('/api/settings');
      setSettings(data);
      setSettingsError('');
    } catch (reason) {
      setSettingsError(errorMessage(reason, 'Could not load settings.'));
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const data = await apiFetch<Site[]>('/api/sites');
      setSites(Array.isArray(data) ? data : []);
      setSitesError('');
    } catch (reason) {
      setSitesError(errorMessage(reason, 'Could not load sites.'));
    } finally {
      setSitesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadSites();
  }, [loadSettings, loadSites]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateSetting = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) =>
    setSettings((current) => (current ? { ...current, [key]: value } : current));

  const validateSettings = (s: CompanySettings) => {
    if (!/^\d{2}:\d{2}$/.test(s.auto_checkout_time)) return 'Auto check-out time must be HH:mm.';
    if (!inRange(s.max_break_minutes, 'max_break_minutes')) return `Max break must be between ${LIMITS.max_break_minutes.min} and ${LIMITS.max_break_minutes.max} minutes.`;
    if (!inRange(s.standard_daily_hours, 'standard_daily_hours')) return 'Standard daily hours must be between 1 and 24.';
    if (!inRange(s.route_retention_days, 'route_retention_days')) return 'Route retention must be between 7 and 90 days.';
    if (!inRange(s.attendance_retention_days, 'attendance_retention_days')) return 'Attendance retention must be between 30 and 365 days.';
    if (!s.timezone) return 'Choose a timezone.';
    return '';
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    const problem = validateSettings(settings);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const result = await apiFetch<CompanySettings>('/api/settings', {
        method: 'PATCH',
        json: {
          auto_checkout_time: settings.auto_checkout_time,
          max_break_minutes: settings.max_break_minutes,
          timezone: settings.timezone,
          standard_daily_hours: settings.standard_daily_hours,
          route_retention_days: settings.route_retention_days,
          attendance_retention_days: settings.attendance_retention_days,
        },
      });
      if (result && typeof result === 'object') setSettings((current) => ({ ...(current as CompanySettings), ...result }));
      setToast('Policies saved.');
    } catch (reason) {
      setSaveError(errorMessage(reason, 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddSite = async (event: React.FormEvent) => {
    event.preventDefault();
    const latitude = Number(newSite.latitude);
    const longitude = Number(newSite.longitude);
    const radius = Number(newSite.radius_meters);
    if (!newSite.name.trim()) return setSiteFormError('Enter a site name.');
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return setSiteFormError('Latitude must be between -90 and 90.');
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return setSiteFormError('Longitude must be between -180 and 180.');
    if (!Number.isFinite(radius) || radius < 20 || radius > 5000) return setSiteFormError('Radius must be between 20 and 5000 metres.');
    setAddingSite(true);
    setSiteFormError('');
    try {
      await apiFetch('/api/sites', {
        method: 'POST',
        json: { name: newSite.name.trim(), address: newSite.address.trim() || undefined, latitude, longitude, radius_meters: radius },
      });
      setNewSite({ name: '', address: '', latitude: '', longitude: '', radius_meters: '150' });
      setToast('Site added.');
      loadSites();
    } catch (reason) {
      setSiteFormError(errorMessage(reason, 'Could not add the site.'));
    } finally {
      setAddingSite(false);
    }
  };

  const handleDeleteSite = async (site: Site) => {
    if (!confirm(`Remove the geofence "${site.name}"?`)) return;
    setDeletingSite(site.id);
    setSitesError('');
    try {
      await apiFetch(`/api/sites?id=${encodeURIComponent(site.id)}`, { method: 'DELETE' });
      setSites((current) => current.filter((s) => s.id !== site.id));
      setToast('Site removed.');
    } catch (reason) {
      setSitesError(errorMessage(reason, 'Could not remove the site.'));
    } finally {
      setDeletingSite(null);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.new_password.length < 8) return setPasswordError('New password must be at least 8 characters.');
    if (passwordForm.new_password !== passwordForm.confirm) return setPasswordError('New password and confirmation do not match.');
    if (passwordForm.new_password === passwordForm.current_password) return setPasswordError('Choose a password different from the current one.');
    setChangingPassword(true);
    setPasswordError('');
    try {
      await apiFetch('/api/auth', {
        method: 'POST',
        json: { action: 'change_password', current_password: passwordForm.current_password, new_password: passwordForm.new_password },
      });
      setPasswordForm({ current_password: '', new_password: '', confirm: '' });
      setToast('Password changed.');
    } catch (reason) {
      setPasswordError(errorMessage(reason, 'Could not change the password.'));
    } finally {
      setChangingPassword(false);
    }
  };

  const numberField = (key: keyof typeof LIMITS, label: string, help: string, step = 1) => (
    <div>
      <label htmlFor={key} className={labelClass}>{label}</label>
      <input
        id={key}
        type="number"
        min={LIMITS[key].min}
        max={LIMITS[key].max}
        step={step}
        value={settings?.[key] ?? ''}
        onChange={(e) => updateSetting(key, e.target.value === '' ? (NaN as never) : Number(e.target.value))}
        className={`${inputClass} font-mono`}
        required
      />
      <p className={helpClass}>{help} ({LIMITS[key].min}–{LIMITS[key].max})</p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-4 mx-auto text-xs">
      <PageHeader title="Settings" description="Attendance policies, data retention, geofenced sites, your password and tools." />

      {toast && <div className="dashboard-toast"><Notice onDismiss={() => setToast('')}>{toast}</Notice></div>}
      <ErrorBanner message={settingsError} onRetry={loadSettings} retrying={settingsLoading} />

      {settingsLoading && !settings ? (
        <div className="dashboard-card rounded-lg"><LoadingRows rows={4} /></div>
      ) : settings ? (
        <form onSubmit={handleSave} className="space-y-3" noValidate>
          <div className="p-3.5 rounded-lg dashboard-card space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Clock className="w-4 h-4 text-[#16A34A]" />
              <h3 className="font-bold text-xs dashboard-strong">Shift & auto check-out</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label htmlFor="auto_checkout_time" className={labelClass}>Auto check-out time</label>
                <input
                  id="auto_checkout_time"
                  type="time"
                  required
                  value={settings.auto_checkout_time}
                  onChange={(e) => updateSetting('auto_checkout_time', e.target.value)}
                  className={`${inputClass} font-mono`}
                />
                <p className={helpClass}>Open shifts still running at this time are closed automatically (company timezone). Pick a time when nobody is working — for night shifts that ends after midnight, set a morning time such as 06:00, not 23:40.</p>
              </div>
              {numberField('standard_daily_hours', 'Standard daily hours', 'Hours beyond this count as overtime', 0.5)}
              <div>
                <label htmlFor="timezone" className={labelClass}>Company timezone</label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500 pointer-events-none" />
                  <select id="timezone" value={settings.timezone} onChange={(e) => updateSetting('timezone', e.target.value)} className={`${inputClass} pl-8`}>
                    {!TIMEZONE_OPTIONS.some((option) => option.value === settings.timezone) && settings.timezone && (
                      <option value={settings.timezone}>{settings.timezone}</option>
                    )}
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <p className={helpClass}>Used for work dates, auto check-out and reports.</p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg dashboard-card space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Coffee className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs dashboard-strong">Breaks</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {numberField('max_break_minutes', 'Maximum break (minutes)', 'Location pauses during a break')}
            </div>
          </div>

          <div className="p-3.5 rounded-lg dashboard-card space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Database className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-xs dashboard-strong">Data retention</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {numberField('route_retention_days', 'Route history (days)', 'GPS points and stops older than this are deleted')}
              {numberField('attendance_retention_days', 'Attendance records (days)', 'Shift records older than this are deleted')}
            </div>
            <p className={helpClass}>Retention is described to employees in the <Link href="/privacy" className="underline">privacy policy</Link>.</p>
          </div>

          {saveError && <p role="alert" className={errorText}>{saveError}</p>}

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className={btnPrimary}>
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save policies'}
            </button>
          </div>
        </form>
      ) : null}

      {/* Geofence sites */}
      <div className="p-4 rounded-lg dashboard-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs dashboard-strong">Geofenced work sites</h3>
          </div>
          <span className="text-[11px] text-slate-400">{sites.length} site{sites.length === 1 ? '' : 's'}</span>
        </div>
        <ErrorBanner message={sitesError} onRetry={loadSites} retrying={sitesLoading} />

        {sitesLoading ? (
          <LoadingRows rows={2} />
        ) : sites.length === 0 ? (
          !sitesError && <EmptyState icon={MapPin} title="No sites yet" description="Sites let the kiosk and reports label where a punch happened. Add your office or client locations below." compact />
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <div key={site.id} className="p-2.5 rounded bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-white truncate">{site.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)} · {site.radius_meters} m radius
                  </p>
                  {site.address && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{site.address}</p>}
                </div>
                <button
                  onClick={() => handleDeleteSite(site)}
                  disabled={deletingSite === site.id}
                  className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition disabled:opacity-50 shrink-0"
                  title="Remove site"
                  aria-label={`Remove ${site.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddSite} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5" noValidate>
          <h4 className="font-semibold text-[11px] text-slate-300">Add a site</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="text" placeholder="Site name (e.g. Main office)" value={newSite.name} onChange={(e) => setNewSite({ ...newSite, name: e.target.value })} className={inputClass} required aria-label="Site name" />
            <input type="text" placeholder="Address (optional)" value={newSite.address} onChange={(e) => setNewSite({ ...newSite, address: e.target.value })} className={inputClass} aria-label="Address" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="any" min={-90} max={90} placeholder="Latitude" value={newSite.latitude} onChange={(e) => setNewSite({ ...newSite, latitude: e.target.value })} className={`${inputClass} font-mono`} required aria-label="Latitude" />
            <input type="number" step="any" min={-180} max={180} placeholder="Longitude" value={newSite.longitude} onChange={(e) => setNewSite({ ...newSite, longitude: e.target.value })} className={`${inputClass} font-mono`} required aria-label="Longitude" />
            <input type="number" min={20} max={5000} placeholder="Radius (m)" value={newSite.radius_meters} onChange={(e) => setNewSite({ ...newSite, radius_meters: e.target.value })} className={`${inputClass} font-mono`} required aria-label="Radius in metres" />
          </div>
          <p className={helpClass}>Tip: right-click a spot in Google Maps to copy its latitude, longitude.</p>
          {siteFormError && <p role="alert" className={errorText}>{siteFormError}</p>}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={addingSite} className={btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> {addingSite ? 'Adding…' : 'Add site'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="p-4 rounded-lg dashboard-card space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <KeyRound className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-xs dashboard-strong">Change your password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end" noValidate>
          <div>
            <label htmlFor="current_password" className={labelClass}>Current password</label>
            <input id="current_password" type="password" autoComplete="current-password" required value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="new_password" className={labelClass}>New password</label>
            <input id="new_password" type="password" autoComplete="new-password" minLength={8} required value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className={inputClass} placeholder="At least 8 characters" />
          </div>
          <div>
            <label htmlFor="confirm_password" className={labelClass}>Confirm new password</label>
            <input id="confirm_password" type="password" autoComplete="new-password" minLength={8} required value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className={inputClass} />
          </div>
          {passwordError && <p role="alert" className={`${errorText} sm:col-span-3`}>{passwordError}</p>}
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={changingPassword || !passwordForm.current_password || passwordForm.new_password.length < 8 || !passwordForm.confirm}
              className={btnSecondary}
            >
              {changingPassword ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* Tools & links */}
      <div className="p-4 rounded-lg dashboard-card space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <h3 className="font-bold text-xs dashboard-strong">Tools & links</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link href="/kiosk" className="p-3 rounded border border-slate-800 bg-slate-900/60 hover:border-[#16A34A] transition flex items-start gap-2">
            <Tablet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <span className="block font-semibold text-xs text-white">Kiosk mode</span>
              <span className="block text-[10px] text-slate-400">Shared tablet at the site where staff check in with phone + password. Uses your signed-in session.</span>
            </span>
          </Link>
          <Link href="/download" className="p-3 rounded border border-slate-800 bg-slate-900/60 hover:border-[#16A34A] transition flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <span className="block font-semibold text-xs text-white">Android app</span>
              <span className="block text-[10px] text-slate-400">Download page with QR code for employees.</span>
            </span>
          </Link>
          <Link href="/privacy" className="p-3 rounded border border-slate-800 bg-slate-900/60 hover:border-[#16A34A] transition flex items-start gap-2">
            <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <span className="block font-semibold text-xs text-white">Privacy policy</span>
              <span className="block text-[10px] text-slate-400">What is collected from employees and for how long.</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
