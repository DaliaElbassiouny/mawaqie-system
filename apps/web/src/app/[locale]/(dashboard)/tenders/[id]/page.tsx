'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, ArrowLeft, Pencil, Building2, MapPin, Calendar, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TenderFormModal } from '@/components/tenders/TenderFormModal';
import { useAuthStore } from '@/store/auth.store';
import { useTender, useUpdateTender, type TenderRecord, type TenderStatus } from '@/hooks/useTenders';
import {
  MISSING_VALUE,
  formatCurrency,
  formatDateWithEnglishDigits,
  formatPercent,
  formatText,
} from '@/lib/utils';

type StatusMeta = { label: string; variant: 'warning' | 'default' | 'success' | 'danger' };
const STATUS_META: Record<TenderStatus, StatusMeta> = {
  PRICING_IN_PROGRESS: { label: 'قيد التسعير', variant: 'warning' },
  PRICED_SUBMITTED:    { label: 'تم التقديم',   variant: 'default' },
  CONTRACTED:          { label: 'محل عقد',       variant: 'success' },
  LOST:                { label: 'لم تُرسَ',       variant: 'danger'  },
};

const statusLabels = Object.fromEntries(
  Object.entries(STATUS_META).map(([k, v]) => [k, v.label]),
) as Record<TenderStatus, string>;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue = typeof value === 'string' ? formatText(value) : value ?? MISSING_VALUE;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm text-text-primary font-medium">{displayValue}</span>
    </div>
  );
}

export default function TenderDetailPage() {
  const t = useTranslations('tenders');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);

  const { data: tender, isLoading, isError } = useTender(id);
  const updateMutation = useUpdateTender();

  const handleUpdate = async (payload: unknown, tenderId?: string) => {
    if (!tenderId) return;
    await updateMutation.mutateAsync({ id: tenderId, data: payload });
    setEditOpen(false);
  };

  const BackIcon = isRtl ? ArrowLeft : ArrowRight;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <p className="text-sm text-text-muted">{tc('loading')}</p>
      </div>
    );
  }

  if (isError || !tender) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-red-400">{tc('error')}</p>
        <Link href={`/${locale}/tenders`}>
          <Button variant="outline" size="sm">{tc('back')}</Button>
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[tender.status];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/tenders`}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <BackIcon className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{formatText(tender.nameAr)}</h1>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <p className="text-text-muted text-sm mt-0.5 font-mono">{tender.code}</p>
            {tender.nameEn && <p className="text-text-secondary text-sm">{formatText(tender.nameEn)}</p>}
          </div>
        </div>
        {hasPermission('tenders:update') && (
          <Button onClick={() => setEditOpen(true)} variant="outline" size="sm" className="gap-2 flex-shrink-0">
            <Pencil className="w-3.5 h-3.5" />
            {tc('edit')}
          </Button>
        )}
      </div>

      {/* Main info grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Client & Classification */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('sectionBasic')}</span>
          </div>
          <InfoRow label={t('client')} value={tender.client.nameAr} />
          <InfoRow label={t('code')} value={<span className="font-mono text-brand">{tender.code}</span>} />
          <InfoRow label={t('assignedEngineer')} value={tender.assignedEngineer} />
          <InfoRow label={t('leadSource')} value={tender.leadSource} />
        </div>

        {/* Location & Classification */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('sectionClassification')}</span>
          </div>
          <InfoRow label={t('location')} value={tender.location} />
          <InfoRow label={t('projectType')} value={tender.projectType} />
          <InfoRow
            label={t('status')}
            value={<Badge variant={meta.variant}>{meta.label}</Badge>}
          />
          {tender.bidResult && (
            <InfoRow label={t('bidResult')} value={tender.bidResult} />
          )}
        </div>

        {/* Key Dates */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('sectionDates')}</span>
          </div>
          <InfoRow
            label={t('bidReceiptDate')}
            value={formatDateWithEnglishDigits(tender.bidReceiptDate, locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          <InfoRow
            label={t('dueDate')}
            value={formatDateWithEnglishDigits(tender.dueDate, locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          <InfoRow
            label={t('submittedAt')}
            value={formatDateWithEnglishDigits(tender.submittedAt, locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          <InfoRow
            label={t('awardedAt')}
            value={formatDateWithEnglishDigits(tender.awardedAt, locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
        </div>

        {/* Financial */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('sectionFinancial')}</span>
          </div>
          <InfoRow label={t('currency')} value={tender.currency} />
          <InfoRow
            label={t('estimatedValue')}
            value={
              <span className="text-brand font-mono">
                {formatCurrency(tender.estimatedValue, tender.currency)}
              </span>
            }
          />
          {tender.submittedValue && (
            <InfoRow
              label={t('submittedValue')}
              value={
                <span className="text-emerald-400 font-mono">
                  {formatCurrency(tender.submittedValue, tender.currency)}
                </span>
              }
            />
          )}
          {tender.estimatedValue && tender.submittedValue && (
            <InfoRow
              label={t('variance')}
              value={(() => {
                const est = parseFloat(tender.estimatedValue);
                const sub = parseFloat(tender.submittedValue);
                const diff = ((sub - est) / est) * 100;
                const color = diff <= 0 ? 'text-emerald-400' : 'text-amber-400';
                return <span className={`${color} font-mono`}>{formatPercent(diff, 1)}</span>;
              })()}
            />
          )}
        </div>
      </div>

      {/* Notes */}
      {tender.notes && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-muted mb-3">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">ملاحظات</span>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">{formatText(tender.notes)}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-4 text-xs text-text-muted">
        <span>
          أُنشئ: {formatDateWithEnglishDigits(tender.createdAt, locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        <span>
          آخر تعديل: {formatDateWithEnglishDigits(tender.updatedAt, locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Edit modal */}
      <TenderFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        tender={tender as TenderRecord}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        statusLabels={statusLabels}
      />
    </div>
  );
}
