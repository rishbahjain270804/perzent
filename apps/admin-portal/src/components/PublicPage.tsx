import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND } from '@perzent/shared-types';

/** Shared shell for public information pages (privacy, terms, FAQ, support, account deletion). */
export function PublicPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <header className="h-16 sm:h-18 px-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/perzent-logo-full.png"
            alt="Perzent Official Logo"
            className="h-10 sm:h-11 w-auto object-contain shrink-0"
          />
        </Link>
        <nav className="flex items-center gap-3 text-xs" aria-label="Header">
          <Link href={BRAND.faqPath} className="text-slate-600 hover:text-slate-900 hidden sm:inline">FAQ</Link>
          <Link href={BRAND.supportPath} className="text-slate-600 hover:text-slate-900">Support</Link>
          <Link href="/download" className="text-slate-600 hover:text-slate-900">Android app</Link>
          <Link href="/login" className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold">Sign in</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#16A34A]">{eyebrow}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          {intro && <div className="text-sm text-slate-600">{intro}</div>}
        </div>
        {children}
      </main>

      <footer className="border-t border-slate-200 px-4 sm:px-6 py-6 text-xs text-slate-500">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} {BRAND.productName} · Developed by{' '}
            <a href={BRAND.developerUrl} target="_blank" rel="noreferrer" className="text-[#15803D] underline">{BRAND.developerName}</a>
          </span>
          <nav className="flex flex-wrap items-center gap-3" aria-label="Footer">
            <Link href={BRAND.faqPath} className="hover:text-slate-900">FAQ</Link>
            <Link href={BRAND.supportPath} className="hover:text-slate-900">Support</Link>
            <Link href={BRAND.privacyPath} className="hover:text-slate-900">Privacy</Link>
            <Link href={BRAND.termsPath} className="hover:text-slate-900">Terms</Link>
            <Link href={BRAND.accountDeletionPath} className="hover:text-slate-900">Account deletion</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-2 scroll-mt-20">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export function SupportEmailLink({ subject }: { subject?: string }) {
  const href = subject ? `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(subject)}` : `mailto:${BRAND.supportEmail}`;
  return (
    <a href={href} className="text-[#15803D] underline font-medium">
      {BRAND.supportEmail}
    </a>
  );
}
