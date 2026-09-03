'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
  MoreHorizontal,
  Moon,
  Receipt,
  Route,
  Settings,
  Siren,
  Smartphone,
  Sun,
  Users,
  X,
  LifeBuoy,
} from 'lucide-react';
import { apiFetch, errorMessage, ApiError, type SessionInfo } from '@/lib/client';
import { ErrorBanner } from '@/components/ErrorBanner';
import { SosBanner } from '@/components/SosBanner';

type Theme = 'light' | 'dark';

const THEME_KEY = 'perzent_theme';

/**
 * Runs while the HTML is being parsed (SSR) so the saved theme is applied before first paint.
 * `document.currentScript.parentElement` is the dashboard shell.
 */
const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light'){var s=document.currentScript&&document.currentScript.parentElement;if(s){s.setAttribute('data-theme',t);}}}catch(e){}})();`;

const NAV_ITEMS = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Map', href: '/dashboard/live-map', icon: MapPin },
  { name: 'SOS Alerts', href: '/dashboard/sos', icon: Siren },
  { name: 'Routes', href: '/dashboard/routes', icon: Route },
  { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck },
  { name: 'Timesheets', href: '/dashboard/timesheets', icon: FileSpreadsheet },
  { name: 'Employees', href: '/dashboard/employees', icon: Users },
  { name: 'Leaves', href: '/dashboard/leaves', icon: CalendarDays },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, ownerOnly: true },
  { name: 'Plan', href: '/dashboard/billing', icon: Receipt, ownerOnly: true },
  { name: 'Help', href: '/support', icon: LifeBuoy },
];

const BOTTOM_BAR = ['/dashboard', '/dashboard/live-map', '/dashboard/attendance', '/dashboard/employees'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Sync React state with the theme the boot script (or localStorage) applied, before paint.
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const loadSession = useCallback(async () => {
    setSessionLoading(true);
    setSessionError('');
    try {
      const data = await apiFetch<SessionInfo>('/api/auth');
      setSession(data);
    } catch (reason) {
      // 401 is handled by apiFetch (redirect). Anything else is shown with a retry.
      if (!(reason instanceof ApiError && reason.status === 401)) {
        setSessionError(errorMessage(reason, 'Could not load your workspace.'));
      }
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const navItems = NAV_ITEMS.filter((item) => !item.ownerOnly || session?.role === 'OWNER');
  const bottomItems = navItems.filter((item) => BOTTOM_BAR.includes(item.href));

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await apiFetch('/api/auth', { method: 'DELETE' });
    } catch {
      /* Session cookie may already be gone; still go to login. */
    }
    router.replace('/login');
  };

  const toggleTheme = () => {
    setTheme((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isActive = (href: string) => pathname === href;

  const sidebarContent = session ? (
    <>
      <div>
        <div className="h-12 px-3 border-b dashboard-divider flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">P</div>
          <span className="dashboard-strong font-bold text-sm tracking-tight">PERZENT</span>
        </div>
        <nav className="p-1.5 space-y-0.5" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition ${
                  active ? 'bg-[#16A34A] text-white font-semibold shadow-sm' : 'dashboard-nav-link'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pt-2">
          <Link
            href="/download"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-medium border dashboard-divider dashboard-nav-link"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>Get the Android app</span>
          </Link>
        </div>
      </div>
      <div className="p-2.5 border-t dashboard-divider">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="dashboard-avatar w-7 h-7 rounded font-bold text-xs flex items-center justify-center shrink-0">
              {session.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="dashboard-strong font-semibold text-[11px] truncate leading-tight">{session.full_name}</p>
              <p className="text-[10px] text-[#6B7280] leading-tight truncate">{session.role} · {session.company?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded text-slate-500 hover:text-red-500 transition shrink-0 disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div
      className="dashboard-shell min-h-screen flex flex-col md:flex-row font-sans antialiased text-xs"
      data-theme={theme}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />

      {!session ? (
        <div className="dashboard-content flex-1 min-h-screen grid place-items-center p-4">
          {sessionLoading ? (
            <p className="text-sm text-[#6B7280]">Loading workspace…</p>
          ) : (
            <div className="w-full max-w-md space-y-3">
              <ErrorBanner message={sessionError || 'Could not load your workspace.'} onRetry={loadSession} />
              <Link href="/login" className="text-[11px] text-[#16A34A] font-semibold underline">
                Go to sign in
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ─── Mobile Header ─── */}
          <header className="md:hidden dashboard-topbar h-12 px-3 border-b flex items-center justify-between shrink-0 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                className="p-1.5 rounded dashboard-nav-link"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="w-6 h-6 rounded bg-[#16A34A] flex items-center justify-center font-bold text-[10px] text-white">P</div>
              <span className="dashboard-strong font-semibold text-sm truncate max-w-[9rem]">{session.company?.name || 'PERZENT'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="dashboard-theme-toggle !p-1.5 !text-[10px] !gap-1"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleLogout}
                disabled={signingOut}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 rounded text-slate-500 hover:text-red-500 transition disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* ─── Mobile Slide-over Sidebar ─── */}
          {mobileOpen && (
            <>
              <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
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
              <div className="flex items-center gap-2 text-xs min-w-0">
                <span className="text-[#6B7280]">Workspace</span>
                <span className="dashboard-strong font-semibold truncate">{session.company?.name}</span>
                <span className="px-1.5 py-0.5 rounded border dashboard-divider text-[10px] text-[#6B7280] shrink-0">Free plan</span>
              </div>
              <button
                onClick={toggleTheme}
                className="dashboard-theme-toggle"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                {theme === 'light' ? 'Dark' : 'Light'}
              </button>
            </header>

            <main className="dashboard-content flex-1 p-3 md:p-5 overflow-y-auto pb-20 md:pb-5"><SosBanner role={session?.role} />{children}</main>
          </div>

          {/* ─── Mobile Bottom Tab Bar: 4 items + More ─── */}
          <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 dashboard-topbar border-t flex items-stretch justify-around h-14 safe-area-pb"
            aria-label="Quick navigation"
          >
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[9px] font-medium transition ${
                    active ? 'text-[#16A34A]' : 'text-[#6B7280]'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 text-[9px] font-medium text-[#6B7280]"
              aria-label="More navigation"
            >
              <MoreHorizontal className="w-[18px] h-[18px]" />
              <span>More</span>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
