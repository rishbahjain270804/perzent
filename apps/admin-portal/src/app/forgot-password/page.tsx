'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BRAND } from '@perzent/shared-types';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'request', email }),
      });
      const json = await response.json().catch(() => ({}));
      setMessage({ kind: response.ok ? 'ok' : 'error', text: json.message || json.error || (response.ok ? 'Check your email.' : 'Something went wrong.') });
    } catch {
      setMessage({ kind: 'error', text: 'Could not reach the server. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="space-y-1">
          <div className="w-9 h-9 rounded-lg bg-[#16A34A] text-white font-bold flex items-center justify-center">P</div>
          <h1 className="text-lg font-bold text-slate-900 pt-2">Forgot your password?</h1>
          <p className="text-sm text-slate-600">Owners and managers: enter the email on your account and we will send a reset link.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !email}
            className="w-full rounded-lg bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-semibold text-sm py-2.5"
          >
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        {message && (
          <p className={`text-sm rounded-lg px-3 py-2 ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>
        )}
        <div className="text-xs text-slate-500 space-y-1">
          <p>Employees: your manager resets your password from the Employees page in the portal or the app.</p>
          <p>
            <Link href="/login" className="text-[#15803D] underline">Back to sign in</Link> · <a href={`mailto:${BRAND.supportEmail}`} className="underline">{BRAND.supportEmail}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
