import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@perzent/shared-types';
import { PublicPage, Section, SupportEmailLink } from '@/components/PublicPage';

export const metadata: Metadata = {
  title: 'Terms of Service — Perzent',
  description: 'Terms for using the Perzent web portal and the Perzent Field Employee Android app.',
};

const EFFECTIVE_DATE = '28 August 2026';

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="Terms of service"
      title="Perzent Terms of Service"
      intro={<p>Effective date: <strong>{EFFECTIVE_DATE}</strong>. These terms are a contract between you and {BRAND.developerName} (&quot;we&quot;, &quot;us&quot;) for the use of the Perzent web portal and the Perzent Field Employee Android app (together, the &quot;Service&quot;).</p>}
    >
      <Section id="who" title="1. Who can use the Service">
        <p><strong>Companies</strong> register an owner account and use the Service to record attendance and, during shifts, the location of their staff. <strong>Employees and managers</strong> use accounts created by their company. By registering a company you confirm you are authorised to act for it.</p>
      </Section>
      <Section id="plan" title="2. Free launch plan">
        <p>The Service is currently offered on a free launch plan with unlimited employees and all features. We may introduce paid plans later; we will give at least 30 days&apos; notice and you will never be charged without agreeing to a plan first.</p>
      </Section>
      <Section id="employer" title="3. Employer responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>Inform your staff, in line with applicable law and your local practice, that attendance and shift-time location are recorded, why, and for how long. The app shows a disclosure before location is collected, but the employment relationship and any required consent are yours to manage.</li>
          <li>Use the data only for lawful workforce purposes such as attendance, payroll, route verification and safety.</li>
          <li>Keep owner and manager credentials confidential and remove access for people who leave.</li>
          <li>Enter accurate information and correct attendance only with a documented reason.</li>
        </ul>
      </Section>
      <Section id="acceptable" title="4. Acceptable use">
        <p>You must not: use the Service to track anyone who is not your employee or outside their working shifts; attempt to bypass device binding, mock-location detection or access controls; probe, overload or reverse-engineer the Service; or upload unlawful content. We may suspend accounts that breach these rules.</p>
      </Section>
      <Section id="data" title="5. Your data and privacy">
        <p>Your company owns its data. We process it only to provide the Service, as described in the <Link href={BRAND.privacyPath} className="text-[#15803D] underline">Privacy Policy</Link>. Route points are deleted after the retention period you configure; deleting an employee removes their personal data. Accounts and data can be deleted as described on the <Link href={BRAND.accountDeletionPath} className="text-[#15803D] underline">account deletion</Link> page.</p>
      </Section>
      <Section id="availability" title="6. Availability and changes">
        <p>We aim for high availability but the Service is provided &quot;as is&quot; and may be interrupted for maintenance or reasons outside our control. Location accuracy depends on the phone, GPS conditions and network. We may change or discontinue features; material changes to these terms will be announced in the portal or app.</p>
      </Section>
      <Section id="liability" title="7. Limitation of liability">
        <p>To the fullest extent permitted by law, {BRAND.developerName} is not liable for indirect or consequential losses, lost profits, payroll disputes, or decisions taken on the basis of recorded data. Our total liability for any claim is limited to the amount you paid for the Service in the 12 months before the claim (zero on the free plan).</p>
      </Section>
      <Section id="termination" title="8. Termination">
        <p>You may stop using the Service at any time and request deletion. We may suspend or terminate accounts for breach of these terms or where required by law, giving notice where practical.</p>
      </Section>
      <Section id="law" title="9. Governing law">
        <p>These terms are governed by the laws of India. Courts in Rajasthan, India have exclusive jurisdiction, subject to any mandatory consumer protections that apply to you.</p>
      </Section>
      <Section id="contact" title="10. Contact">
        <p>{BRAND.developerName} · <SupportEmailLink subject="Perzent terms" /> · <a href={BRAND.developerUrl} target="_blank" rel="noreferrer" className="text-[#15803D] underline">{BRAND.developerUrl}</a></p>
      </Section>
    </PublicPage>
  );
}
