import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppSidebarShell } from '@/components/layout/sidebar-shell';

const bricolageGrotesque = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PCS Bill — Commercial Restaurant POS & Management OS',
  description: 'Flagship point of sale, kitchen display, table flow, and restaurant operations platform by Pixel Craft Studios (pcsbill.com)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolageGrotesque.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#f4fbf7] text-[#072619] font-sans"
      >
        <Suspense fallback={<div className="h-screen w-screen bg-[#f4fbf7]" />}>
          <AppSidebarShell>{children}</AppSidebarShell>
        </Suspense>
      </body>
    </html>
  );
}
