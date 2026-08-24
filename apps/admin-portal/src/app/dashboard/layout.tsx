'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  MapPin,
  Moon,
  Receipt,
  Route,
  Settings,
  Smartphone,
  Sun,
  Users,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('perzent_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
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

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('perzent_theme', next);
      return next;
    });
  };

  if (!session) {
    return <div className="min-h-screen bg-slate-50 text-slate-500 grid place-items-center">Loading workspace…</div>;
  }

  return (
    <div className="dashboard-shell min-h-screen flex font-sans antialiased text-xs" data-theme={theme}>
      <aside className="dashboard-sidebar w-56 border-r flex flex-col justify-between shrink-0">
        <div>
          <div className="h-14 px-4 border-b dashboard-divider flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">P</div>
            <div className="flex flex-col">
              <span className="dashboard-strong font-bold text-sm tracking-tight leading-none">PERZENT</span>
              <span className="text-[10px] text-[#6B7280] leading-tight mt-0.5">Workforce operations</span>
            </div>
          </div>

          <nav className="p-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
                    isActive ? 'bg-[#16A34A] text-white font-semibold shadow-sm' : 'dashboard-nav-link'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t dashboard-divider space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="dashboard-avatar w-7 h-7 rounded font-bold text-xs flex items-center justify-center shrink-0">
                {session.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="dashboard-strong font-semibold text-[11px] truncate leading-tight">{session.full_name}</p>
                <p className="text-[10px] text-[#6B7280] leading-tight">{session.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Sign out" className="p-1.5 rounded text-slate-500 hover:text-red-500 transition">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="dashboard-topbar h-14 px-6 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B7280]">Workspace</span>
            <span className="dashboard-strong font-semibold">{session.company_name}</span>
          </div>
          <button onClick={toggleTheme} className="dashboard-theme-toggle" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            {theme === 'light' ? 'Dark' : 'Light'} theme
          </button>
        </header>

        <main className="dashboard-content flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
