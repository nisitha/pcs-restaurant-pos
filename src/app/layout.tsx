import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppSidebarShell } from '@/components/layout/sidebar-shell';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PCS Restaurant POS & Management System',
  description: 'Enterprise point of sale, kitchen display, and restaurant operations system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F6F7F9] text-[#1A1D1F] font-sans">
        <Suspense fallback={<div className="h-screen w-screen bg-[#F6F7F9]" />}>
          <AppSidebarShell>{children}</AppSidebarShell>
        </Suspense>
      </body>
    </html>
  );
}
