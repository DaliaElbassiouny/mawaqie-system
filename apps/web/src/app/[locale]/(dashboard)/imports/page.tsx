'use client';

import { useTranslations } from 'next-intl';
import { Upload, Clock } from 'lucide-react';

export default function ImportsPage() {
  const t = useTranslations('nav');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('imports')}</h1>
        <p className="text-text-muted text-sm mt-0.5">استيراد البيانات من ملفات Excel</p>
      </div>

      {/* Import layer scaffold */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['فحص الملف', 'مطابقة الحقول', 'تشغيل الاستيراد'].map((step, i) => (
          <div
            key={i}
            className="bg-surface-card border border-surface-border rounded-xl p-5 opacity-50"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand text-sm font-bold">
                {i + 1}
              </div>
              <span className="font-medium text-text-primary">{step}</span>
            </div>
            <p className="text-xs text-text-muted">سيتوفر في مرحلة قادمة</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl">
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <div className="relative mb-4">
            <Upload className="w-16 h-16 opacity-20" />
            <Clock className="w-6 h-6 absolute -top-1 -end-1 text-gold opacity-70" />
          </div>
          <p className="text-lg font-medium text-text-secondary">طبقة الاستيراد جاهزة للتطوير</p>
          <p className="text-xs mt-1">الهيكلة الأساسية موجودة في قاعدة البيانات</p>
        </div>
      </div>
    </div>
  );
}
