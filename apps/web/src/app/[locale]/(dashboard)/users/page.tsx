'use client';

import { useTranslations } from 'next-intl';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">إدارة حسابات المستخدمين والأدوار</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t('newUser')}
        </Button>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-xl">
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Users className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm">{tc('noData')}</p>
        </div>
      </div>
    </div>
  );
}
