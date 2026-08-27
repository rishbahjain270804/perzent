import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@perzent/shared-types';
import { PublicPage, Section, SupportEmailLink } from '@/components/PublicPage';

export const metadata: Metadata = {
  title: 'Account & data deletion — Perzent',
  description: 'How to delete a Perzent account and the data associated with it (Perzent Field Employee app and web portal).',
};

export default function AccountDeletionPage() {
  return (
    <PublicPage
      eyebrow="Account deletion"
      title="Delete your account or data"
      intro={<p>This page applies to the <strong>Perzent Field Employee</strong> Android app (package <code className="font-mono text-xs bg-slate-100 px-1 rounded">app.jspcoders.perzent</code>) and the Perzent web portal, both developed by {BRAND.developerName}.</p>}
    >
      <Section id="employees" title="Employees">
        <p>Your account was created by your employer, who controls it. To delete it:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Ask your company owner or manager to remove you in the portal (Employees → Suspend or delete). This deletes your profile, device binding, attendance records and route history for that company.</li>
          <li>If you cannot reach your employer, email <SupportEmailLink subject="Perzent account deletion request" /> from the phone number or email registered on the account. We verify the request with the company and complete the deletion.</li>
        </ol>
        <p>You can also remove local data at any time by signing out of the app (which stops tracking and deletes the saved session) and uninstalling it.</p>
      </Section>
      <Section id="owners" title="Company owners">
        <p>Email <SupportEmailLink subject="Perzent company deletion request" /> from the owner email address with the company name. Deleting a company removes all its employees, attendance, routes, sessions and settings.</p>
      </Section>
      <Section id="what" title="What is deleted and when">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Deleted immediately:</strong> profile (name, phone, email), device binding, sessions, attendance and break records, route points and archives, leave requests, telemetry.</li>
          <li><strong>Kept up to 30 days:</strong> copies in encrypted database backups, after which they expire automatically.</li>
          <li><strong>Kept where the law requires it:</strong> minimal billing or legal records, if any exist for a paid plan (none on the free plan).</li>
        </ul>
        <p>Requests are completed within <strong>7 days</strong>; we confirm by email.</p>
      </Section>
      <Section id="more" title="More information">
        <p>See the <Link href={BRAND.privacyPath} className="text-[#15803D] underline">Privacy Policy</Link> for what we collect and why, and <Link href={BRAND.supportPath} className="text-[#15803D] underline">Support</Link> for other questions.</p>
      </Section>
    </PublicPage>
  );
}
