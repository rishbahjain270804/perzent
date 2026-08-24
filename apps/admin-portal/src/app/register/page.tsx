'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    company_name: '',
    owner_name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...formData,
          timezone: 'Asia/Kolkata',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            <p className="text-[10px] text-[#6B7280] leading-tight">Create Organization Account</p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Company Name
            </label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Acme Logistics Pvt Ltd"
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Owner Name
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-500" />
              <input
                type="text"
                required
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="Rajesh Sharma"
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765..."
                className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rajesh@acme.com"
                className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A] text-xs"
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
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            {loading ? 'Creating...' : 'Register Business'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-[#6B7280]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#86EFAC] hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
