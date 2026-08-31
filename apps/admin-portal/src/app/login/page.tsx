'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Phone, ArrowRight, Building2, UserPlus } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/client';

/** Only allow same-origin, non-auth relative paths as a post-login destination. */
function safeNext(value: string | null): string {
  if (!value) return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/login') || value.startsWith('/register')) {
    return '/dashboard';
  }
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/auth', {
        method: 'POST',
        json: { phone_or_email: identifier.trim(), password },
      });
      router.replace(next);
    } catch (reason) {
      setError(errorMessage(reason, 'Login failed'));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm w-full border border-slate-800 bg-[#0F172A] rounded-lg p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#16A34A] text-white font-bold text-sm flex items-center justify-center shrink-0">P</div>
          <div>
            <h2 className="font-bold text-sm text-white leading-tight">PERZENT</h2>
            <p className="text-[10px] text-[#6B7280] leading-tight">Owner & manager sign in</p>
          </div>
        </div>
        <Link href="/register" className="text-[11px] font-semibold text-[#86EFAC] hover:text-white transition flex items-center gap-1">
          <UserPlus className="w-3 h-3" /> Sign up
        </Link>
      </div>

      {next !== '/dashboard' && (
        <p className="text-[10px] text-[#6B7280]">Sign in to continue to <span className="font-mono text-slate-300">{next}</span>.</p>
      )}

      {error && (
        <div role="alert" className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-3" noValidate>
        <div>
          <label htmlFor="identifier" className="block text-[11px] font-semibold text-slate-400 mb-1">Phone or email</label>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
            <input
              id="identifier"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="+91 98765 43210 or you@company.com"
              className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !identifier.trim() || !password}
          className="w-full py-2 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
        >
          {loading ? 'Signing in…' : 'Sign in'} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      <div className="pt-2 border-t border-slate-800 text-center space-y-2">
        <p className="text-[11px]">
          <Link href="/forgot-password" className="text-[#86EFAC] hover:text-white underline underline-offset-2">Forgot your password?</Link>
        </p>
        <p className="text-[11px] text-[#6B7280]">New to Perzent? The launch plan is free — unlimited staff.</p>
        <Link
          href="/register"
          className="w-full py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[#86EFAC] hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Building2 className="w-3.5 h-3.5" /> Create a company account
        </Link>
        <p className="text-[10px] text-[#6B7280]">
          Employees sign in from the <Link href="/download" className="underline">Android app</Link>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4 py-8 text-slate-100 font-sans antialiased text-xs">
      <Suspense fallback={<div className="text-[#6B7280] text-xs">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
