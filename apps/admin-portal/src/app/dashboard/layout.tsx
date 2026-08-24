'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Route,
  CalendarCheck,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  Clock,
  Coffee,
  Receipt,
  Smartphone,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unauthenticated');
        setSession(await response.json());
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Map', href: '/dashboard/live-map', icon: MapPin },
    { name: 'Route History', href: '/dashboard/routes', icon: Route },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Employees', href: '/dashboard/employees', icon: Users },
    { name: 'Billing & Invoices', href: '/dashboard/billing', icon: Receipt },
    { name: 'Download App (APK)', href: '/download', icon: Smartphone },
    { name: 'Policies & Settings', href: '/dashboard/settings', icon: Settings },
  ].filter((item) => session?.role === 'OWNER' || !['Billing & Invoices', 'Policies & Settings'].includes(item.name));

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/login');
  };

  if (!session) {
    return <div className="min-h-screen bg-[#0F172A] text-slate-400 grid place-items-center">Loading workspace…</div>;
  }

  return (
    <div className="min-h-screen flex bg-[#0F172A] text-slate-100 font-sans antialiased text-xs">
      {/* Minimalist Flat Sidebar */}
      <aside className="w-56 bg-[#0B1120] border-r border-slate-800/80 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="h-14 px-4 border-b border-slate-800/80 flex items-center gap-2.5">
            {/* Primary Logo: White on Green (#16A34A) */}
            <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white leading-none">PERZENT</span>
              <span className="text-[10px] text-[#6B7280] leading-tight mt-0.5">Enterprise Fleet</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-[#16A34A] text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded bg-white text-[#111827] font-bold text-xs flex items-center justify-center shrink-0">
                {session?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="font-semibold text-[11px] text-white truncate leading-tight">{session?.full_name || 'Rajesh Sharma'}</p>
                <p className="text-[10px] text-[#6B7280] leading-tight">{session?.role || 'OWNER'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1 rounded text-slate-500 hover:text-red-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Minimal Header */}
        <header className="h-14 px-6 bg-[#0B1120] border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B7280]">Workspace:</span>
            <span className="font-medium text-white">{session?.company_name || 'Acme Logistics Pvt Ltd'}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6B7280]">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
              Auto-Cutoff: 11:40 PM IST
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-slate-300">
              <Coffee className="w-3 h-3 text-amber-400" />
              Lunch: 30m Cap
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#0F172A]">{children}</main>
      </div>
    </div>
  );
}
