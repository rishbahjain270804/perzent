'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Download,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Battery,
  Volume2,
  MapPin,
  Cpu,
} from 'lucide-react';

export default function DownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [apkStatus, setApkStatus] = useState<'checking' | 'available' | 'missing'>('checking');
  const apkAvailable = apkStatus === 'available';

  useEffect(() => {
    fetch('/api/download/apk', { method: 'HEAD', cache: 'no-store' })
      .then((response) => setApkStatus(response.ok ? 'available' : 'missing'))
      .catch(() => setApkStatus('missing'));
  }, []);

  const handleDownloadApk = () => {
    if (!apkAvailable) return;
    setDownloadStarted(true);
    // Trigger direct APK file download
    const link = document.createElement('a');
    link.href = '/api/download/apk';
    link.download = 'perzent-employee-v1.0.0.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans antialiased text-xs flex flex-col justify-between">
      {/* Minimal Header */}
      <header className="h-14 px-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#16A34A] text-white font-bold text-sm flex items-center justify-center shrink-0">
            P
          </div>
          <span className="font-bold text-sm tracking-tight text-white">PERZENT</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition"
          >
            Manager Login
          </Link>
        </div>
      </header>

      {/* Main Download Hero */}
      <main className="max-w-4xl mx-auto px-4 py-10 w-full space-y-6">
        {/* Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/80 text-[#86EFAC] text-[11px] font-medium">
            <Smartphone className="w-3.5 h-3.5 text-[#16A34A]" /> Android App • Version 1.0.0
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Download Perzent Field Employee App
          </h1>
          <p className="text-xs text-[#6B7280] max-w-lg mx-auto">
            Install on Android to use GPS-stamped attendance and secure employee sign-in.
          </p>
        </div>

        {downloadStarted && (
          <div className="p-3 rounded border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#86EFAC] text-xs font-medium flex items-center justify-between max-w-xl mx-auto">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Download initiated! Check your phone's Notification / Downloads folder.
            </span>
            <button onClick={() => setDownloadStarted(false)} className="text-[11px] underline text-white">Dismiss</button>
          </div>
        )}

        {/* 2-Column Split: Direct Download Action & Phone QR Scanner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {/* Card 1: Direct APK Download */}
          <div className="p-5 rounded-lg border border-slate-800 bg-[#0F172A] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
                  <Download className="w-5 h-5 text-[#16A34A]" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {apkStatus === 'checking' ? 'Checking build' : apkAvailable ? 'Installable APK' : 'Build pending'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Standalone Android APK</h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Package: <code className="font-mono text-slate-300">app.jspcoders.perzent</code></p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  {apkStatus === 'checking' ? 'Checking the published Android artifact…' : apkAvailable ? 'Published Android build is ready' : 'No valid Android artifact is configured'}
                </p>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> GPS-stamped Check-In & Check-Out</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> Secure employee session storage</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> Single Hardware UUID Anti-Tamper Lock</p>
              </div>
            </div>

            <button
              onClick={handleDownloadApk}
              disabled={!apkAvailable}
              className="w-full py-2.5 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-green-600/20"
            >
              <Download className="w-4 h-4" /> {apkStatus === 'checking' ? 'Checking APK…' : apkAvailable ? 'Download APK to Phone' : 'APK Not Published'}
            </button>
          </div>

          {/* Card 2: Scan QR or Open Web App */}
          <div className="p-5 rounded-lg border border-slate-800 bg-[#0F172A] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-blue-400" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Instant Mobile Web App
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-white">Scan from Phone Camera</h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Open mobile web app instantly on iOS & Android</p>
              </div>

              {/* QR Code SVG Visual */}
              <div className="p-3 bg-white rounded flex items-center justify-center mx-auto w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Outer corners */}
                  <rect x="5" y="5" width="28" height="28" fill="#111827" rx="3" />
                  <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                  <rect x="13" y="13" width="12" height="12" fill="#16A34A" rx="1" />

                  <rect x="67" y="5" width="28" height="28" fill="#111827" rx="3" />
                  <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                  <rect x="75" y="13" width="12" height="12" fill="#16A34A" rx="1" />

                  <rect x="5" y="67" width="28" height="28" fill="#111827" rx="3" />
                  <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                  <rect x="13" y="75" width="12" height="12" fill="#16A34A" rx="1" />

                  {/* QR Data Pattern Points */}
                  <rect x="38" y="10" width="8" height="8" fill="#111827" />
                  <rect x="50" y="10" width="8" height="8" fill="#111827" />
                  <rect x="38" y="24" width="8" height="8" fill="#111827" />
                  <rect x="50" y="24" width="8" height="8" fill="#111827" />

                  <rect x="10" y="38" width="8" height="8" fill="#111827" />
                  <rect x="24" y="38" width="8" height="8" fill="#111827" />
                  <rect x="38" y="38" width="8" height="8" fill="#16A34A" />
                  <rect x="50" y="38" width="8" height="8" fill="#111827" />
                  <rect x="64" y="38" width="8" height="8" fill="#111827" />
                  <rect x="78" y="38" width="8" height="8" fill="#111827" />

                  <rect x="10" y="50" width="8" height="8" fill="#111827" />
                  <rect x="24" y="50" width="8" height="8" fill="#111827" />
                  <rect x="38" y="50" width="8" height="8" fill="#111827" />
                  <rect x="50" y="50" width="8" height="8" fill="#16A34A" />
                  <rect x="64" y="50" width="8" height="8" fill="#111827" />
                  <rect x="78" y="50" width="8" height="8" fill="#111827" />

                  <rect x="38" y="64" width="8" height="8" fill="#111827" />
                  <rect x="50" y="64" width="8" height="8" fill="#111827" />
                  <rect x="64" y="64" width="8" height="8" fill="#111827" />
                  <rect x="78" y="64" width="8" height="8" fill="#111827" />

                  <rect x="38" y="78" width="8" height="8" fill="#111827" />
                  <rect x="50" y="78" width="8" height="8" fill="#111827" />
                  <rect x="64" y="78" width="8" height="8" fill="#111827" />
                  <rect x="78" y="78" width="8" height="8" fill="#111827" />
                </svg>
              </div>
            </div>

            <a
              href="https://perzent.jspcoders.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded border border-slate-800 bg-slate-900 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
            >
              Open perzent.jspcoders.app <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Step-by-Step Installation Guide Strip */}
        <div className="p-5 rounded-lg border border-slate-800 bg-[#0F172A] space-y-3 max-w-3xl mx-auto text-xs">
          <h4 className="font-bold text-white text-xs">How to Install & Test on Real Android Device:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] text-slate-300">
            <div className="p-2.5 rounded border border-slate-800/80 bg-slate-900/60 space-y-1">
              <span className="font-bold font-mono text-[#86EFAC]">1. Download</span>
              <p className="text-slate-400">Tap "Download APK" above to save the file on your smartphone.</p>
            </div>
            <div className="p-2.5 rounded border border-slate-800/80 bg-slate-900/60 space-y-1">
              <span className="font-bold font-mono text-[#86EFAC]">2. Install</span>
              <p className="text-slate-400">Open the downloaded `.apk` file and tap "Install" (allow unknown apps if prompted).</p>
            </div>
            <div className="p-2.5 rounded border border-slate-800/80 bg-slate-900/60 space-y-1">
              <span className="font-bold font-mono text-[#86EFAC]">3. Permissions</span>
              <p className="text-slate-400">Grant precise location while using the app when Android prompts you.</p>
            </div>
            <div className="p-2.5 rounded border border-slate-800/80 bg-slate-900/60 space-y-1">
              <span className="font-bold font-mono text-[#86EFAC]">4. Login</span>
              <p className="text-slate-400">Log in with the employee phone number and temporary password supplied by the owner.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="h-12 px-6 border-t border-slate-800 flex items-center justify-between text-[11px] text-[#6B7280]">
        <span>© 2026 Perzent Technologies Pvt Ltd</span>
        <span className="text-[#86EFAC]">Release Build: perzent-v1.0.0.apk</span>
      </footer>
    </div>
  );
}
