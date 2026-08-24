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
} from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    auto_checkout_time: '23:40',
    max_break_minutes: 30,
    route_retention_days: 15,
    attendance_retention_days: 45,
    timezone: 'Asia/Kolkata',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Could not load settings');
        setSettings(await response.json());
      })
      .catch((reason) => setError(reason.message));
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

  return (
    <div className="max-w-4xl space-y-3 md:space-y-4 mx-auto text-xs pb-16 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">Organization Policies & Rules</h1>
          <p className="text-[10px] md:text-[11px] text-[#6B7280]">
            Attendance auto-cutoff, break limits, and data retention rules
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-2 rounded border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#86EFAC] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> Policy values saved successfully.
        </div>
      )}
      {error && <div className="p-2 rounded border border-red-500/40 bg-red-500/10 text-red-300">{error}</div>}

      <form onSubmit={handleSave} className="space-y-3">
        {/* Policy Section 1: Auto Cutoff */}
        <div className="p-3.5 rounded-lg dashboard-card space-y-2.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4 text-[#16A34A]" />
            <h3 className="font-bold text-xs dashboard-strong">Daily Auto Check-Out Rule</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
              <p className="text-[10px] text-[#6B7280] mt-1">Default: 11:40 PM IST nightly cutoff</p>
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

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" /> Save Policy Changes
          </button>
        </div>
      </form>
    </div>
  );
}
