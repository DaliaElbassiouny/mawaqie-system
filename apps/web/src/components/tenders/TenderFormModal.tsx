'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { clientsApi } from '@/lib/api';
import type { TenderRecord, TenderStatus } from '@/hooks/useTenders';

const STATUSES: TenderStatus[] = [
  'PRICING_IN_PROGRESS',
  'PRICED_SUBMITTED',
  'CONTRACTED',
  'LOST',
];

const schema = z.object({
  nameAr: z.string().min(2, 'مطلوب'),
  nameEn: z.string().max(300).optional().or(z.literal('')),
  code: z.string().min(2, 'مطلوب').max(50),
  clientId: z.string().min(1, 'اختر العميل'),
  status: z.string().min(1),
  location: z.string().max(200).optional().or(z.literal('')),
  projectType: z.string().max(100).optional().or(z.literal('')),
  leadSource: z.string().max(100).optional().or(z.literal('')),
  currency: z.string().max(10).optional().or(z.literal('')),
  estimatedValue: z.union([z.number().min(0), z.nan()]).optional(),
  submittedValue: z.union([z.number().min(0), z.nan()]).optional(),
  bidReceiptDate: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  submittedAt: z.string().optional().or(z.literal('')),
  awardedAt: z.string().optional().or(z.literal('')),
  bidResult: z.string().max(500).optional().or(z.literal('')),
  assignedEngineer: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface TenderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: TenderRecord | null;
  onSubmit: (data: unknown, id?: string) => Promise<void>;
  isLoading: boolean;
  statusLabels: Record<TenderStatus, string>;
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

export function TenderFormModal({
  open,
  onOpenChange,
  tender,
  onSubmit,
  isLoading,
  statusLabels,
}: TenderFormModalProps) {
  const t = useTranslations('tenders');
  const tc = useTranslations('common');
  const isEdit = !!tender;

  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const { data } = await clientsApi.list({ limit: 200, isActive: true });
      return (data as { data: { items: { id: string; nameAr: string; code: string }[] } }).data.items;
    },
  });

  const clients = clientsData ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PRICING_IN_PROGRESS', currency: 'SAR' },
  });

  useEffect(() => {
    if (open) {
      if (tender) {
        reset({
          nameAr: tender.nameAr,
          nameEn: tender.nameEn ?? '',
          code: tender.code,
          clientId: tender.clientId,
          status: tender.status,
          location: tender.location ?? '',
          projectType: tender.projectType ?? '',
          leadSource: tender.leadSource ?? '',
          currency: tender.currency,
          estimatedValue: tender.estimatedValue ? parseFloat(tender.estimatedValue) : undefined,
          submittedValue: tender.submittedValue ? parseFloat(tender.submittedValue) : undefined,
          bidReceiptDate: toDateInputValue(tender.bidReceiptDate),
          dueDate: toDateInputValue(tender.dueDate),
          submittedAt: toDateInputValue(tender.submittedAt),
          awardedAt: toDateInputValue(tender.awardedAt),
          bidResult: tender.bidResult ?? '',
          assignedEngineer: tender.assignedEngineer ?? '',
          notes: tender.notes ?? '',
        });
      } else {
        reset({ status: 'PRICING_IN_PROGRESS', currency: 'SAR', nameAr: '', code: '', clientId: '' });
      }
    }
  }, [open, tender, reset]);

  const submit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {
      nameAr: values.nameAr,
      code: values.code,
      clientId: values.clientId,
      status: values.status,
      currency: values.currency || 'SAR',
    };
    if (values.nameEn) payload.nameEn = values.nameEn;
    if (values.location) payload.location = values.location;
    if (values.projectType) payload.projectType = values.projectType;
    if (values.leadSource) payload.leadSource = values.leadSource;
    if (values.estimatedValue !== undefined && !isNaN(values.estimatedValue as number)) {
      payload.estimatedValue = values.estimatedValue;
    }
    if (values.submittedValue !== undefined && !isNaN(values.submittedValue as number)) {
      payload.submittedValue = values.submittedValue;
    }
    if (values.bidReceiptDate) payload.bidReceiptDate = new Date(values.bidReceiptDate).toISOString();
    if (values.dueDate) payload.dueDate = new Date(values.dueDate).toISOString();
    if (values.submittedAt) payload.submittedAt = new Date(values.submittedAt).toISOString();
    if (values.awardedAt) payload.awardedAt = new Date(values.awardedAt).toISOString();
    if (values.bidResult) payload.bidResult = values.bidResult;
    if (values.assignedEngineer) payload.assignedEngineer = values.assignedEngineer;
    if (values.notes) payload.notes = values.notes;

    await onSubmit(payload, tender?.id);
  });

  const fieldLabel = 'text-xs font-medium text-text-muted mb-1 block';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTender') : t('newTender')}
      className="max-w-2xl"
    >
      <form onSubmit={submit}>
        <div className="max-h-[70vh] overflow-y-auto pe-1 space-y-5">

          {/* Basic Info */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionBasic')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t('nameAr')} *</label>
                <Input {...register('nameAr')} placeholder="اسم المشروع..." dir="rtl" />
                {errors.nameAr && <p className="text-xs text-red-400 mt-1">{errors.nameAr.message}</p>}
              </div>
              <div>
                <label className={fieldLabel}>{t('nameEn')}</label>
                <Input {...register('nameEn')} placeholder="Project name..." dir="ltr" />
              </div>
              <div>
                <label className={fieldLabel}>{t('code')} *</label>
                <Input {...register('code')} placeholder="TND-2025-XXX" dir="ltr" />
                {errors.code && <p className="text-xs text-red-400 mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <label className={fieldLabel}>{t('client')} *</label>
                <select
                  {...register('clientId')}
                  className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="">— {t('selectClient')} —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} ({c.code})
                    </option>
                  ))}
                </select>
                {errors.clientId && <p className="text-xs text-red-400 mt-1">{errors.clientId.message}</p>}
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionClassification')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={fieldLabel}>{t('location')}</label>
                <Input {...register('location')} placeholder="الرياض..." />
              </div>
              <div>
                <label className={fieldLabel}>{t('projectType')}</label>
                <Input {...register('projectType')} placeholder="إنشاءات..." />
              </div>
              <div>
                <label className={fieldLabel}>{t('leadSource')}</label>
                <Input {...register('leadSource')} placeholder="علاقات تجارية..." />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionDates')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t('bidReceiptDate')}</label>
                <Input {...register('bidReceiptDate')} type="date" dir="ltr" />
              </div>
              <div>
                <label className={fieldLabel}>{t('dueDate')}</label>
                <Input {...register('dueDate')} type="date" dir="ltr" />
              </div>
              {isEdit && (
                <>
                  <div>
                    <label className={fieldLabel}>{t('submittedAt')}</label>
                    <Input {...register('submittedAt')} type="date" dir="ltr" />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('awardedAt')}</label>
                    <Input {...register('awardedAt')} type="date" dir="ltr" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Financial */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionFinancial')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={fieldLabel}>{t('currency')}</label>
                <select
                  {...register('currency')}
                  className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="SAR">SAR — ر.س</option>
                  <option value="USD">USD — $</option>
                  <option value="EUR">EUR — €</option>
                  <option value="AED">AED — د.إ</option>
                </select>
              </div>
              <div>
                <label className={fieldLabel}>{t('estimatedValue')}</label>
                <Input
                  {...register('estimatedValue', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>
              {isEdit && (
                <div>
                  <label className={fieldLabel}>{t('submittedValue')}</label>
                  <Input
                    {...register('submittedValue', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status & Team */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionStatus')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t('status')}</label>
                <select
                  {...register('status')}
                  className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>{t('assignedEngineer')}</label>
                <Input {...register('assignedEngineer')} placeholder="م. ..." />
              </div>
              {isEdit && (
                <div className="sm:col-span-2">
                  <label className={fieldLabel}>{t('bidResult')}</label>
                  <Input {...register('bidResult')} placeholder="نتيجة العطاء..." />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={fieldLabel}>{t('notes')}</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="..."
              className="flex w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 justify-end border-t border-surface-border mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? tc('loading') : tc('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
