import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@perzent/shared-types';
import { PublicPage, Section, SupportEmailLink } from '@/components/PublicPage';

export const metadata: Metadata = {
  title: 'Support — Perzent',
  description: 'How to get help with the Perzent Field Employee app and the owner portal: contact, common fixes and service status.',
};

const QUICK_FIXES: Array<[string, string]> = [
  ['I cannot sign in on the phone', 'Accounts are created by your employer. Ask your company owner or manager for your registered phone number and temporary password. Passwords are at least 6 characters.'],
  ['"Account is bound to another phone"', 'Each account works on one phone at a time. Your manager or owner can reset the device from the Employees page (or the manager tab in the app); then sign in again on the new phone.'],
  ['Check-in is blocked', 'The readiness card lists the reason: location permission must be "Allow all the time", GPS must be on, Battery Saver must be off, battery above 5 %, and no mock-location app. Fix the item and tap Check in again.'],
  ['The owner map shows "GPS/Net lost"', 'The phone has not sent a location for more than 2 minutes — usually GPS or mobile data is off, or the phone killed the app. Turn location and data back on; on Xiaomi/Vivo/Oppo phones set the app to "No restrictions" in battery settings.'],
  ['Tracking stopped after a reboot', 'Version 1.2.0 and later resume tracking automatically after the phone restarts and unlocks. Update the app from the download page if you are on an older build.'],
  ['The app says "under maintenance"', 'We are upgrading the service. Shift tracking already in progress keeps working on the phone and is sent when we are back. Tap "Check again" after a few minutes.'],
  ['I forgot my password', 'Employees: ask your owner/manager to set a new temporary password (Employees → Reset password). Owners: contact us at the address below and we will verify your identity.'],
];

export default function SupportPage() {
  return (
    <PublicPage
      eyebrow="Support"
      title="Get help with Perzent"
      intro={
        <p>
          Perzent is developed and supported by{' '}
          <a href={BRAND.developerUrl} target="_blank" rel="noreferrer" className="text-[#15803D] underline">{BRAND.developerName}</a>.
          Most questions are answered on the <Link href={BRAND.faqPath} className="text-[#15803D] underline">FAQ</Link>; for anything else, write to us.
        </p>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5 space-y-2">
          <h2 className="text-sm font-bold">Email support</h2>
          <p className="text-sm text-slate-700">
            <SupportEmailLink subject="Perzent support" />
          </p>
          <p className="text-xs text-slate-500">Include your company name, the phone number on the account and, for app issues, the app version shown at the bottom of the duty screen. We reply within one business day (IST).</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5 space-y-2">
          <h2 className="text-sm font-bold">Employees: ask your employer first</h2>
          <p className="text-sm text-slate-700">Your company owner or manager can create accounts, reset passwords, reset a device binding, correct attendance and answer questions about shift rules — usually faster than we can.</p>
          <p className="text-xs text-slate-500">We only process data on your employer&apos;s behalf; see the <Link href={BRAND.privacyPath} className="underline">privacy policy</Link>.</p>
        </div>
      </div>

      <Section id="fixes" title="Common fixes">
        <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {QUICK_FIXES.map(([q, a]) => (
            <div key={q} className="p-4 space-y-1">
              <dt className="font-semibold text-slate-900">{q}</dt>
              <dd className="text-slate-700">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="status" title="Service status">
        <p>
          If the app or portal shows a maintenance notice, we are upgrading the service and will be back shortly. Shifts already checked in
          keep recording location on the phone and upload automatically afterwards. Current status is also available at{' '}
          <code className="font-mono text-xs bg-slate-100 px-1 rounded">{BRAND.webUrl}/api/status</code>.
        </p>
      </Section>

      <Section id="links" title="Useful links">
        <ul className="list-disc pl-5 space-y-1">
          <li><Link href="/download" className="text-[#15803D] underline">Download the Android app</Link></li>
          <li><Link href={BRAND.faqPath} className="text-[#15803D] underline">Frequently asked questions</Link></li>
          <li><Link href={BRAND.privacyPath} className="text-[#15803D] underline">Privacy policy</Link> · <Link href={BRAND.termsPath} className="text-[#15803D] underline">Terms of service</Link></li>
          <li><Link href={BRAND.accountDeletionPath} className="text-[#15803D] underline">Request account or data deletion</Link></li>
        </ul>
      </Section>
    </PublicPage>
  );
}
