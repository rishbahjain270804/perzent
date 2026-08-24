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

      localStorage.setItem('perzent_session', JSON.stringify(data));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-lg w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          {/* Primary Logo: White on Green */}
          <div className="w-11 h-11 rounded-xl bg-[#16A34A] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-green-600/30">
            P
          </div>
          {/* Secondary Version showcase */}
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-xl text-[#111827] shadow-sm">
            P
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">PERZENT ONBOARDING</h2>
            <p className="text-xs text-[#6B7280]">Register New Business & Superadmin</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Company Name
            </label>
            <div className="relative">
              <Building2 className="w-5 h-5 absolute left-3.5 top-3 text-[#6B7280]" />
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Acme Logistics Pvt Ltd"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#16A34A] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Owner Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-[#6B7280]" />
              <input
                type="text"
                required
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#16A34A] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3 text-[#6B7280]" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rajesh@acme.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#16A34A] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3.5 top-3 text-[#6B7280]" />
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#16A34A] text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-[#6B7280]" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create password"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#16A34A] text-sm"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/25 text-xs text-[#86EFAC] leading-relaxed">
            <span className="font-semibold text-white">Company Policies Default:</span> 11:40 PM IST Auto-Checkout, 30-Minute Lunch Break Cap, 15-Day Route History, 45-Day Attendance Records, Hardware Device Anti-Tamper Protection.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-green-600/25 disabled:opacity-50"
          >
            {loading ? 'Creating Organization...' : 'Create Organization & Launch'} <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-[#86EFAC] hover:underline">
            Already have an account? Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
