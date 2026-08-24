import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Perzent - Multi-App Workforce Tracking & Attendance',
  description: 'Enterprise Employee Live Tracking, Dwell-Time Analysis & Shift Attendance Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
