import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@perzent/shared-types';

export const metadata: Metadata = {
  title: 'Privacy Policy — Perzent',
  description:
    'How the Perzent Field Employee Android app and the Perzent web portal collect, use, store and share personal data, including background location during shifts.',
};

const EFFECTIVE_DATE = '27 August 2026';
const SUPPORT_EMAIL = BRAND.supportEmail;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-2 scroll-mt-20">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

const TOC = [
  ['who', 'Who is responsible for your data'],
  ['collect', 'What we collect'],
  ['location', 'Location data and background collection'],
  ['why', 'Why we collect it'],
  ['retention', 'How long we keep it'],
  ['sharing', 'Who we share it with'],
  ['security', 'How we protect it'],
  ['rights', 'Your rights'],
  ['children', 'Children'],
  ['changes', 'Changes to this policy'],
  ['contact', 'Contact'],
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <header className="h-14 px-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center font-bold text-sm text-white shrink-0">P</div>
          <span className="font-bold text-sm tracking-tight">PERZENT</span>
        </Link>
        <nav className="flex items-center gap-3 text-xs" aria-label="Header">
          <Link href="/download" className="text-slate-600 hover:text-slate-900">Android app</Link>
          <Link href="/login" className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold">Sign in</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#16A34A]">Privacy policy</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Perzent Field Employee app & Perzent web portal</h1>
          <p className="text-sm text-slate-600">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>. This policy applies to the <strong>Perzent Field Employee</strong> Android app
            (package <code className="font-mono text-xs bg-slate-100 px-1 rounded">app.jspcoders.perzent</code>) and the Perzent owner/manager web portal.
          </p>
        </div>

        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 space-y-1">
          <p className="font-semibold">In short</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Your employer sets up your account and is responsible for your data. Perzent is operated by JSP Coders on their behalf.</li>
            <li>Your precise location is collected <strong>only while you are checked in on a shift</strong>, including in the background, and stops on break and at check-out.</li>
            <li>Route points are deleted after your company's retention period (15 days by default). We never sell your data.</li>
          </ul>
        </div>

        <nav aria-label="Contents" className="p-4 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Contents</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm list-decimal pl-5">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-slate-700 hover:text-[#16A34A] underline-offset-2 hover:underline">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="who" title="1. Who is responsible for your data">
          <p>
            Perzent is a workforce attendance and location tool that companies use for their own staff. <strong>The company that employs you
            (your employer) is the data controller</strong>: it decides to use Perzent, creates your account, and decides how long records are kept.
          </p>
          <p>
            The app and portal are built and operated by <strong>JSP Coders</strong> ("we", "us"), which processes data on your employer's behalf
            as a service provider and hosts the service.
          </p>
        </Section>

        <Section id="collect" title="2. What we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account details supplied by your employer:</strong> your name, phone number, email (optional), designation, department and
              manager, plus a password that you can change.
            </li>
            <li>
              <strong>Attendance records:</strong> check-in and check-out timestamps, break start/end times, who recorded a punch (you, a manager or
              the automatic end-of-day check-out) and any reason a manager entered for a manual correction.
            </li>
            <li>
              <strong>Precise location:</strong> latitude, longitude, accuracy, speed and heading — only while you are checked in (see section 3).
            </li>
            <li>
              <strong>Device details for single-device binding:</strong> device model, Android version and the Android ID of the phone you signed in
              on. Your account works on one bound phone at a time; your employer can reset the binding.
            </li>
            <li>
              <strong>Device state flags:</strong> battery level, whether the phone is charging, whether power-save mode is on, whether location
              services (GPS) are enabled, whether the location permission is granted, and whether a mock-location app is detected. We do not read
              your contacts, messages, photos, microphone, sound, brightness, storage or memory.
            </li>
            <li>
              <strong>Technical logs:</strong> the time of API requests and the IP address they came from, kept briefly for security and debugging.
            </li>
          </ul>
        </Section>

        <Section id="location" title="3. Location data and background collection">
          <p>
            The app collects your precise location <strong>only between your check-in and check-out on a shift</strong>. While a shift is active,
            the app runs a foreground service with a persistent notification so that location continues to be recorded when the app is in the
            background or the screen is off. Collection <strong>pauses when you start a break</strong> and <strong>stops when you check out</strong>
            (or when the company's automatic end-of-day check-out runs).
          </p>
          <p>
            Location is not collected when you are not checked in, and the app does not track you outside working shifts. You can revoke the
            location permission at any time in Android settings; the app will then be unable to record attendance and your employer will be shown
            that GPS or permission is unavailable.
          </p>
          <p>
            Google Play's declaration for this app is <em>"Background location, used for attendance and route verification during work shifts"</em>.
          </p>
        </Section>

        <Section id="why" title="4. Why we collect it">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Attendance:</strong> to record when and where you check in and out, and to calculate worked hours, breaks and overtime.</li>
            <li><strong>Route verification:</strong> so your employer can see the route travelled and the places you stopped during a shift.</li>
            <li><strong>Safety and integrity:</strong> battery and GPS state help distinguish a flat phone from a missing employee; device binding and mock-location detection prevent account sharing and fake locations.</li>
            <li><strong>Service operation:</strong> to keep the service secure, diagnose problems and prevent abuse.</li>
          </ul>
          <p>Your employer's legal basis is normally its legitimate interest in managing attendance and field work, or your employment contract, in line with local law.</p>
        </Section>

        <Section id="retention" title="5. How long we keep it">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Route points (GPS waypoints and stops):</strong> automatically deleted after your company's configured route retention period —
              <strong> 15 days by default</strong> (companies may choose between 7 and 90 days).
            </li>
            <li>
              <strong>Attendance records:</strong> kept according to your company's attendance retention policy — <strong>45 days by default</strong>
              (30 to 365 days), then deleted.
            </li>
            <li><strong>Account details:</strong> kept while your account exists. When your employer terminates your account it is deactivated and removed from active use.</li>
            <li><strong>Technical logs:</strong> kept for a short period (typically no more than 30 days).</li>
          </ul>
        </Section>

        <Section id="sharing" title="6. Who we share it with">
          <p>
            <strong>We do not sell personal data</strong> and we do not use it for advertising. Your data is shared only with:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Your employer</strong> — owners and managers of your company see your attendance, live location during shifts and route history in the portal.</li>
            <li><strong>Hosting providers</strong> — the service runs on <strong>Vercel</strong> (application hosting) and <strong>Supabase</strong> (database), which store data on our behalf under their own security commitments.</li>
            <li><strong>Map tiles</strong> — the portal loads background map imagery from OpenStreetMap when a manager views the map; your coordinates are not sent to OpenStreetMap.</li>
            <li><strong>Authorities</strong> — only if required by law.</li>
          </ul>
        </Section>

        <Section id="security" title="7. How we protect it">
          <ul className="list-disc pl-5 space-y-1">
            <li>All traffic between the app, the portal and our servers is encrypted with TLS (HTTPS).</li>
            <li>Passwords are stored only as salted hashes; we cannot read them.</li>
            <li>Session tokens are stored hashed on the server and expire; signing out invalidates them.</li>
            <li>Access to company data is restricted to that company's owner and managers.</li>
          </ul>
        </Section>

        <Section id="rights" title="8. Your rights">
          <p>
            Depending on where you live you may have the right to access, correct, delete or restrict the use of your personal data, and to object
            to processing. Because your employer is the controller:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>To view your data</strong>, ask your employer — owners and managers can show you your attendance and route history in the portal.</li>
            <li><strong>To correct or delete your data</strong>, or to close your account, ask your employer. They can terminate the account, reset the device binding, and adjust retention.</li>
            <li>To delete your account or data, follow the steps on the <Link href="/account-deletion" className="text-[#16A34A] underline">account deletion page</Link>.</li>
            <li>If you cannot reach your employer, or believe the service is being misused, contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#16A34A] underline">{SUPPORT_EMAIL}</a> and we will assist or forward your request.</li>
          </ul>
          <p>You can stop location collection at any time by checking out, or by revoking the location permission in Android settings.</p>
        </Section>

        <Section id="children" title="9. Children">
          <p>
            Perzent is a workplace tool for employees and is <strong>not intended for anyone under 18</strong>. Employers must not create accounts
            for minors. If we learn that we hold data about a person under 18 we will delete it.
          </p>
        </Section>

        <Section id="changes" title="10. Changes to this policy">
          <p>
            We may update this policy when the app or the law changes. The effective date at the top will change, and material changes will be
            announced in the app or the portal. Continued use after a change means the updated policy applies.
          </p>
        </Section>

        <Section id="contact" title="11. Contact">
          <p>
            Operator: <strong>JSP Coders</strong> (Perzent).<br />
            Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#16A34A] underline">{SUPPORT_EMAIL}</a>
          </p>
          <p>For questions about how your specific employer uses Perzent, contact your employer's HR or owner account directly.</p>
        </Section>
      </main>

      <footer className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>© 2026 Perzent · operated by JSP Coders</span>
        <nav className="flex items-center gap-3" aria-label="Footer">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <Link href="/download" className="hover:text-slate-900">Android app</Link>
          <Link href="/login" className="hover:text-slate-900">Sign in</Link>
          <Link href="/register" className="hover:text-slate-900">Register</Link>
        </nav>
      </footer>
    </div>
  );
}
