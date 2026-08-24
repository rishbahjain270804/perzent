'use client';
import { useState } from 'react';
import {
  Settings,
  Clock,
  Coffee,
  Database,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    auto_checkout_time: '23:40',
    max_break_minutes: 30,
    route_retention_days: 15,
    attendance_retention_days: 45,
    timezone: 'Asia/Kolkata',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#16A34A]" /> Organization Policies & Automation Rules
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Configure end-of-day auto checkout cutoffs, break duration caps, and storage retention policies
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-[#16A34A]/15 border border-[#16A34A]/30 text-xs text-[#86EFAC] font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Policies successfully updated!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A]/15 text-[#86EFAC] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Automated Daily Shift Cutoff</h3>
              <p className="text-xs text-[#6B7280]">
                Any employee shift left open is automatically checked out and tracking stops unconditionally.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">
                Auto-Checkout Time (IST)
              </label>
              <input
                type="time"
                value={settings.auto_checkout_time}
                onChange={(e) => setSettings({ ...settings, auto_checkout_time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#16A34A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Timezone</label>
              <input
                type="text"
                disabled
                value="(GMT+5:30) Asia/Kolkata (Indian Standard Time)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Lunch & Personal Break Auto-Resume Cap</h3>
              <p className="text-xs text-[#6B7280]">
                Tracking is paused during lunch break. If employee forgets to resume, tracking automatically resumes after this limit.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">
              Max Break Duration (Minutes)
            </label>
            <select
              value={settings.max_break_minutes}
              onChange={(e) => setSettings({ ...settings, max_break_minutes: Number(e.target.value) })}
              className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#16A34A] focus:outline-none"
            >
              <option value="30">30 Minutes (Standard)</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A]/15 text-[#86EFAC] flex items-center justify-center">
              <Database className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Data Retention & Storage Limits (Free Tier)</h3>
              <p className="text-xs text-[#6B7280]">
                Automated 02:00 AM daily pruning job deletes expired records past these thresholds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-[#6B7280] font-semibold">Route History Retention:</span>
              <p className="text-lg font-bold text-white mt-1">15 Calendar Days</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-[#6B7280] font-semibold">Attendance Timesheet Retention:</span>
              <p className="text-lg font-bold text-white mt-1">45 Calendar Days</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-green-600/25"
        >
          <Save className="w-4 h-4 text-white" /> Save Organization Settings
        </button>
      </form>
    </div>
  );
}
