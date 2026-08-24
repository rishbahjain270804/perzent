'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Phone, ArrowRight, ShieldCheck, Building2, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4 py-8 text-slate-100 font-sans antialiased text-xs">
      <div className="max-w-sm w-full border border-slate-800 bg-[#0F172A] rounded-lg p-5 sm:p-6 space-y-4 shadow-xl">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#16A34A] text-white font-bold text-sm flex items-center justify-center shrink-0">
              P
            </div>
            <div>
              <h2 className="font-bold text-sm text-white leading-tight">PERZENT</h2>
              <p className="text-[10px] text-[#6B7280] leading-tight">Manager & Owner Access</p>
            </div>
          </div>
          <Link
            href="/register"
            className="text-[11px] font-semibold text-[#86EFAC] hover:text-white transition flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" /> Sign Up
          </Link>
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
                placeholder="+91 98765 43210 or rajesh@acme.com"
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
            {loading ? 'Authenticating...' : 'Sign In to Workspace'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="p-2.5 rounded border border-slate-800 bg-slate-900/50 space-y-1 text-[10px] text-slate-400 font-mono">
          <p className="font-semibold text-slate-300">Quick Demo Accounts (pw: password123):</p>
          <p>• Owner: <span className="text-white">+919876543210</span></p>
          <p>• Manager: <span className="text-white">+919876543211</span></p>
          <p>• Employee: <span className="text-white">+919876543212</span></p>
        </div>

        {/* New Company Registration CTA */}
        <div className="pt-2 border-t border-slate-800 text-center space-y-2">
          <p className="text-[11px] text-[#6B7280]">
            Don't have an organization workspace yet?
          </p>
          <Link
            href="/register"
            className="w-full py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[#86EFAC] hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Building2 className="w-3.5 h-3.5" /> Sign Up New Company (Owner Account)
          </Link>
        </div>
      </div>
    </div>
  );
}
