'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Smartphone, Download, QrCode, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Play } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/client';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

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

function absoluteUrl(origin: string, path: string | null | undefined) {
  const value = path && path.trim() ? path.trim() : APK_PATH;
  if (/^https?:\/\//i.test(value)) return value;
  if (!origin) return value;
  return `${origin}${value.startsWith('/') ? '' : '/'}${value}`;
}

export default function DownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [apkStatus, setApkStatus] = useState<'checking' | 'available' | 'missing'>('checking');
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [versionError, setVersionError] = useState('');
  const [versionLoading, setVersionLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [origin, setOrigin] = useState('');

  const apkAvailable = apkStatus === 'available';
  const downloadUrl = absoluteUrl(origin, version?.download_url);
  const playStoreUrl = version?.play_store_url?.trim() || '';

  const loadVersion = () => {
    setVersionLoading(true);
    apiFetch<VersionInfo>('/api/mobile/version')
      .then((data) => {
        setVersion(data);
        setVersionError('');
      })
      .catch((reason) => setVersionError(errorMessage(reason, 'Could not load current app version.')))
      .finally(() => setVersionLoading(false));
  };

  useEffect(() => {
    setOrigin(window.location.origin);
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
        if (!cancelled) setQrError('Could not render QR code.');
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
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased text-xs flex flex-col justify-between">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold">
            <Smartphone className="w-4 h-4 text-emerald-600" /> Android · {buildLabel}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Perzent Field Employee Android App
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Employees use this app to check in and out. Location is recorded strictly while checked in on shift.
          </p>
        </div>

        {versionError && (
          <div role="alert" className="max-w-xl mx-auto p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-center justify-between gap-2">
            <span>{versionError}</span>
            <button onClick={loadVersion} className="inline-flex items-center gap-1 underline font-bold"><RefreshCw className="w-3 h-3" /> Retry</button>
          </div>
        )}

        {/* Reinstall notice */}
        <div className="max-w-xl mx-auto p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Upgrading from an early build?</strong> If you installed a version before 1.2.0, uninstall it first — the app signing key changed, so Android will refuse to update over the old build.
            {version?.requires_reinstall_below_code ? ` (Affects builds below ${version.requires_reinstall_below_code}.)` : ''}
          </span>
        </div>

        {downloadStarted && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-medium flex items-center justify-between max-w-xl mx-auto gap-2 shadow-xs">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Download started — open it from your phone notifications or Downloads folder.</span>
            <button onClick={() => setDownloadStarted(false)} className="text-[11px] underline font-bold text-slate-900">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Install Option */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${apkAvailable ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                  {apkStatus === 'checking' ? 'Checking build' : apkAvailable ? 'APK available' : 'APK not published'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Install on Android</h3>
                <p className="text-xs text-slate-500 mt-0.5">Package <code className="font-mono text-slate-700">app.jspcoders.perzent</code></p>
                {version?.min_required_version_code ? (
                  <p className="text-[11px] text-slate-500 mt-1">Minimum supported build: {version.min_required_version_code}</p>
                ) : null}
              </div>
              <div className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-200">
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> GPS-stamped check-in and check-out</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Background location strictly on shift</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Single-device hardware binding</p>
              </div>
              {version?.release_notes && (
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <p className="font-semibold text-slate-900 mb-0.5">What's new in {version.latest_version}</p>
                  <p className="whitespace-pre-line text-[11px]">{version.release_notes}</p>
                </div>
              )}
            </div>
            <div className="space-y-2 pt-2">
              {playStoreUrl && (
                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <Play className="w-4 h-4" /> Get it on Google Play <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={handleDownloadApk}
                disabled={!apkAvailable}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                  playStoreUrl ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
              >
                <Download className="w-4 h-4" />
                {apkStatus === 'checking' ? 'Checking APK…' : apkAvailable ? 'Download APK' : 'APK not published yet'}
              </button>
            </div>
          </div>

          {/* QR Option */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Scan with Phone
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Scan to Download</h3>
                <p className="text-xs text-slate-500 mt-0.5">Point your phone camera at the code to open the APK link.</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-center mx-auto w-44 h-44 shadow-xs">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR code linking to ${downloadUrl}`} className="w-full h-full" />
                ) : (
                  <span className="text-[10px] text-slate-500">{qrError || 'Rendering…'}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono break-all text-center">{downloadUrl}</p>
            </div>
            <a href={downloadUrl} className="w-full py-3 rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition">
              Open download link <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
