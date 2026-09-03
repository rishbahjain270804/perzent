import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perzent Operator Console',
  robots: { index: false, follow: false },
};

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
