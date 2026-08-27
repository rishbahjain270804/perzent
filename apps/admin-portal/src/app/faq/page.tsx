import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@perzent/shared-types';
import { PublicPage, Section, SupportEmailLink } from '@/components/PublicPage';

export const metadata: Metadata = {
  title: 'FAQ — Perzent',
  description: 'Answers for employees and company owners about Perzent attendance, live location, breaks, auto check-out, privacy and the Android app.',
};

type QA = { q: string; a: React.ReactNode };

const EMPLOYEE_FAQ: QA[] = [
  { q: 'How do I get an account?', a: 'Your employer creates it in the Perzent portal and gives you your phone number and a temporary password. There is no self-registration for employees.' },
  { q: 'Why does the app ask for "Allow all the time" location?', a: 'Your live location is recorded only while you are checked in to a shift, including when the app is in the background or the screen is off. Android needs the "all the time" permission for that. Location sharing pauses on breaks and stops at check-out.' },
  { q: 'Does the app track me after work?', a: 'No. Nothing is recorded when you are checked out or on a break. You can see the persistent notification whenever sharing is active, and remove it by checking out.' },
  { q: 'Why can I only use one phone?', a: 'Each account is bound to one phone to prevent buddy punching. If you change phones, ask your manager or owner to reset the device; then sign in on the new one.' },
  { q: 'What does "Check-in blocked" mean?', a: 'The readiness card lists what must be fixed: location permission, GPS on, Battery Saver off, battery above 5 %, and no mock-location app. Each item is checked again automatically.' },
  { q: 'How long can a break be?', a: 'Your company sets a maximum (30 minutes by default). When it runs out the shift resumes automatically and location sharing restarts.' },
  { q: 'What if I forget to check out?', a: 'Your company sets an auto check-out time (23:40 by default). The shift is closed automatically at that time and your hours are calculated up to it. A manager can also correct it.' },
  { q: 'What happens with no internet?', a: 'Location points are saved on the phone and sent automatically when the connection returns. Check-in, break and check-out need internet.' },
  { q: 'My phone restarted — do I need to do anything?', a: 'No. If a shift was open, tracking resumes by itself after the phone unlocks (app version 1.2.0 or later).' },
  { q: 'How do I see my hours?', a: 'Your employer sees attendance and timesheets in the portal and can share them. In-app history is planned.' },
];

const OWNER_FAQ: QA[] = [
  { q: 'How much does Perzent cost?', a: 'The launch plan is free with unlimited employees and all features. We will announce any paid plan in advance; nothing changes without your agreement.' },
  { q: 'How do I add staff?', a: 'Employees → Add employee. Enter a name, phone number and temporary password (minimum 6 characters), and optionally a role (Employee/Manager), manager and department. Share the credentials with the employee; they sign in on the Android app.' },
  { q: 'What can a manager do?', a: 'Managers see and manage only their own team: live map, attendance corrections, adding employees and device resets, both in the portal and in the app.' },
  { q: 'How accurate is the live map?', a: 'Positions arrive every few seconds while an employee moves and are shown as live, stale (60–120 s) or lost (over 2 minutes without a ping). Stationary employees stay at their last position without generating extra data.' },
  { q: 'How long is route history kept?', a: 'Route points are kept for the retention period you set in Settings (15 days by default) and then deleted; attendance records are kept per your attendance retention setting.' },
  { q: 'Can employees fake their location?', a: 'The app blocks mock-location apps at check-in, reports them in the live map as a tamper alert, and ties every account to one phone. No system is perfect; treat alerts as a prompt to verify.' },
  { q: 'Which phones are supported?', a: 'Android 7.0 (API 24) and newer. On Xiaomi, Vivo, Oppo and similar phones, set Perzent to "No restrictions" in battery settings so the system does not stop tracking.' },
  { q: 'Who owns the data?', a: 'You do. Perzent processes it on your behalf; see the privacy policy and terms. You can delete employees (which removes their data) at any time.' },
];

function FaqList({ items }: { items: QA[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
      {items.map((item) => (
        <details key={item.q} className="group p-4">
          <summary className="cursor-pointer font-semibold text-slate-900 list-none flex justify-between items-center gap-3">
            {item.q}
            <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
          </summary>
          <div className="mt-2 text-sm text-slate-700 leading-relaxed">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

export default function FaqPage() {
  return (
    <PublicPage
      eyebrow="FAQ"
      title="Frequently asked questions"
      intro={<p>Can&apos;t find your answer? Visit <Link href={BRAND.supportPath} className="text-[#15803D] underline">Support</Link> or email <SupportEmailLink subject="Perzent question" />.</p>}
    >
      <Section id="employees" title="For employees">
        <FaqList items={EMPLOYEE_FAQ} />
      </Section>
      <Section id="owners" title="For company owners and managers">
        <FaqList items={OWNER_FAQ} />
      </Section>
    </PublicPage>
  );
}
