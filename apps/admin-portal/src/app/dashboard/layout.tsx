'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Receipt,
  Route,
  Settings,
  Smartphone,
  Sun,
  Tablet,
  Users,
  X,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Map', href: '/dashboard/live-map', icon: MapPin },
    { name: 'Routes', href: '/dashboard/routes', icon: Route },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Timesheets', href: '/dashboard/timesheets', icon: FileSpreadsheet },
    { name: 'Leaves & PTO', href: '/dashboard/leaves', icon: CalendarDays },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    { name: 'Employees', href: '/dashboard/employees', icon: Users },
    { name: 'Kiosk Mode', href: '/kiosk', icon: Tablet },
    { name: 'Billing', href: '/dashboard/billing', icon: Receipt },
    { name: 'Download', href: '/download', icon: Smartphone },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ].filter((item) => session?.role === 'OWNER' || !['Billing', 'Settings'].includes(item.name));

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
    return <div className="min-h-screen bg-slate-50 text-slate-500 grid place-items-center text-sm">Loading workspace…</div>;
  }

  const sidebarContent = (
    <>
      <div>
        <div className="h-12 px-3 border-b dashboard-divider flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">P</div>
          <span className="dashboard-strong font-bold text-sm tracking-tight">PERZENT</span>
        </div>
        <nav className="p-1.5 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition ${
                  isActive ? 'bg-[#16A34A] text-white font-semibold shadow-sm' : 'dashboard-nav-link'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-2.5 border-t dashboard-divider">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="dashboard-avatar w-7 h-7 rounded font-bold text-xs flex items-center justify-center shrink-0">
              {session.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="dashboard-strong font-semibold text-[11px] truncate leading-tight">{session.full_name}</p>
              <p className="text-[10px] text-[#6B7280] leading-tight">{session.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} title="Sign out" className="p-1.5 rounded text-slate-500 hover:text-red-500 transition shrink-0">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="dashboard-shell min-h-screen flex flex-col md:flex-row font-sans antialiased text-xs" data-theme={theme}>
      {/* ─── Mobile Header ─── */}
      <header className="md:hidden dashboard-topbar h-12 px-3 border-b flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded dashboard-nav-link">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-6 h-6 rounded bg-[#16A34A] flex items-center justify-center font-bold text-[10px] text-white">P</div>
          <span className="dashboard-strong font-semibold text-sm">PERZENT</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="dashboard-theme-toggle !p-1.5 !text-[10px] !gap-1">
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleLogout} title="Sign out" className="p-1.5 rounded text-slate-500 hover:text-red-500 transition">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ─── Mobile Slide-over Sidebar ─── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-60 z-50 md:hidden dashboard-sidebar flex flex-col justify-between overflow-y-auto shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden md:flex dashboard-sidebar w-52 border-r flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex dashboard-topbar h-12 px-4 border-b items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B7280]">Workspace</span>
            <span className="dashboard-strong font-semibold">{session.company_name}</span>
          </div>
          <button onClick={toggleTheme} className="dashboard-theme-toggle" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </header>

        <main className="dashboard-content flex-1 p-3 md:p-5 overflow-y-auto">{children}</main>
      </div>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 dashboard-topbar border-t flex items-stretch justify-around h-14 safe-area-pb">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[9px] font-medium transition ${
                isActive ? 'text-[#16A34A]' : 'text-[#6B7280]'
              }`}
            >
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
