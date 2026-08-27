'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Tablet, Clock, CheckCircle2, AlertCircle, ArrowLeft, UserCheck, LogOut, MapPin, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { apiFetch, errorMessage, ApiError, formatTime, type SessionInfo } from '@/lib/client';

type PunchAction = 'CHECK_IN' | 'CHECK_OUT';

interface Site {
  id: string;
  name: string;
}

interface PunchResult {
  success: boolean;
  action: PunchAction;
  user_name?: string;
  message: string;
  punch_in_time?: string;
  punch_out_time?: string;
  worked_hours?: number;
}

const RESET_SECONDS = 8;

export default function AttendanceKioskPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);

  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [activeAction, setActiveAction] = useState<PunchAction>('CHECK_IN');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; title: string; message: string; details?: string } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const timeZone = session?.company?.timezone;

  const loadSession = useCallback(async () => {
    setSessionLoading(true);
    setSessionError('');
    try {
      const data = await apiFetch<SessionInfo>('/api/auth'); // 401 → apiFetch redirects to /login?next=/kiosk
      setSession(data);
      apiFetch<Site[]>('/api/sites')
        .then((list) => setSites(Array.isArray(list) ? list : []))
        .catch(() => setSites([]));
    } catch (reason) {
      if (!(reason instanceof ApiError && reason.status === 401)) {
        setSessionError(errorMessage(reason, 'Could not verify the kiosk session.'));
      }
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      try {
        setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timeZone || undefined }));
        setDate(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: timeZone || undefined }));
      } catch {
        setTime(now.toLocaleTimeString());
        setDate(now.toLocaleDateString());
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [timeZone]);

  /* Auto-reset the result card so the next employee gets a clean screen. */
  useEffect(() => {
    if (!result) return;
    setCountdown(RESET_SECONDS);
    const tick = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    const timer = window.setTimeout(() => {
      setResult(null);
      phoneRef.current?.focus();
    }, RESET_SECONDS * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  }, [result]);

  const resetForm = () => {
    setPhone('');
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setResult({ ok: false, title: 'Check the phone number', message: 'Enter the 10-digit mobile number registered with the company.' });
      return;
    }
    if (!password) {
      setResult({ ok: false, title: 'Password required', message: 'Enter your app password to confirm it is you.' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch<PunchResult>('/api/kiosk/punch', {
        method: 'POST',
        json: { phone: digits, password, action: activeAction, ...(siteId ? { site_id: siteId } : {}) },
      });
      const isCheckIn = (data.action || activeAction) === 'CHECK_IN';
      const stamp = isCheckIn ? data.punch_in_time : data.punch_out_time;
      const details = [
        stamp ? `${isCheckIn ? 'In' : 'Out'} at ${formatTime(stamp, timeZone)}` : '',
        typeof data.worked_hours === 'number' ? `${data.worked_hours.toFixed(1)} h worked` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      setResult({
        ok: true,
        title: `${data.user_name ? `${data.user_name} — ` : ''}${isCheckIn ? 'checked in' : 'checked out'}`,
        message: data.message || (isCheckIn ? 'Have a good shift.' : 'See you next time.'),
        details,
      });
      resetForm();
    } catch (reason) {
      setResult({
        ok: false,
        title: activeAction === 'CHECK_IN' ? 'Check-in failed' : 'Check-out failed',
        message: errorMessage(reason, 'Could not reach the server. Try again.'),
      });
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const isCheckIn = activeAction === 'CHECK_IN';

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#16A34A] mx-auto flex items-center justify-center font-bold text-white">P</div>
          {sessionLoading ? (
            <p className="text-sm text-slate-400">Checking the kiosk sign-in…</p>
          ) : (
            <>
              <p className="text-sm text-red-300">{sessionError || 'The kiosk needs an owner or manager signed in.'}</p>
              <div className="flex justify-center gap-2">
                <button onClick={loadSession} className="px-3 py-1.5 rounded border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
                <Link href="/login?next=/kiosk" className="px-3 py-1.5 rounded bg-[#16A34A] text-xs font-semibold text-white">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shrink-0" aria-label="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">P</div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm md:text-base tracking-tight leading-tight truncate">{session.company?.name || 'Perzent'} · Kiosk</h1>
              <p className="text-[10px] text-slate-400 flex items-center gap-1"><Tablet className="w-3 h-3" /> Shared check-in terminal · signed in as {session.full_name}</p>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl md:text-2xl font-black text-emerald-400 tabular-nums tracking-tight">{time}</p>
          <p className="text-[11px] text-slate-400">{date}</p>
        </div>
      </div>

      {/* Terminal */}
      <div className="max-w-md w-full mx-auto my-auto space-y-4 py-6">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800" role="tablist" aria-label="Action">
          <button
            type="button"
            role="tab"
            aria-selected={isCheckIn}
            onClick={() => {
              setActiveAction('CHECK_IN');
              setResult(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              isCheckIn ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Check-in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isCheckIn}
            onClick={() => {
              setActiveAction('CHECK_OUT');
              setResult(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              !isCheckIn ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogOut className="w-4 h-4" /> Check-out
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-2xl" noValidate>
          <div>
            <label htmlFor="kiosk_phone" className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Mobile number</label>
            <input
              ref={phoneRef}
              id="kiosk_phone"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              maxLength={13}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="10-digit mobile number"
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base font-mono tracking-widest text-emerald-400 placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="kiosk_password" className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">App password</label>
            <div className="relative">
              <input
                id="kiosk_password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Same password as the Android app"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-lg px-3 pr-11 text-base font-mono text-amber-400 placeholder:font-sans placeholder:text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {sites.length > 0 && (
            <div>
              <label htmlFor="kiosk_site" className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Site <span className="normal-case font-normal text-slate-500">(optional)</span></label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select id="kiosk_site" value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full h-11 bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500">
                  <option value="">Not at a listed site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || phone.replace(/\D/g, '').length < 10 || !password}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              isCheckIn ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                <span>Recording…</span>
              </>
            ) : (
              <>
                {isCheckIn ? <UserCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                <span>{isCheckIn ? 'Check in now' : 'Check out now'}</span>
              </>
            )}
          </button>
        </form>

        {result && (
          <div
            role={result.ok ? 'status' : 'alert'}
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              result.ok ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' : 'bg-red-950/80 border-red-500/50 text-red-200'
            }`}
          >
            {result.ok ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">{result.title}</p>
              <p className="text-xs mt-0.5 text-slate-300">{result.message}</p>
              {result.details && <p className="text-xs mt-1 font-mono text-slate-400">{result.details}</p>}
              <p className="text-[10px] mt-2 text-slate-500">Clears in {countdown}s</p>
            </div>
            <button type="button" onClick={() => setResult(null)} className="text-[11px] underline text-slate-400 shrink-0">Dismiss</button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-500">
        Punches are recorded against the phone number entered and stamped with the company time{timeZone ? ` (${timeZone})` : ''}.
      </div>
    </div>
  );
}
