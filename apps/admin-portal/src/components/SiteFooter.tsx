import Link from 'next/link';
import { PerzentLogo } from '@/components/PerzentLogo';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-8 text-xs text-slate-600">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Brand Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <PerzentLogo markClassName="h-8 w-8" textClassName="text-lg" />
          </div>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            Real-time field workforce attendance and location intelligence platform. Eliminating proxy punches with hardware-bound GPS security.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <img
              src="/jsp-coders-logo.png"
              alt="Operated by JSP Coders"
              className="h-5 w-auto object-contain opacity-80"
            />
            <span className="text-[11px] text-slate-400 font-medium border-l border-slate-200 pl-2">
              © {new Date().getFullYear()} Perzent · Operated by JSP Coders
            </span>
          </div>
        </div>

        {/* Product Column */}
        <div className="space-y-2.5">
          <span className="font-bold text-slate-900 text-xs block">Product</span>
          <ul className="space-y-2 text-slate-600 font-medium">
            <li><Link href="/features" className="hover:text-slate-900 transition-colors">Features</Link></li>
            <li><Link href="/solutions" className="hover:text-slate-900 transition-colors">Solutions</Link></li>
            <li><Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link></li>
            <li><Link href="/download" className="hover:text-emerald-700 font-bold transition-colors">Android APK</Link></li>
          </ul>
        </div>

        {/* Resources Column */}
        <div className="space-y-2.5">
          <span className="font-bold text-slate-900 text-xs block">Resources</span>
          <ul className="space-y-2 text-slate-600 font-medium">
            <li><Link href="/about" className="hover:text-slate-900 transition-colors">About Us</Link></li>
            <li><Link href="/faq" className="hover:text-slate-900 transition-colors">FAQ</Link></li>
            <li><Link href="/support" className="hover:text-slate-900 transition-colors">Support</Link></li>
            <li><Link href="/kiosk" className="hover:text-slate-900 transition-colors">Shared Kiosk</Link></li>
          </ul>
        </div>

        {/* Legal & Account Column */}
        <div className="space-y-2.5">
          <span className="font-bold text-slate-900 text-xs block">Legal & Account</span>
          <ul className="space-y-2 text-slate-600 font-medium">
            <li><Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link></li>
            <li><Link href="/account-deletion" className="hover:text-slate-900 transition-colors">Account Deletion</Link></li>
            <li><Link href="/login" className="hover:text-slate-900 transition-colors font-bold">Portal Sign In</Link></li>
            <li><Link href="/register" className="hover:text-slate-900 transition-colors font-bold text-emerald-700">Register</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
