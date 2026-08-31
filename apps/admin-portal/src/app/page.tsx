'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Smartphone,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Globe,
  Truck,
  Wrench,
  Briefcase,
  HardHat,
  ChevronRight,
  Activity,
  Battery,
  Zap,
  TrendingUp,
  Users,
  Navigation,
  Lock,
  Play,
  RotateCcw,
  Sliders,
  Radio,
  Check,
  Shield,
  AlertOctagon
} from 'lucide-react';

export default function LandingPage() {
  // Map Telemetry Filter State
  const [mapFilter, setMapFilter] = useState<'all' | 'moving' | 'dwell'>('all');

  // Interactive Product Tour State
  const [activeTab, setActiveTab] = useState<'map' | 'routes' | 'payroll' | 'security'>('map');

  // Interactive ROI Calculator State
  const [staffCount, setStaffCount] = useState(25);
  const [avgHourlyWage, setAvgHourlyWage] = useState(250);

  // Calculated ROI values
  const proxyLossSaved = Math.round(staffCount * 30 * (avgHourlyWage * 0.5)); // 30 mins saved per worker/day
  const travelKmSaved = Math.round(staffCount * 12 * 8); // 8 INR/km * 12 km saved per day
  const monthlySavingsTotal = proxyLossSaved + travelKmSaved;

  // Route playback simulation state
  const [playbackProgress, setPlaybackProgress] = useState(65);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlaybackProgress((prev) => (prev >= 100 ? 0 : prev + 5));
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      <SiteHeader />

      {/* Main Content */}
      <main className="w-full space-y-16 sm:space-y-24 pb-24">
        {/* --- 1. HERO SECTION WITH STREAMLINED SPACING & DEVICE FRAME --- */}
        <section id="overview" className="relative pt-6 sm:pt-10 px-4 sm:px-6 max-w-6xl mx-auto space-y-8">
          {/* Subtle Ambient Grid Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-emerald-100/60 via-teal-50/20 to-transparent blur-3xl -z-10 pointer-events-none" />

          {/* Hero Typography & CTA */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Field Force Tracking & Hardware-Bound GPS Security
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.08]">
              Real-time field workforce tracking, <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                without proxy attendance.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              Perzent tracks on-duty mobile staff live with single-device hardware binding. Replay full day travel paths with dwell stops, eliminate logbook fraud, and export payroll-ready timesheets.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/coming-soon"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-md shadow-amber-600/25"
              >
                🔥 Reserve VIP Launch Access <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Building2 className="w-4 h-4 text-emerald-400" /> Start Free Company Account
              </Link>
              <Link
                href="/download"
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Smartphone className="w-4 h-4 text-emerald-600" /> Download APK
              </Link>
            </div>
          </div>

          {/* HIGH-IMPACT COMMAND CENTER MACOS DEVICE FRAME */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-2xl overflow-hidden">
            {/* MacOS Window Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                </div>
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-slate-400 font-mono text-[11px] ml-3">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>https://perzent.jspcoders.app/command-center</span>
                </div>
              </div>

              {/* Interactive Map Filter Buttons */}
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400 hidden md:inline">FILTER:</span>
                {[
                  { id: 'all', label: 'All (14)' },
                  { id: 'moving', label: 'Moving (8)' },
                  { id: 'dwell', label: 'Dwell (4)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMapFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-md transition ${
                      mapFilter === f.id
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Graphics Viewport */}
            <div className="p-4 sm:p-6 space-y-5">
              {/* Stat Metric Pills Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">ACTIVE STAFF ON DUTY</span>
                  <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    14 Checked In
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">WORKED TIME TODAY</span>
                  <div className="text-base sm:text-lg font-bold text-emerald-400">112.5 Total Hrs</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">ROUTE DISTANCE TRAVELLED</span>
                  <div className="text-base sm:text-lg font-bold text-white">184.2 km</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">HARDWARE BINDING STATUS</span>
                  <div className="text-base sm:text-lg font-bold text-blue-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> 100% Locked
                  </div>
                </div>
              </div>

              {/* Vector Map Simulation Canvas */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 relative min-h-[260px] flex flex-col justify-between overflow-hidden">
                {/* SVG Map Grid Background */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="heroGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                        <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#heroGrid)" />
                  </svg>
                </div>

                {/* Vector Route Line Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M 60 180 Q 180 70, 320 160 T 520 100 T 680 200"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="opacity-70"
                  />
                  <circle cx="320" cy="160" r="7" fill="#10B981" className="animate-ping opacity-75" />
                  <circle cx="320" cy="160" r="5" fill="#059669" />
                </svg>

                {/* Map Overlay Top Info */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono">
                    <span className="text-[10px] text-slate-400 block">CURRENT GEOFENCE REGION</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Mumbai Commercial Field Hub
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
                    GPS Accuracy: 4.2m
                  </span>
                </div>

                {/* Animated Member Cards Grid */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-8">
                  {(mapFilter === 'all' || mapFilter === 'moving') && (
                    <div className="p-3 rounded-lg bg-slate-950/90 border border-emerald-500/40 space-y-1.5 shadow-lg backdrop-blur-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Rahul Sharma
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                          18.4 km/h
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Bandra West &rarr; Kurla Site</span>
                        <span className="font-mono text-emerald-400 font-semibold">Bat 92%</span>
                      </div>
                    </div>
                  )}

                  {(mapFilter === 'all' || mapFilter === 'dwell') && (
                    <div className="p-3 rounded-lg bg-slate-950/90 border border-blue-500/40 space-y-1.5 shadow-lg backdrop-blur-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          Priya Singh
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 font-mono">
                          DWELL STOP (34m)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Lower Parel Client Site</span>
                        <span className="font-mono text-slate-300 font-semibold">Bat 78%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 2. PROOF STRIP --- */}
        <section className="border-y border-slate-200 bg-slate-50/80 py-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">99.8%</div>
              <span className="text-xs text-slate-600 font-medium">GPS Signal Uptime</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">0</div>
              <span className="text-xs text-slate-600 font-medium">Proxy Punches Allowed</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">&lt; 5 mins</div>
              <span className="text-xs text-slate-600 font-medium">Organization Onboarding</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">100%</div>
              <span className="text-xs text-slate-600 font-medium">Supabase RLS Protected</span>
            </div>
          </div>
        </section>

        {/* --- 3. INTERACTIVE PRODUCT TOUR SECTION --- */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Interactive Product Tour</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              See How Perzent Works in Action
            </h2>
            <p className="text-sm text-slate-600">
              Click through the operational modules below to explore real data visualizations.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 pb-4">
            {[
              { id: 'map', label: '01. Live Team Map', icon: MapPin },
              { id: 'routes', label: '02. Day Route Replay', icon: Clock },
              { id: 'payroll', label: '03. Automated Timesheets', icon: FileSpreadsheet },
              { id: 'security', label: '04. Anti-Tamper Security', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Canvas Display Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs min-h-[340px] flex flex-col justify-between">
            {activeTab === 'map' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase">Module 01</span>
                    <h3 className="text-xl font-bold text-slate-900">Live Team Map & Telemetry Feed</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-bold border border-emerald-200">
                    3-Second Stream
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                  Animated markers track checked-in employees continuously. Updates stream movement speed, GPS accuracy radius, phone battery level, and stale signal warnings.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 text-[10px]">CURRENT SPEED</span>
                    <div className="text-lg font-bold text-slate-900">18.4 km/h</div>
                    <span className="text-emerald-600 text-[11px]">Normal transit</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 text-[10px]">BATTERY TELEMETRY</span>
                    <div className="text-lg font-bold text-slate-900">92% (Charging)</div>
                    <span className="text-slate-500 text-[11px]">Power-save OFF</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 text-[10px]">SIGNAL FRESHNESS</span>
                    <div className="text-lg font-bold text-emerald-700">2s ago</div>
                    <span className="text-emerald-600 text-[11px]">Active connection</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'routes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase">Module 02</span>
                    <h3 className="text-xl font-bold text-slate-900">Route Playback & Dwell Stop Analysis</h3>
                  </div>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    {isPlaying ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause Replay' : 'Play Replay'}</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                  Replay full-day travel paths from raw GPS waypoints. Perzent automatically computes stationary dwell stop locations and calculates exact duration spent at customer sites.
                </p>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-900">SHIFT TIMELINE (09:00 AM - 06:00 PM)</span>
                    <span className="text-blue-700 font-bold">Progress: {playbackProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payroll' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase">Module 03</span>
                    <h3 className="text-xl font-bold text-slate-900">Automated Timesheets & Payroll Ledger</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-mono text-xs font-bold border border-amber-200">
                    CSV Export Ready
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                  Gross vs net worked hours computed automatically. Includes break caps, night shift timezone adjustments, auto check-out cutoffs, audit reasons for manual edits, and payroll CSV exports.
                </p>

                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Shift Date</th>
                        <th className="p-3">Gross Hours</th>
                        <th className="p-3">Breaks</th>
                        <th className="p-3">Net Worked</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      <tr>
                        <td className="p-3 font-bold">Rahul Sharma</td>
                        <td className="p-3 font-mono">Today</td>
                        <td className="p-3 font-mono">8h 30m</td>
                        <td className="p-3 font-mono">30m</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">8h 00m</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">VERIFIED</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase">Module 04</span>
                    <h3 className="text-xl font-bold text-slate-900">Anti-Tamper Hardware Security</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-xs font-bold">
                    Zero Proxy Punches
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                  Each employee account is bound strictly to a single physical device IMEI/Android ID. Fake GPS apps, mock location apps, and proxy attendance punches are automatically blocked at the native level.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-bold">Single Device Hardware Binding</strong>
                      <span className="text-slate-500">Employees cannot check in from a colleague's phone.</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block font-bold">Native Mock GPS Detection</strong>
                      <span className="text-slate-500">Spoofed GPS coordinates are rejected server-side.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* --- 4. INTERACTIVE ROI SAVINGS CALCULATOR --- */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-900 text-white space-y-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold mb-2">
                  <Sliders className="w-3.5 h-3.5" /> INTERACTIVE CALCULATOR
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Calculate Your Monthly ROI Savings</h2>
                <p className="text-xs text-slate-400 mt-1">Estimate savings from eliminated proxy punches and verified travel routes.</p>
              </div>
              <div className="text-left md:text-right bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 uppercase font-mono block">ESTIMATED MONTHLY SAVINGS</span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                  ₹{monthlySavingsTotal.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-400">Per Month Savings for {staffCount} Staff</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Sliders */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Field Staff Size</span>
                    <span className="text-emerald-400 font-mono">{staffCount} employees</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    value={staffCount}
                    onChange={(e) => setStaffCount(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Average Hourly Wage</span>
                    <span className="text-emerald-400 font-mono">₹{avgHourlyWage} / hour</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={avgHourlyWage}
                    onChange={(e) => setAvgHourlyWage(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Savings Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                  <span className="text-slate-400 text-[11px]">PROXY TIME SAVED</span>
                  <div className="text-lg font-bold text-white font-mono">
                    ₹{proxyLossSaved.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-slate-400">Prevents 30 mins/day attendance inflation</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                  <span className="text-slate-400 text-[11px]">FUEL & EXPENSE SAVED</span>
                  <div className="text-lg font-bold text-white font-mono">
                    ₹{travelKmSaved.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-slate-400">Verifies travel km against route history</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 5. PRICING & LAUNCH PLAN BANNER --- */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-900 text-white space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Product Launch Offer</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Full Platform Access Plan</h2>
                <p className="text-xs text-slate-400 mt-1">Deploy Perzent for your workforce with zero subscription cost during launch.</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-3xl sm:text-4xl font-black font-mono">₹0 / month</div>
                <span className="text-xs font-semibold text-emerald-400">Unlimited Staff & Managers</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-medium text-slate-300">
              {[
                'Unlimited employees & departments',
                '3-second live team map refresh',
                '15-day route playback & dwell stops',
                '45-day attendance & break ledger',
                'Payroll CSV timesheet export',
                'Geofenced sites & shared kiosk mode',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">No credit card or payment gateway setup required.</span>
              <Link
                href="/register"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
              >
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
