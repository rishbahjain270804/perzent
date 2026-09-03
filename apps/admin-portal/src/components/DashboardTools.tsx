'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { todayInTimezone, shiftDate } from '@/lib/client';

/**
 * Shared filtering/viewing controls for the owner dashboard data pages: quick date presets with a
 * custom range, segmented quick-filters (status, department), sortable table headers, and a
 * CSV export helper. Kept dependency-free and client-side so every page filters the rows it
 * already fetched, without new endpoints.
 */

// ── Date presets ───────────────────────────────────────────────────────────
const firstOfMonth = (ymd: string) => `${ymd.slice(0, 7)}-01`;
const addMonths = (ymd: string, delta: number) => {
  const [y, m] = ymd.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
};
const lastOfMonth = (ymd: string) => {
  const [y, m] = ymd.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export type DatePreset = { key: string; label: string; range: (today: string) => [string, string] };

export const DATE_PRESETS: DatePreset[] = [
  { key: 'today', label: 'Today', range: (t) => [t, t] },
  { key: 'yesterday', label: 'Yesterday', range: (t) => [shiftDate(t, -1), shiftDate(t, -1)] },
  { key: '7d', label: 'Last 7 days', range: (t) => [shiftDate(t, -6), t] },
  { key: '30d', label: 'Last 30 days', range: (t) => [shiftDate(t, -29), t] },
  { key: 'month', label: 'This month', range: (t) => [firstOfMonth(t), t] },
  { key: 'lastMonth', label: 'Last month', range: (t) => [addMonths(t, -1), lastOfMonth(addMonths(t, -1))] },
];

export function DateRangeBar({
  from,
  to,
  onChange,
  timezone,
  className = '',
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  timezone?: string;
  className?: string;
}) {
  const today = todayInTimezone(timezone);
  const activeKey = useMemo(() => {
    for (const p of DATE_PRESETS) {
      const [f, t] = p.range(today);
      if (f === from && t === to) return p.key;
    }
    return 'custom';
  }, [from, to, today]);

  return (
    <div className={`dashboard-card rounded-lg p-2.5 space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {DATE_PRESETS.map((p) => {
          const active = activeKey === p.key;
          return (
            <button
              key={p.key}
              onClick={() => { const [f, t] = p.range(today); onChange(f, t); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                active ? 'bg-[#16A34A] text-white' : 'border dashboard-divider dashboard-nav-link'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          max={to || today}
          onChange={(e) => onChange(e.target.value, to)}
          className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-white text-[11px] focus:outline-none focus:border-[#16A34A]"
          aria-label="From date"
        />
        <span className="text-[11px] text-[#6B7280]">to</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => onChange(from, e.target.value)}
          className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-white text-[11px] focus:outline-none focus:border-[#16A34A]"
          aria-label="To date"
        />
        {activeKey === 'custom' && <span className="text-[10px] text-[#6B7280]">custom range</span>}
      </div>
    </div>
  );
}

// ── Segmented quick-filter ─────────────────────────────────────────────────
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel?: string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
            value === o.value ? 'bg-slate-700 text-white' : 'border dashboard-divider dashboard-nav-link'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Sortable table header ──────────────────────────────────────────────────
export type SortState<K extends string> = { key: K; dir: 'asc' | 'desc' };

export function useSort<K extends string>(initial: SortState<K>) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  return { sort, toggle };
}

export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'left',
  className = '',
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onToggle: (key: K) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th className={`px-3 py-2 ${align === 'right' ? 'text-right' : ''} ${className}`}>
      <button
        onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''} hover:text-slate-200 transition ${active ? 'text-slate-200' : ''}`}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${active ? 'opacity-100' : 'opacity-30'} ${active && sort.dir === 'asc' ? 'rotate-180' : ''}`} />
      </button>
    </th>
  );
}

export function sortRows<T>(rows: T[], key: string, dir: 'asc' | 'desc', accessors: Record<string, (row: T) => string | number>): T[] {
  const acc = accessors[key];
  if (!acc) return rows;
  const sorted = [...rows].sort((a, b) => {
    const va = acc(a);
    const vb = acc(b);
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
    return String(va).localeCompare(String(vb));
  });
  return dir === 'asc' ? sorted : sorted.reverse();
}

// ── CSV export (with spreadsheet formula-injection guard) ──────────────────
function csvCell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise =SUM(), etc.
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
