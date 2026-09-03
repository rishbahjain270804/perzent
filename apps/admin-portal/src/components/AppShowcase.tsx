import {
  BatteryFull,
  Bell,
  Coffee,
  LogOut,
  MapPin,
  Navigation,
  ShieldCheck,
  Signal,
  Siren,
  Wifi,
} from 'lucide-react';
import { PerzentMark } from '@/components/PerzentLogo';

/**
 * Hand-built product showcase for the coming-soon page: a phone running the Perzent duty screen
 * with floating proof cards around it. Pure CSS/SVG so it stays crisp at any DPI, weighs nothing,
 * and matches the page palette exactly (the previous PNG render had a baked-in background).
 * Animations come from globals.css (.animate-float-card*, .animate-pulse-radar,
 * .animate-device-breathe) and are disabled under prefers-reduced-motion.
 */
export function AppShowcase() {
  return (
    <div className="relative h-[560px] w-[330px] select-none sm:h-[680px] sm:w-[480px]" aria-hidden="true">
      {/* Ambient glow + dotted disc */}
      <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-300/45 via-emerald-200/30 to-teal-100/10 blur-2xl sm:h-[540px] sm:w-[540px]" />
      <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] opacity-30 [background-size:18px_18px] [mask-image:radial-gradient(circle,black_30%,transparent_70%)] sm:h-[600px] sm:w-[600px]" />

      {/* Decorative route drawn behind the phone */}
      <svg className="absolute inset-0 hidden h-full w-full sm:block" viewBox="0 0 480 680" fill="none">
        <path
          d="M64 168 C 30 290, 110 372, 240 372 S 430 420, 416 560"
          stroke="#16a34a"
          strokeWidth="2"
          strokeDasharray="5 8"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute left-[24px] top-[128px] hidden h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 sm:flex">
        <MapPin className="h-4 w-4 text-emerald-600" />
      </div>

      {/* Phone (outer wrapper positions, inner wrapper animates, so transforms don't fight) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:left-[45%]">
        <div className="animate-device-breathe">
          <PhoneMockup />
        </div>
      </div>

      {/* Card: attendance ring */}
      <div className="absolute right-0 top-[60px] sm:-right-1 sm:top-[84px]">
        <div className="w-[128px] rounded-2xl bg-white/95 px-3 py-3 text-center shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/80 backdrop-blur animate-float-card1 sm:w-[150px] sm:px-4">
          <p className="text-[10px] font-semibold text-slate-600 sm:text-[11px]">Today&apos;s attendance</p>
          <Ring value={90} />
          <p className="-mt-0.5 text-[10px] font-bold text-slate-900 sm:text-xs">Present</p>
        </div>
      </div>

      {/* Card: route verified (its keyframes include translateY(-50%), so anchor by top) */}
      <div className="absolute -right-1 top-[62%] sm:right-0 sm:top-[57%]">
        <div className="flex w-[158px] items-center gap-2.5 rounded-2xl bg-white/95 px-3 py-2.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/80 backdrop-blur animate-float-card2 sm:w-[184px] sm:gap-3 sm:px-3.5 sm:py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100 sm:h-10 sm:w-10">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-500">Route verified</p>
            <p className="text-[15px] font-black leading-tight tabular-nums text-slate-900 sm:text-base">12.4 km</p>
            <p className="text-[10px] text-slate-500">distance covered</p>
          </div>
        </div>
      </div>

      {/* Card: SOS */}
      <div className="absolute bottom-[118px] left-0 sm:bottom-[168px] sm:left-[6px]">
        <div className="flex w-[168px] items-center gap-2.5 rounded-2xl bg-white/95 px-3 py-2.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/80 backdrop-blur animate-float-card3 sm:w-[192px] sm:gap-3 sm:px-3.5 sm:py-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 shadow-md shadow-red-600/30 sm:h-10 sm:w-10">
            <span className="absolute inset-1 rounded-full bg-red-500/50 animate-pulse-radar" />
            <Siren className="relative h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-red-600">Emergency SOS</p>
            <p className="text-[10px] leading-snug text-slate-600">Live location sent to manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = ((value / 100) * c).toFixed(2);
  const gap = (c - (value / 100) * c).toFixed(2);
  return (
    <div className="relative mx-auto my-1.5 h-[62px] w-[62px] sm:h-[72px] sm:w-[72px]">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={r} stroke="#E2E8F0" strokeWidth="6" fill="none" />
        <circle
          cx="28"
          cy="28"
          r={r}
          stroke="#16A34A"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums text-slate-900 sm:text-base">
        {value}%
      </span>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[250px] rounded-[2.75rem] bg-slate-950 p-[9px] shadow-[0_40px_80px_-24px_rgba(15,23,42,0.55)] ring-1 ring-slate-700/60 sm:w-[292px]">
      {/* Side keys */}
      <span className="absolute -left-[3px] top-[92px] h-7 w-[3px] rounded-l-md bg-slate-700" />
      <span className="absolute -left-[3px] top-[130px] h-12 w-[3px] rounded-l-md bg-slate-700" />
      <span className="absolute -right-[3px] top-[120px] h-16 w-[3px] rounded-r-md bg-slate-700" />

      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.2rem] bg-[#F4F8F5] ring-1 ring-black/40">
        {/* Camera island */}
        <div className="absolute left-1/2 top-2.5 z-20 h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-slate-950" />

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3.5 text-[10px] font-semibold text-slate-900">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* App bar */}
        <div className="mt-4 flex items-center justify-between px-4">
          <span className="flex items-center gap-1.5">
            <PerzentMark className="h-5 w-5" />
            <span className="text-[13px] font-extrabold tracking-tight text-slate-900">Perzent</span>
          </span>
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
            <Bell className="h-3.5 w-3.5 text-slate-700" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
        </div>

        {/* Greeting */}
        <div className="mt-3 px-4">
          <p className="text-[10px] text-slate-500">Good morning</p>
          <p className="text-[15px] font-extrabold leading-tight text-slate-900">Aarav 👋</p>
        </div>

        {/* Duty card */}
        <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-3.5 text-white shadow-lg shadow-emerald-700/30">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              On duty
            </span>
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[9px] text-emerald-50">GPS ±4 m</span>
          </div>
          <p className="mt-1.5 font-mono text-[22px] font-black leading-none tabular-nums sm:text-2xl">04:12:36</p>
          <p className="mt-1.5 text-[10px] text-emerald-100">Checked in 09:02 · Sector 21 site</p>
        </div>

        {/* Stats */}
        <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
          {[
            ['Present', '42', 'text-emerald-600'],
            ['On site', '18', 'text-slate-900'],
            ['Absent', '4', 'text-red-500'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl bg-white px-2 py-1.5 text-center ring-1 ring-slate-200/80 sm:py-2">
              <p className="text-[9px] font-semibold text-slate-500">{label}</p>
              <p className={`text-[15px] font-black tabular-nums sm:text-base ${tone}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Live map */}
        <div className="mx-4 mt-3 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[10px] font-bold text-slate-900">Live tracking</span>
            <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />3 moving
            </span>
          </div>
          <MiniMap />
        </div>

        {/* Actions */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <span className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-[10px] font-bold text-slate-800 ring-1 ring-slate-200">
            <Coffee className="h-3 w-3 text-amber-600" /> Take a break
          </span>
          <span className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-[10px] font-bold text-white">
            <LogOut className="h-3 w-3" /> Check out
          </span>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-slate-900/70" />
      </div>
    </div>
  );
}

function MiniMap() {
  const route = 'M18 122 C 60 110, 70 60, 118 74 S 190 96, 244 30';
  return (
    <div className="relative h-[108px] overflow-hidden bg-[#EAF2EC] sm:h-[148px]">
      {/* Street blocks */}
      <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(#ffffff_2px,transparent_2px),linear-gradient(90deg,#ffffff_2px,transparent_2px)] [background-size:34px_34px]" />
      <div className="absolute -left-10 top-1/2 h-[6px] w-[150%] -rotate-[18deg] bg-white" />
      <div className="absolute -top-10 left-1/3 h-[150%] w-[5px] rotate-[12deg] bg-white" />
      <div className="absolute right-3 top-3 h-8 w-12 rounded-lg bg-emerald-200/60" />
      <div className="absolute bottom-3 left-8 h-6 w-9 rounded-md bg-sky-200/50" />

      {/* Route */}
      <svg viewBox="0 0 260 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <path d={route} stroke="#16a34a" strokeWidth="7" fill="none" strokeLinecap="round" strokeOpacity="0.12" />
        <path d={route} stroke="#16a34a" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeOpacity="0.35" />
        <path d={route} stroke="#16a34a" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray="200 400" />
      </svg>

      {/* Workers */}
      <Pin className="left-[8%] top-[74%]" initials="RK" />
      <Pin className="left-[45%] top-[47%]" initials="SM" live />
      <Pin className="left-[73%] top-[60%]" initials="AP" />
      <div className="absolute left-[93%] top-[22%] flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-600 shadow ring-2 ring-white">
        <Navigation className="h-3 w-3 fill-white text-white" />
      </div>
    </div>
  );
}

function Pin({ className, initials, live = false }: { className: string; initials: string; live?: boolean }) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}>
      {live && <span className="absolute inset-0 rounded-full bg-emerald-500/50 animate-pulse-radar" />}
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[8px] font-bold text-white shadow ring-2 ring-white">
        {initials}
      </span>
    </div>
  );
}
