'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, User, Lock, ArrowRight, Globe, CheckCircle2 } from 'lucide-react';
import { apiFetch, errorMessage, DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from '@/lib/client';

const fieldClass =
  'w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    company_name: '',
    owner_name: '',
    email: '',
    phone: '',
    password: '',
    timezone: DEFAULT_TIMEZONE,
  });
  const [error, setError] = useState('');

  // Default the company timezone to the browser's zone when it is one we list; India stays the fallback.
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && TIMEZONE_OPTIONS.some((option) => option.value === detected)) {
        setFormData((prev) => (prev.timezone === DEFAULT_TIMEZONE ? { ...prev, timezone: detected } : prev));
      }
    } catch {
      // Keep the default.
    }
  }, []);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((current) => ({ ...current, [key]: event.target.value }));

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth', {
        method: 'POST',
        json: {
          action: 'register',
          company_name: formData.company_name.trim(),
          owner_name: formData.owner_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          timezone: formData.timezone,
        },
      });
      router.replace('/dashboard');
    } catch (reason) {
      setError(errorMessage(reason, 'Registration failed'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4 py-8 text-slate-100 font-sans antialiased text-xs">
      <div className="max-w-sm w-full border border-slate-800 bg-[#0F172A] rounded-lg p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <div className="w-7 h-7 rounded bg-[#16A34A] text-white font-bold text-sm flex items-center justify-center shrink-0">P</div>
          <div>
            <h2 className="font-bold text-sm text-white leading-tight">PERZENT</h2>
            <p className="text-[10px] text-[#6B7280] leading-tight">Create your company workspace</p>
          </div>
        </div>

        <div className="p-2.5 rounded border border-[#16A34A]/30 bg-[#16A34A]/10 text-[11px] text-[#86EFAC] flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Free launch plan.</strong> Unlimited employees, live map, route history and timesheets — no card required.
          </span>
        </div>

        {error && (
          <div role="alert" className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label htmlFor="company_name" className="block text-[11px] font-semibold text-slate-400 mb-1">Company name</label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
              <input
                id="company_name"
                type="text"
                required
                minLength={2}
                value={formData.company_name}
                onChange={update('company_name')}
                placeholder="Acme Logistics Pvt Ltd"
                className={`${fieldClass} pl-8`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="owner_name" className="block text-[11px] font-semibold text-slate-400 mb-1">Your name (owner)</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
              <input
                id="owner_name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                value={formData.owner_name}
                onChange={update('owner_name')}
                placeholder="Rajesh Sharma"
                className={`${fieldClass} pl-8`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="phone" className="block text-[11px] font-semibold text-slate-400 mb-1">Phone</label>
              <input
                id="phone"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={update('phone')}
                placeholder="+91 98765 43210 (with country code)"
                minLength={10}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={update('email')}
                placeholder="rajesh@acme.com"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-[11px] font-semibold text-slate-400 mb-1">Company timezone</label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500 pointer-events-none" />
              <select id="timezone" value={formData.timezone} onChange={update('timezone')} className={`${fieldClass} pl-8`}>
                {TIMEZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-[#6B7280] mt-1">Attendance dates, auto check-out and reports use this timezone.</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={formData.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                className={`${fieldClass} pl-8`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            {loading ? 'Creating workspace…' : 'Create free account'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <p className="text-[10px] text-[#6B7280] text-center">
            By continuing you agree to our <Link href="/privacy" className="underline">privacy policy</Link>.
          </p>
        </form>

        <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-[#6B7280]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#86EFAC] hover:underline font-semibold">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
