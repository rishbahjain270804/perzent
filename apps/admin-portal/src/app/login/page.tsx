'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('+919876543210');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_or_email: identifier,
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('perzent_session', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (phone: string) => {
    setIdentifier(phone);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4 text-slate-100 font-sans antialiased text-xs">
      <div className="max-w-sm w-full border border-slate-800 bg-[#0F172A] rounded-lg p-6 space-y-4">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <div className="w-7 h-7 rounded bg-[#16A34A] text-white font-bold text-sm flex items-center justify-center shrink-0">
            P
          </div>
          <div>
            <h2 className="font-bold text-sm text-white leading-tight">PERZENT</h2>
            <p className="text-[10px] text-[#6B7280] leading-tight">Manager & Owner Access</p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Registered Phone / Email
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Fast Fill */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px]">
          <span className="text-[#6B7280]">Quick Demo Login:</span>
          <div className="flex gap-2">
            <button
              onClick={() => fillDemo('+919876543210')}
              className="flex-1 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-[10px]"
            >
              Rajesh (Owner)
            </button>
            <button
              onClick={() => fillDemo('+919876543211')}
              className="flex-1 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-[10px]"
            >
              Priya (Manager)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
