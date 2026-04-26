'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList } from 'lucide-react';

export default function AuditPage() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('audit')}</h1>
        <p className="text-text-muted text-sm mt-0.5">سجل جميع العمليات والتغييرات في النظام</p>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-xl">
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm">{tc('noData')}</p>
        </div>
      </div>
    </div>
  );
}
