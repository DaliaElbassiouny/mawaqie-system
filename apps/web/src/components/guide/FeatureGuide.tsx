'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { X, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useFeatureGuide } from '@/hooks/useFeatureGuide';

interface GuideStep {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  permission?: string;
  permissions?: string[];
  permissionMode?: 'any' | 'all';
}

const GUIDE_STEPS: GuideStep[] = [
  {
    titleAr: 'لوحة التحكم',
    titleEn: 'Dashboard',
    bodyAr: 'تعرض ملخص سريع للمشاريع، طلبات الشراء، التكاليف، التأخيرات، والتنبيهات المهمة.',
    bodyEn: 'Shows a quick summary of projects, purchase requests, costs, delays, and important alerts.',
  },
  {
    titleAr: 'العملاء',
    titleEn: 'Clients',
    bodyAr: 'يتم تسجيل بيانات العملاء وربطهم بالمناقصات والمشاريع.',
    bodyEn: 'Register client details and link them to tenders and projects.',
    permission: 'clients:view',
  },
  {
    titleAr: 'التسعير والمناقصات',
    titleEn: 'Pricing & Tenders',
    bodyAr: 'متابعة الفرص والعروض وحالة كل مناقصة قبل أن تتحول إلى مشروع فعلي.',
    bodyEn: 'Track opportunities, offers, and each tender status before it becomes an active project.',
    permission: 'tenders:view',
  },
  {
    titleAr: 'المشاريع',
    titleEn: 'Projects',
    bodyAr: 'كل مشروع له صفحة مركزية تجمع بياناته، التشغيل، المشتريات، التكاليف، والمستندات.',
    bodyEn: 'Each project has a central page for details, operations, procurement, costs, and documents.',
    permission: 'projects:view',
  },
  {
    titleAr: 'التشغيل',
    titleEn: 'Operations',
    bodyAr: 'متابعة أنشطة الموقع، التقارير اليومية، المعوقات، ونِسَب التقدم.',
    bodyEn: 'Follow site activities, daily reports, blockers, and progress percentages.',
    permission: 'operations:view',
  },
  {
    titleAr: 'احتياجات الأنشطة',
    titleEn: 'Activity Needs',
    bodyAr:
      'هنا يتم تحديد المواد أو المعدات أو الخدمات التي يحتاجها كل نشاط في الموقع.\n\nمتاح: لا يحتاج طلب شراء.\nيحتاج طلب شراء: يمكن تحويله إلى طلب شراء رسمي.\nتم تحويله لطلب شراء: تم إنشاء طلب شراء مرتبط بهذا الاحتياج.',
    bodyEn:
      'Define the materials, equipment, or services each site activity needs.\n\nAvailable: no purchase request is needed.\nNeeds purchase request: can be converted into a formal request.\nConverted: a linked purchase request has been created.',
    permission: 'operations:view',
  },
  {
    titleAr: 'تحويل إلى طلب شراء',
    titleEn: 'Convert to Purchase Request',
    bodyAr:
      'عند الضغط على "تحويل إلى طلب شراء"، يتم فتح نموذج جاهز ببيانات النشاط والاحتياج. بعد المراجعة والإنشاء، يظهر رقم طلب الشراء المرتبط بالاحتياج.',
    bodyEn:
      'Selecting "Convert to Purchase Request" opens a form prefilled from the activity need. After review and creation, the linked request number appears on the need.',
    permission: 'procurement:create',
  },
  {
    titleAr: 'طلبات الشراء',
    titleEn: 'Purchase Requests',
    bodyAr: 'تعرض الطلبات الرسمية التي تم إنشاؤها سواء من احتياجات الأنشطة أو مباشرة من المستخدمين.',
    bodyEn: 'Shows formal requests created from activity needs or directly by users.',
    permission: 'procurement:view',
  },
  {
    titleAr: 'الاعتماد',
    titleEn: 'Approval',
    bodyAr: 'طلبات الشراء تمر بمراحل مراجعة واضحة: مراجعة المشتريات، مراجعة التكلفة، مراجعة مدير المشروع، ثم الاعتماد النهائي.',
    bodyEn: 'Purchase requests pass through clear review stages: procurement, cost, project manager, then final approval.',
    permissions: ['procurement:update', 'procurement:approve'],
  },
  {
    titleAr: 'التنفيذ والاستلام',
    titleEn: 'Delivery & Receiving',
    bodyAr: 'بعد اعتماد طلب الشراء، يتم تحديثه خطوة بخطوة: معتمد، منفذ، مستلم، مكتمل. يظهر زر واحد فقط للخطوة التالية.',
    bodyEn: 'After approval, the request moves step by step: approved, executed, received, completed. Only the next action button is shown.',
    permission: 'procurement:update',
  },
  {
    titleAr: 'مراقبة التكاليف',
    titleEn: 'Cost Control',
    bodyAr: 'متابعة التكاليف، الفواتير، المستخلصات، والانحرافات المالية للمشاريع.',
    bodyEn: 'Track project costs, invoices, extracts, and financial variances.',
    permission: 'cost:view',
  },
  {
    titleAr: 'المستندات',
    titleEn: 'Documents',
    bodyAr: 'رفع وتنظيم ملفات المشروع وربطها بالمشروع أو الطلبات.',
    bodyEn: 'Upload and organize project files, then link them to projects or requests.',
    permission: 'documents:view',
  },
  {
    titleAr: 'التقارير',
    titleEn: 'Reports',
    bodyAr: 'عرض تقارير إدارية وتشغيلية ومالية تساعد الإدارة في اتخاذ القرار.',
    bodyEn: 'View management, operational, and financial reports that support decision making.',
    permission: 'reports:view',
  },
  {
    titleAr: 'المستخدمون والإعدادات',
    titleEn: 'Users & Settings',
    bodyAr: 'للمسؤولين فقط، لإدارة المستخدمين والصلاحيات والإعدادات العامة.',
    bodyEn: 'For administrators only, used to manage users, permissions, and general settings.',
    permissions: ['users:view', 'settings:view'],
  },
];

export function FeatureGuide() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { hasPermission } = useAuthStore();
  const { isOpen, closeGuide, dismissForever, completeGuide } = useFeatureGuide();

  const visibleSteps = GUIDE_STEPS.filter((step) => {
    if (step.permission && !hasPermission(step.permission)) return false;
    if (!step.permissions?.length) return true;

    const checks = step.permissions.map((permission) => hasPermission(permission));
    return step.permissionMode === 'all'
      ? checks.every(Boolean)
      : checks.some(Boolean);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [neverShow, setNeverShow] = useState(false);

  useEffect(() => {
    if (currentIndex >= visibleSteps.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, visibleSteps.length]);

  const step = visibleSteps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === visibleSteps.length - 1;

  const resetModalState = useCallback(() => {
    setCurrentIndex(0);
    setNeverShow(false);
  }, []);

  const handleClose = useCallback(() => {
    if (neverShow) dismissForever();
    else closeGuide();
    resetModalState();
  }, [neverShow, dismissForever, closeGuide, resetModalState]);

  const handleComplete = useCallback(() => {
    if (neverShow) dismissForever();
    else completeGuide();
    resetModalState();
  }, [neverShow, dismissForever, completeGuide, resetModalState]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleComplete();
      return;
    }
    setCurrentIndex((i) => i + 1);
  }, [isLast, handleComplete]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!isOpen || visibleSteps.length === 0 || !step) return null;

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal
        aria-labelledby="guide-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-2xl">
          <div
            className="flex items-center justify-between border-b border-surface-border px-5 py-4"
            style={{ backgroundColor: 'hsl(var(--shell-bg))' }}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(var(--brand))' }} />
              <span className="text-sm font-semibold text-text-primary">
                {isRtl ? 'دليل الاستخدام' : 'Feature Guide'}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label={isRtl ? 'إغلاق' : 'Close'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 px-5 pt-4">
            {visibleSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`${isRtl ? 'الخطوة' : 'Step'} ${idx + 1}`}
                className={cn(
                  'rounded-full transition-all duration-200',
                  idx === currentIndex ? 'h-2 w-5' : 'h-2 w-2 hover:bg-text-muted/50',
                )}
                style={{
                  backgroundColor:
                    idx === currentIndex
                      ? 'hsl(var(--brand))'
                      : 'hsl(var(--surface-border))',
                }}
              />
            ))}
          </div>

          <p className="mt-1 px-5 text-center text-[11px] text-text-muted">
            {isRtl
              ? `${currentIndex + 1} من ${visibleSteps.length}`
              : `${currentIndex + 1} of ${visibleSteps.length}`}
          </p>

          <div className="min-h-[170px] px-6 py-5">
            <h2 id="guide-title" className="mb-3 text-lg font-bold text-text-primary">
              {isRtl ? step.titleAr : step.titleEn}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
              {isRtl ? step.bodyAr : step.bodyEn}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 px-6 pb-5">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                checked={neverShow}
                onChange={(e) => setNeverShow(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer rounded accent-brand"
              />
              <span className="text-xs text-text-muted">
                {isRtl ? 'لا تظهر مرة أخرى' : 'Do not show again'}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="h-8 rounded-lg px-3 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                {isRtl ? 'تخطي' : 'Skip'}
              </button>

              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-text-secondary transition-colors hover:bg-surface-hover"
                  aria-label={isRtl ? 'السابق' : 'Previous'}
                >
                  <PrevIcon className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: 'hsl(var(--brand))' }}
              >
                {isLast
                  ? (isRtl ? 'إنهاء' : 'Done')
                  : (isRtl ? 'التالي' : 'Next')}
                {!isLast && <NextIcon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
