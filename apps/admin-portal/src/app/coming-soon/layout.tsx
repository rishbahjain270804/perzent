import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perzent — Coming soon',
  description:
    'Perzent is launching soon: GPS-verified field attendance, live team map, route history and payroll-ready timesheets. Join the early-access waitlist.',
};

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
