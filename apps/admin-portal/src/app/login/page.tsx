'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Phone, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

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

  const fillDemo = (phone: string, role: string) => {
    setIdentifier(phone);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          {/* Primary Logo: White on Green */}
          <div className="w-11 h-11 rounded-xl bg-[#16A34A] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-green-600/30">
            P
          </div>
          {/* Secondary Version showcase */}
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-xl text-[#111827] shadow-sm">
            P
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">PERZENT PORTAL</h2>
            <p className="text-xs text-[#6B7280]">Business Owner & Manager Authentication</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Registered Phone or Email
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3.5 top-3 text-[#6B7280]" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+91 98765 43210 or email"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#16A34A] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-[#6B7280]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#16A34A] text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-green-600/25 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'} <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
            Quick 1-Click Demo Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => fillDemo('+919876543210', 'Owner')}
              className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-[#16A34A] text-left text-slate-300 transition flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <div>
                <p className="font-semibold text-white">Rajesh (Owner)</p>
                <p className="text-[10px] text-[#6B7280]">All Departments</p>
              </div>
            </button>
            <button
              onClick={() => fillDemo('+919811122200', 'Manager')}
              className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-[#16A34A] text-left text-slate-300 transition flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-[#16A34A]" />
              <div>
                <p className="font-semibold text-white">Priya (Manager)</p>
                <p className="text-[10px] text-[#6B7280]">North Sales Hub</p>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/register" className="text-xs text-[#86EFAC] hover:underline">
            Need to register a new company? Click here
          </Link>
        </div>
      </div>
    </div>
  );
}
