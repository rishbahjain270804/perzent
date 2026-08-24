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
  Coffee,
  Receipt,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('perzent_session');
    if (!saved) {
      const defaultOwner = {
        full_name: 'Rajesh Sharma',
        role: 'OWNER',
        company_name: 'Acme Logistics Pvt Ltd',
        email: 'rajesh@acmelogistics.com',
      };
      setSession(defaultOwner);
    } else {
      setSession(JSON.parse(saved));
    }
  }, []);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Team Map', href: '/dashboard/live-map', icon: MapPin },
    { name: 'Route Playback (15d)', href: '/dashboard/routes', icon: Route },
    { name: 'Attendance & Breaks (45d)', href: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Employee Roster', href: '/dashboard/employees', icon: Users },
    { name: 'Billing & Invoices', href: '/dashboard/billing', icon: Receipt },
    { name: 'Organization Policies', href: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('perzent_session');
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800/80">
            {/* Primary Logo: White on Green (#16A34A) */}
            <div className="w-10 h-10 rounded-xl bg-[#16A34A] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-green-600/30">
              P
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">PERZENT</h1>
              <p className="text-[11px] text-[#6B7280]">Workforce Intelligence</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md shadow-green-600/25 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 mb-3 flex items-center gap-3">
            {/* Secondary Logo Style for User: Dark on White */}
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center font-extrabold text-[#111827] text-sm shadow-sm">
              {session?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-xs text-white truncate">{session?.full_name || 'Loading...'}</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#16A34A] font-semibold">
                <ShieldCheck className="w-3 h-3 text-[#16A34A]" /> {session?.role || 'OWNER'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-8 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between backdrop-blur shrink-0">
          <div>
            <span className="text-xs text-[#6B7280] font-medium">Organization:</span>
            <span className="ml-2 text-sm font-semibold text-white">Acme Logistics Pvt Ltd</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
              Auto-Checkout: 11:40 PM IST
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              Lunch Break: 30m Max
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto bg-slate-900">{children}</main>
      </div>
    </div>
  );
}
