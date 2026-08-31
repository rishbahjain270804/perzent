'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Smartphone, Menu, X } from 'lucide-react';

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Top Release Banner */}
      <div className="bg-slate-900 text-slate-100 text-[11px] sm:text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wide">
          v1.3 Release
        </span>
        <span className="text-slate-200">Native Android Foreground GPS Service & Row-Level Security Integration</span>
        <Link href="/download" className="underline font-bold text-emerald-400 hover:text-emerald-300 ml-1 transition">
          Get APK &rarr;
        </Link>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/95 border-b border-slate-200/80 px-4 sm:px-8 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 transition opacity-95 hover:opacity-100">
            <img
              src="/perzent-logo-full.png"
              alt="Perzent Official Logo"
              className="h-7 sm:h-8 w-auto object-contain shrink-0"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
          <Link
            href="/features"
            className={`transition-colors py-1 ${
              isActive('/features')
                ? 'text-emerald-700 font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            Features
          </Link>
          <Link
            href="/coming-soon"
            className={`transition-colors py-1 flex items-center gap-1 ${
              isActive('/coming-soon')
                ? 'text-amber-600 font-bold border-b-2 border-amber-500'
                : 'text-amber-700 font-bold hover:text-amber-800'
            }`}
          >
            🔥 VIP Early Access
          </Link>
          <Link
            href="/solutions"
            className={`transition-colors py-1 ${
              isActive('/solutions')
                ? 'text-emerald-700 font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            Solutions
          </Link>
          <Link
            href="/about"
            className={`transition-colors py-1 ${
              isActive('/about')
                ? 'text-emerald-700 font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            About Us
          </Link>
          <Link
            href="/pricing"
            className={`transition-colors py-1 ${
              isActive('/pricing')
                ? 'text-emerald-700 font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/faq"
            className={`transition-colors py-1 ${
              isActive('/faq')
                ? 'text-emerald-700 font-bold border-b-2 border-emerald-600'
                : 'hover:text-slate-900'
            }`}
          >
            FAQ
          </Link>
          <Link
            href="/download"
            className={`flex items-center gap-1.5 font-bold transition-colors py-1 ${
              isActive('/download')
                ? 'text-emerald-700 font-extrabold border-b-2 border-emerald-600'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Android App
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm shadow-emerald-600/20"
          >
            Create Free Account <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700"
          >
            Sign In
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden sticky top-16 z-40 bg-white border-b border-slate-200 px-4 py-4 space-y-3 text-xs font-semibold text-slate-700 shadow-xl">
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 border-b border-slate-100 hover:text-emerald-700"
          >
            Features
          </Link>
          <Link
            href="/solutions"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 border-b border-slate-100 hover:text-emerald-700"
          >
            Solutions
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 border-b border-slate-100 hover:text-emerald-700"
          >
            About Us
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 border-b border-slate-100 hover:text-emerald-700"
          >
            Pricing
          </Link>
          <Link
            href="/faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 border-b border-slate-100 hover:text-emerald-700"
          >
            FAQ
          </Link>
          <Link
            href="/download"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-emerald-700 font-bold border-b border-slate-100"
          >
            Download Android APK
          </Link>
          <div className="pt-2 space-y-2">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-center font-bold block shadow-sm"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
