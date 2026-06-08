import type { Metadata } from 'next';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/store/theme.store';

export const metadata: Metadata = {
  title: 'MAWAQEI ELNUJUM Contracting — شركة مواقع النجوم للمقاولات',
  description: 'نظام إدارة المشاريع والتكاليف والمشتريات — MAWAQEI ELNUJUM Project & Cost Management System',
  icons: {
    icon: '/mawaqie-mark.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,400..500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-text-primary">{children}</body>
    </html>
  );
}
