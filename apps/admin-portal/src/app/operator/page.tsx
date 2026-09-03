'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, KeyRound, LogOut, RefreshCw, Users } from 'lucide-react';
import { PerzentLogo } from '@/components/PerzentLogo';

/**
 * JSP Coders operator console — platform-wide, read-only. Not linked from anywhere and noindexed;
 * access needs the operator secret (OPERATOR_SECRET, falling back to CRON_SECRET), which is sent
 * as a bearer token on every request and kept only in sessionStorage.
 */

const KEY_STORAGE = 'perzent_operator_key';

interface Totals {
  companies: number;
  owners: number;
  managers: number;
  employees: number;
  waitlist: number;
  checkins_24h: number;
  active_sessions: number;
}

interface CompanyRow {
  id: string;
  name: string;
  owner_email: string;
  timezone: string;
  plan_tier: string;
  created_at: string;
  user_count: number;
  owners: Array<{ full_name: string; email?: string | null; phone: string; status: string }>;
  last_activity?: string | null;
}

interface WaitlistRow {
  id: string;
  email: string;
  company_name?: string | null;
  staff_size?: number | null;
  phone?: string | null;
  source?: string | null;
  created_at: string;
}

interface RosterUser {
  id: string;
  full_name: string;
  role: string;
  phone: string;
  email?: string | null;
  designation?: string | null;
  status: string;
  created_at: string;
  department?: { name?: string } | null;
  manager?: { full_name?: string } | null;
}

interface Overview {
  totals: Totals;
  companies: CompanyRow[];
  waitlist: WaitlistRow[];
}

const fmt = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function OperatorPage() {
  const [key, setKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rosters, setRosters] = useState<Record<string, RosterUser[]>>({});
  const [rosterLoading, setRosterLoading] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORAGE);
      if (saved) setKey(saved);
    } catch { /* storage unavailable */ }
  }, []);

  const load = useCallback(async (activeKey: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/operator/overview', { headers: { Authorization: `Bearer ${activeKey}` } });
      if (res.status === 401) {
        setError('That key was not accepted.');
        setData(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      try { sessionStorage.setItem(KEY_STORAGE, activeKey); } catch { /* storage unavailable */ }
    } catch {
      setError('Could not load the overview. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key) load(key);
  }, [key, load]);

  const toggleCompany = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!rosters[id]) {
      setRosterLoading(id);
      try {
        const res = await fetch(`/api/operator/company?id=${id}`, { headers: { Authorization: `Bearer ${key}` } });
        if (res.ok) {
          const payload = await res.json();
          setRosters((current) => ({ ...current, [id]: payload.company?.users ?? [] }));
        }
      } finally {
        setRosterLoading('');
      }
    }
  };

  const signOut = () => {
    setKey('');
    setData(null);
    setKeyInput('');
    try { sessionStorage.removeItem(KEY_STORAGE); } catch { /* storage unavailable */ }
  };

  if (!key || (!data && !loading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <PerzentLogo markClassName="h-9 w-9" textClassName="text-lg" />
          <div>
            <h1 className="text-base font-bold text-slate-900">Operator console</h1>
            <p className="text-xs text-slate-500 mt-1">JSP Coders internal. Enter the operator key to continue.</p>
          </div>
          <form
            onSubmit={(event) => { event.preventDefault(); if (keyInput.trim()) setKey(keyInput.trim()); }}
            className="space-y-3"
          >
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                placeholder="Operator key"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-2 transition">
              Open console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <PerzentLogo markClassName="h-7 w-7" textClassName="text-base" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-l border-slate-200 pl-3">Operator console</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(key)} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white transition">
            <LogOut className="w-3.5 h-3.5" /> Lock
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {error && <p className="text-xs text-red-600">{error}</p>}
        {!data ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            {/* Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {([
                ['Companies', data.totals.companies],
                ['Owners', data.totals.owners],
                ['Managers', data.totals.managers],
                ['Employees', data.totals.employees],
                ['Waitlist', data.totals.waitlist],
                ['Check-ins 24h', data.totals.checkins_24h],
                ['Live sessions', data.totals.active_sessions],
              ] as Array<[string, number]>).map(([label, value]) => (
                <div key={label} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="text-lg font-black tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            {/* Companies */}
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Building2 className="w-4 h-4 text-emerald-600" /> Companies</h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {data.companies.length === 0 && <p className="p-4 text-xs text-slate-500">No companies registered yet.</p>}
                {data.companies.map((company) => (
                  <div key={company.id}>
                    <button onClick={() => toggleCompany(company.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate flex items-center gap-1.5">
                            {expanded === company.id ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            {company.name}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">{company.plan_tier}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {company.owner_email} · {company.timezone} · registered {fmt(company.created_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black tabular-nums">{company.user_count}<span className="text-[10px] font-semibold text-slate-400"> users</span></p>
                          <p className="text-[10px] text-slate-400">last check-in {company.last_activity ? fmt(company.last_activity) : 'never'}</p>
                        </div>
                      </div>
                    </button>
                    {expanded === company.id && (
                      <div className="px-4 pb-3 bg-slate-50/60">
                        {rosterLoading === company.id && <p className="text-xs text-slate-500 py-2">Loading roster…</p>}
                        {rosters[company.id] && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="text-left text-slate-400 uppercase tracking-wide text-[9px]">
                                  <th className="py-1.5 pr-3">Name</th>
                                  <th className="py-1.5 pr-3">Role</th>
                                  <th className="py-1.5 pr-3">Phone</th>
                                  <th className="py-1.5 pr-3">Email</th>
                                  <th className="py-1.5 pr-3">Department</th>
                                  <th className="py-1.5 pr-3">Status</th>
                                  <th className="py-1.5">Joined</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {rosters[company.id].map((user) => (
                                  <tr key={user.id}>
                                    <td className="py-1.5 pr-3 font-semibold">{user.full_name}{user.designation ? <span className="text-slate-400 font-normal"> · {user.designation}</span> : null}</td>
                                    <td className="py-1.5 pr-3">{user.role}</td>
                                    <td className="py-1.5 pr-3">{user.phone}</td>
                                    <td className="py-1.5 pr-3">{user.email || '—'}</td>
                                    <td className="py-1.5 pr-3">{user.department?.name || '—'}</td>
                                    <td className={`py-1.5 pr-3 font-semibold ${user.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-600'}`}>{user.status}</td>
                                    <td className="py-1.5">{fmt(user.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Waitlist */}
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Users className="w-4 h-4 text-emerald-600" /> Early-access waitlist <span className="text-[11px] font-semibold text-slate-400">({data.totals.waitlist})</span></h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                {data.waitlist.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">No signups yet.</p>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-slate-400 uppercase tracking-wide text-[9px] border-b border-slate-100">
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Company</th>
                        <th className="px-4 py-2">Staff size</th>
                        <th className="px-4 py-2">Phone</th>
                        <th className="px-4 py-2">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.waitlist.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-2 font-semibold">{entry.email}</td>
                          <td className="px-4 py-2">{entry.company_name || '—'}</td>
                          <td className="px-4 py-2 tabular-nums">{entry.staff_size ?? '—'}</td>
                          <td className="px-4 py-2">{entry.phone || '—'}</td>
                          <td className="px-4 py-2">{fmt(entry.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                To onboard a lead: send them https://perzent.jspcoders.app/register — registration works even while the site is in coming-soon mode.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
