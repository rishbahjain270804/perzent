'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Smartphone, Download, QrCode, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Play } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/client';

interface VersionInfo {
  latest_version: string;
  latest_version_code: number;
  min_required_version_code?: number;
  download_url?: string | null;
  play_store_url?: string | null;
  release_notes?: string | null;
  requires_reinstall_below_code?: number | null;
}

const APK_PATH = '/api/download/apk';

function absoluteUrl(path: string | null | undefined) {
  const value = path && path.trim() ? path.trim() : APK_PATH;
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === 'undefined') return value;
  return `${window.location.origin}${value.startsWith('/') ? '' : '/'}${value}`;
}

export default function DownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [apkStatus, setApkStatus] = useState<'checking' | 'available' | 'missing'>('checking');
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [versionError, setVersionError] = useState('');
  const [versionLoading, setVersionLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState('');

  const apkAvailable = apkStatus === 'available';
  const downloadUrl = absoluteUrl(version?.download_url);
  const playStoreUrl = version?.play_store_url?.trim() || '';

  const loadVersion = () => {
    setVersionLoading(true);
    apiFetch<VersionInfo>('/api/mobile/version')
      .then((data) => {
        setVersion(data);
        setVersionError('');
      })
      .catch((reason) => setVersionError(errorMessage(reason, 'Could not load the current app version.')))
      .finally(() => setVersionLoading(false));
  };

  useEffect(() => {
    fetch(APK_PATH, { method: 'HEAD', cache: 'no-store' })
      .then((response) => setApkStatus(response.ok ? 'available' : 'missing'))
      .catch(() => setApkStatus('missing'));
    loadVersion();
  }, []);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(downloadUrl, { width: 240, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setQrError('');
        }
      })
      .catch(() => {
        if (!cancelled) setQrError('Could not render the QR code.');
      });
    return () => {
      cancelled = true;
    };
  }, [downloadUrl]);

  const handleDownloadApk = () => {
    if (!apkAvailable) return;
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = version?.download_url && !/^https?:\/\//i.test(version.download_url) ? version.download_url : APK_PATH;
    if (version?.download_url && /^https?:\/\//i.test(version.download_url)) link.href = version.download_url;
    link.download = `perzent-employee-v${version?.latest_version || 'latest'}.apk`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buildLabel = version ? `Version ${version.latest_version} (build ${version.latest_version_code})` : versionLoading ? 'Checking version…' : 'Version unavailable';

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans antialiased text-xs flex flex-col justify-between">
      <header className="h-14 px-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#16A34A] text-white font-bold text-sm flex items-center justify-center shrink-0">P</div>
          <span className="font-bold text-sm tracking-tight text-white">PERZENT</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="px-3 py-1.5 rounded border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition">Dashboard</Link>
          <Link href="/login" className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition">Sign in</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-10 w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/80 text-[#86EFAC] text-[11px] font-medium">
            <Smartphone className="w-3.5 h-3.5 text-[#16A34A]" /> Android · {buildLabel}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Perzent Field Employee app</h1>
          <p className="text-xs text-[#6B7280] max-w-lg mx-auto">
            Employees use this app to check in and out. Location is recorded only while checked in on a shift.
          </p>
        </div>

        {versionError && (
          <div role="alert" className="max-w-xl mx-auto p-3 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-xs flex items-center justify-between gap-2">
            <span>{versionError}</span>
            <button onClick={loadVersion} className="inline-flex items-center gap-1 underline"><RefreshCw className="w-3 h-3" /> Retry</button>
          </div>
        )}

        {/* Reinstall notice */}
        <div className="max-w-xl mx-auto p-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Upgrading from an early build?</strong> If you installed a version before 1.2.0, uninstall it first — the app signing key changed, so
            Android will refuse to update over the old one.
            {version?.requires_reinstall_below_code ? ` (Affects builds below ${version.requires_reinstall_below_code}.)` : ''}
          </span>
        </div>

        {downloadStarted && (
          <div className="p-3 rounded border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#86EFAC] text-xs font-medium flex items-center justify-between max-w-xl mx-auto gap-2">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Download started — open it from your notifications or Downloads folder.</span>
            <button onClick={() => setDownloadStarted(false)} className="text-[11px] underline text-white">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {/* Install */}
          <div className="p-5 rounded-lg border border-slate-800 bg-[#0F172A] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded bg-[#16A34A]/20 flex items-center justify-center"><Download className="w-5 h-5 text-[#16A34A]" /></div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${apkAvailable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {apkStatus === 'checking' ? 'Checking build' : apkAvailable ? 'APK available' : 'APK not published'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Install on Android</h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Package <code className="font-mono text-slate-300">app.jspcoders.perzent</code></p>
                {version?.min_required_version_code ? (
                  <p className="text-[10px] text-slate-400 mt-1">Minimum supported build: {version.min_required_version_code}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> GPS-stamped check-in and check-out</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> Background location only while on shift</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> Single-device binding and GPS integrity checks</p>
              </div>
              {version?.release_notes && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <p className="font-semibold text-slate-300 mb-0.5">What's new in {version.latest_version}</p>
                  <p className="whitespace-pre-line">{version.release_notes}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {playStoreUrl && (
                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-green-600/20"
                >
                  <Play className="w-4 h-4" /> Get it on Google Play <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={handleDownloadApk}
                disabled={!apkAvailable}
                className={`w-full py-2.5 rounded font-bold text-xs flex items-center justify-center gap-2 transition disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed ${
                  playStoreUrl ? 'border border-slate-700 bg-slate-900 text-slate-200 hover:text-white' : 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-lg shadow-green-600/20'
                }`}
              >
                <Download className="w-4 h-4" />
                {apkStatus === 'checking' ? 'Checking APK…' : apkAvailable ? 'Download APK' : 'APK not published yet'}
              </button>
            </div>
          </div>

          {/* QR */}
          <div className="p-5 rounded-lg border border-slate-800 bg-[#0F172A] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded bg-blue-500/20 flex items-center justify-center"><QrCode className="w-5 h-5 text-blue-400" /></div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Scan with the phone</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Scan to download</h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Point the phone camera at the code to open the APK download link.</p>
              </div>
              <div className="p-3 bg-white rounded flex items-center justify-center mx-auto w-44 h-44">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR code linking to ${downloadUrl}`} className="w-full h-full" />
                ) : (
                  <span className="text-[10px] text-slate-500">{qrError || 'Rendering…'}</span>
                )}
              </div>
              <p className="text-[10px] text-[#6B7280] font-mono break-all text-center">{downloadUrl}</p>
            </div>
            <a href={downloadUrl} className="w-full py-2.5 rounded border border-slate-800 bg-slate-900 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition">
              Open download link <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-slate-800 bg-[#0F172A] space-y-3 max-w-3xl mx-auto text-xs">
          <h4 className="font-bold text-white text-xs">Install steps</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] text-slate-300">
            {[
              ['1. Download', playStoreUrl ? 'Install from Google Play, or download the APK above.' : 'Tap "Download APK" on the phone, or scan the QR code.'],
              ['2. Install', 'Open the .apk file and tap Install. Allow installs from this source if Android asks.'],
              ['3. Permissions', 'Allow precise location "all the time" so shifts keep recording with the screen off.'],
              ['4. Sign in', 'Use the phone number and temporary password your owner or manager gave you.'],
            ].map(([title, text]) => (
              <div key={title} className="p-2.5 rounded border border-slate-800/80 bg-slate-900/60 space-y-1">
                <span className="font-bold font-mono text-[#86EFAC]">{title}</span>
                <p className="text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-4 sm:px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#6B7280]">
        <span>© 2026 Perzent · operated by JSP Coders</span>
        <nav className="flex items-center gap-3" aria-label="Footer">
          <Link href="/privacy" className="hover:text-white">Privacy policy</Link>
          <Link href="/login" className="hover:text-white">Sign in</Link>
          <Link href="/register" className="hover:text-white">Register</Link>
        </nav>
      </footer>
    </div>
  );
}
