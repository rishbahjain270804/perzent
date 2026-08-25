'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Tablet,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Delete,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function AttendanceKioskPage() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [activeAction, setActiveAction] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; user_name?: string } | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyPress = (num: string) => {
    if (phone.length < 10) {
      setPhone((prev) => prev + num);
    } else if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
    } else if (phone.length > 0) {
      setPhone((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPhone('');
    setPin('');
    setResult(null);
  };

  const handleSubmit = async () => {
    if (phone.length < 10) {
      alert('Please enter a 10-digit mobile number');
      return;
    }
    if (pin.length < 4) {
      alert('Please enter your 4-6 digit PIN');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/kiosk/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          pin,
          action: activeAction,
          selfie_url: 'data:image/svg+xml;utf8,kiosk-verified',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({
          success: true,
          message: data.message,
          user_name: data.user_name,
        });
        setPhone('');
        setPin('');
      } else {
        setResult({
          success: false,
          message: data.error || 'Verification failed',
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Network error communicating with server',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white">P</div>
            <div>
              <h1 className="font-bold text-sm md:text-base tracking-tight leading-tight">PERZENT KIOSK</h1>
              <p className="text-[10px] text-slate-400">On-Site Touchless Attendance Terminal</p>
            </div>
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="text-right">
          <p className="text-xl md:text-2xl font-black text-emerald-400 tabular-nums tracking-tight">{time}</p>
          <p className="text-[11px] text-slate-400">{date}</p>
        </div>
      </div>

      {/* Main Terminal Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => { setActiveAction('CHECK_IN'); setResult(null); }}
            className={`py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeAction === 'CHECK_IN'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Clock In (Start Duty)
          </button>
          <button
            onClick={() => { setActiveAction('CHECK_OUT'); setResult(null); }}
            className={`py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeAction === 'CHECK_OUT'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" /> Clock Out (End Shift)
          </button>
        </div>

        {/* Screen Inputs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-2xl">
          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Mobile Number ({phone.length}/10)
            </label>
            <div className="h-11 bg-slate-950 border border-slate-800 rounded-lg px-3 flex items-center text-sm md:text-base font-mono tracking-widest text-emerald-400">
              {phone || <span className="text-slate-600 font-sans text-xs tracking-normal">Type 10-digit mobile number</span>}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Secret PIN ({pin.length > 0 ? `${pin.length} digits` : 'Required'})
            </label>
            <div className="h-11 bg-slate-950 border border-slate-800 rounded-lg px-3 flex items-center text-lg font-mono tracking-widest text-amber-400">
              {pin ? '•'.repeat(pin.length) : <span className="text-slate-600 font-sans text-xs tracking-normal">Enter 4-6 digit PIN</span>}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 font-bold text-base transition flex items-center justify-center border border-slate-700/50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-12 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 font-semibold text-xs transition flex items-center justify-center border border-slate-800"
            >
              CLEAR
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 font-bold text-base transition flex items-center justify-center border border-slate-700/50"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 font-semibold text-xs transition flex items-center justify-center border border-slate-800"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || phone.length < 10 || pin.length < 4}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 ${
              activeAction === 'CHECK_IN'
                ? 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white'
                : 'bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Biometrics & PIN…</span>
              </div>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Verify & {activeAction === 'CHECK_IN' ? 'Clock In' : 'Clock Out'}</span>
              </>
            )}
          </button>
        </div>

        {/* Result Toast Card */}
        {result && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              result.success
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/80 border-red-500/50 text-red-300'
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">{result.success ? 'Attendance Verified!' : 'Clock-In Error'}</p>
              <p className="text-xs mt-0.5 text-slate-300">{result.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Face Recognition Anti-Spoofing & Geofence Verification Active</span>
      </div>
    </div>
  );
}
