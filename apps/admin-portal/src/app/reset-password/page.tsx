'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setMessage({ kind: 'error', text: 'The two passwords do not match.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', token, new_password: password }),
      });
      const json = await response.json().catch(() => ({}));
      setMessage({ kind: response.ok ? 'ok' : 'error', text: json.message || json.error || (response.ok ? 'Password updated.' : 'Something went wrong.') });
      if (response.ok) setDone(true);
    } catch {
      setMessage({ kind: 'error', text: 'Could not reach the server. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-slate-600">
        This link is incomplete. <Link href="/forgot-password" className="text-[#15803D] underline">Request a new reset link</Link>.
      </p>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">New password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-xs font-semibold text-slate-700 mb-1">Repeat new password</label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
        </div>
        <button
          type="submit"
          disabled={busy || done || password.length < 8}
          className="w-full rounded-lg bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-semibold text-sm py-2.5"
        >
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </form>
      {message && (
        <p className={`text-sm rounded-lg px-3 py-2 ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>
      )}
      {done && (
        <Link href="/login" className="block text-center text-sm font-semibold text-[#15803D] underline">Go to sign in</Link>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="space-y-1">
          <div className="w-9 h-9 rounded-lg bg-[#16A34A] text-white font-bold flex items-center justify-center">P</div>
          <h1 className="text-lg font-bold text-slate-900 pt-2">Choose a new password</h1>
          <p className="text-sm text-slate-600">The link works once and expires 30 minutes after it was requested.</p>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
