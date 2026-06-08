import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { locales, localeDir, type Locale } from '@/i18n/config';

export const metadata: Metadata = {
  title: 'MAWAQEI ELNUJUM — شركة مواقع النجوم للمقاولات',
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: LocaleLayoutProps) {
  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const dir = localeDir[locale as Locale];
  const wrapperClassName = dir === 'rtl' ? 'min-h-screen font-arabic' : 'min-h-screen';

  return (
    <NextIntlClientProvider messages={messages}>
      <QueryProvider>
        <div lang={locale} dir={dir} className={wrapperClassName}>
          {children}
        </div>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
