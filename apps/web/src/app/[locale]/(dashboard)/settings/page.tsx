'use client';

import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-text-muted text-sm mt-0.5">إعدادات النظام العامة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Name */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-text-primary">هوية النظام</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary">{t('systemName')} (عربي)</label>
              <Input defaultValue="نظام التحكم بالتكاليف" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary">{t('systemName')} (English)</label>
              <Input defaultValue="CDC System" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary">{t('logo')}</label>
              <div className="border-2 border-dashed border-surface-border rounded-lg p-8 text-center text-text-muted text-sm">
                انقر لرفع الشعار
              </div>
            </div>
          </div>
        </div>

        {/* Regional */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-text-primary">الإقليمية والعملة</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary">{t('defaultCurrency')}</label>
              <Input defaultValue="SAR" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary">{t('defaultLanguage')}</label>
              <Input defaultValue="ar" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary">{t('primaryColor')}</label>
              <div className="flex gap-2">
                <Input defaultValue="#1e6fba" dir="ltr" className="flex-1" />
                <div className="w-9 h-9 rounded-md border border-surface-border bg-brand flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>{tc('save')}</Button>
      </div>
    </div>
  );
}
