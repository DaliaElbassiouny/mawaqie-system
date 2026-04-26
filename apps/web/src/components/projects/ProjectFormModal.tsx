'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { tendersApi } from '@/lib/api';
import type { ProjectRecord, ProjectSourceType, ProjectStatus } from '@/hooks/useProjects';

const STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

const schema = z.object({
  sourceType: z.enum(['TENDER', 'DIRECT']),
  tenderId: z.string().optional().or(z.literal('')),
  code: z.string().max(50).optional().or(z.literal('')),
  nameAr: z.string().max(300).optional().or(z.literal('')),
  nameEn: z.string().max(300).optional().or(z.literal('')),
  companyCode: z.string().max(50).optional().or(z.literal('')),
  location: z.string().max(200).optional().or(z.literal('')),
  projectType: z.string().max(100).optional().or(z.literal('')),
  currency: z.string().max(10).optional().or(z.literal('')),
  status: z.string().min(1),
  contractValue: z.union([z.number().min(0), z.nan()]).optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface ContractedTender {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  location: string | null;
  projectType: string | null;
  currency: string;
  submittedValue: string | null;
  estimatedValue: string | null;
  awardedAt: string | null;
  client: { nameAr: string };
}

interface ProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRecord | null;
  onSubmit: (data: unknown, id?: string) => Promise<void>;
  isLoading: boolean;
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

export function ProjectFormModal({
  open,
  onOpenChange,
  project,
  onSubmit,
  isLoading,
}: ProjectFormModalProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sourceType: 'TENDER', status: 'PLANNING', currency: 'SAR' },
  });

  const sourceType = watch('sourceType') as ProjectSourceType;
  const selectedTenderId = watch('tenderId');

  const { data: tenders = [] } = useQuery({
    queryKey: ['contracted-tenders-dropdown'],
    enabled: open && !isEdit && sourceType === 'TENDER',
    queryFn: async () => {
      const { data } = await tendersApi.list({ limit: 200, status: 'CONTRACTED' });
      return (data as { data: { items: ContractedTender[] } }).data?.items ?? [];
    },
  });

  useEffect(() => {
    if (!open) return;

    if (project) {
      reset({
        sourceType: project.sourceType ?? (project.tenderId ? 'TENDER' : 'DIRECT'),
        tenderId: project.tenderId ?? '',
        code: project.code,
        nameAr: project.nameAr,
        nameEn: project.nameEn ?? '',
        companyCode: project.companyCode ?? '',
        location: project.location ?? '',
        projectType: project.projectType ?? '',
        currency: project.currency,
        status: project.status,
        contractValue: project.contractValue ? parseFloat(project.contractValue) : undefined,
        startDate: toDateInputValue(project.startDate),
        endDate: toDateInputValue(project.endDate),
        notes: project.notes ?? '',
      });
    } else {
      reset({
        sourceType: 'TENDER',
        tenderId: '',
        code: '',
        nameAr: '',
        nameEn: '',
        companyCode: '',
        location: '',
        projectType: '',
        currency: 'SAR',
        status: 'PLANNING',
        contractValue: undefined,
        startDate: '',
        endDate: '',
        notes: '',
      });
    }
  }, [open, project, reset]);

  useEffect(() => {
    if (!open || isEdit || sourceType !== 'DIRECT') return;
    setValue('tenderId', '');
  }, [isEdit, open, setValue, sourceType]);

  useEffect(() => {
    if (!open || isEdit || sourceType !== 'TENDER' || !selectedTenderId) return;

    const tender = tenders.find((item) => item.id === selectedTenderId);
    if (!tender) return;

    const contractValue = tender.submittedValue ?? tender.estimatedValue;
    setValue('code', tender.code.startsWith('TND-') ? tender.code.replace(/^TND-/, 'PRJ-') : `PRJ-${tender.code}`);
    setValue('nameAr', tender.nameAr);
    setValue('nameEn', tender.nameEn ?? '');
    setValue('location', tender.location ?? '');
    setValue('projectType', tender.projectType ?? '');
    setValue('currency', tender.currency || getValues('currency') || 'SAR');
    setValue('contractValue', contractValue ? parseFloat(contractValue) : undefined);
    setValue('startDate', tender.awardedAt ? tender.awardedAt.slice(0, 10) : '');
  }, [getValues, isEdit, open, selectedTenderId, setValue, sourceType, tenders]);

  const submit = handleSubmit(async (values) => {
    if (!isEdit && values.sourceType === 'TENDER' && !values.tenderId) {
      setError('tenderId', { message: t('selectTenderRequired') });
      return;
    }

    if (!isEdit && values.sourceType === 'DIRECT') {
      if (!values.code) {
        setError('code', { message: t('codeRequired') });
        return;
      }
      if (!values.nameAr) {
        setError('nameAr', { message: t('nameRequired') });
        return;
      }
    }

    const payload: Record<string, unknown> = {
      status: values.status,
      currency: values.currency || 'SAR',
    };

    if (!isEdit) payload.sourceType = values.sourceType;
    if (!isEdit && values.sourceType === 'TENDER') payload.tenderId = values.tenderId;
    if (values.code) payload.code = values.code;
    if (values.nameAr) payload.nameAr = values.nameAr;
    if (values.nameEn || isEdit) payload.nameEn = values.nameEn ?? '';
    if (values.companyCode || isEdit) payload.companyCode = values.companyCode ?? '';
    if (values.location || isEdit) payload.location = values.location ?? '';
    if (values.projectType || isEdit) payload.projectType = values.projectType ?? '';
    if (values.contractValue !== undefined && !Number.isNaN(values.contractValue)) {
      payload.contractValue = values.contractValue;
    }
    if (values.startDate) payload.startDate = new Date(values.startDate).toISOString();
    if (values.endDate) payload.endDate = new Date(values.endDate).toISOString();
    if (values.notes || isEdit) payload.notes = values.notes ?? '';

    await onSubmit(payload, project?.id);
  });

  const fieldLabel = 'text-xs font-medium text-text-muted mb-1 block';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editProject') : t('newProject')}
      className="max-w-2xl"
    >
      <form onSubmit={submit}>
        <div className="max-h-[70vh] overflow-y-auto pe-1 space-y-5">
          {!isEdit && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t('sourceTender')}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="rounded-lg border border-surface-border bg-surface-card p-3 cursor-pointer has-[:checked]:border-brand">
                  <input
                    {...register('sourceType')}
                    type="radio"
                    value="TENDER"
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-text-primary">
                    {t('createFromTender')}
                  </span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {t('tenderProjectHint')}
                  </span>
                </label>
                <label className="rounded-lg border border-surface-border bg-surface-card p-3 cursor-pointer has-[:checked]:border-brand">
                  <input
                    {...register('sourceType')}
                    type="radio"
                    value="DIRECT"
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-text-primary">
                    {t('createDirectProject')}
                  </span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {t('directProjectHint')}
                  </span>
                </label>
              </div>
              {sourceType === 'TENDER' && (
                <div className="mt-4">
              <label className={fieldLabel}>{t('tender')} *</label>
              <select
                {...register('tenderId')}
                className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">— {t('selectTender')} —</option>
                {tenders.map((tender) => (
                  <option key={tender.id} value={tender.id}>
                    {tender.code} — {tender.nameAr} ({tender.client.nameAr})
                  </option>
                ))}
              </select>
              {errors.tenderId && (
                <p className="text-xs text-red-400 mt-1">{errors.tenderId.message}</p>
              )}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionBasic')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>
                  {t('code')}{!isEdit && sourceType === 'DIRECT' ? ' *' : ''}
                </label>
                <Input {...register('code')} placeholder="PRJ-2026-001" dir="ltr" />
                {errors.code && (
                  <p className="text-xs text-red-400 mt-1">{errors.code.message}</p>
                )}
              </div>
              <div>
                <label className={fieldLabel}>{t('companyCode')}</label>
                <Input {...register('companyCode')} placeholder="HQ" dir="ltr" />
              </div>
              <div>
                <label className={fieldLabel}>
                  {t('nameAr')}{!isEdit && sourceType === 'DIRECT' ? ' *' : ''}
                </label>
                <Input
                  {...register('nameAr')}
                  placeholder={sourceType === 'DIRECT' ? t('nameManualHint') : t('nameFromTenderHint')}
                  dir="rtl"
                />
                {errors.nameAr && (
                  <p className="text-xs text-red-400 mt-1">{errors.nameAr.message}</p>
                )}
              </div>
              <div>
                <label className={fieldLabel}>{t('nameEn')}</label>
                <Input {...register('nameEn')} placeholder="Project name..." dir="ltr" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionClassification')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t('location')}</label>
                <Input
                  {...register('location')}
                  placeholder={
                    sourceType === 'DIRECT' ? t('locationManualHint') : t('locationFromTenderHint')
                  }
                />
              </div>
              <div>
                <label className={fieldLabel}>{t('projectType')}</label>
                <Input
                  {...register('projectType')}
                  placeholder={sourceType === 'DIRECT' ? t('typeManualHint') : t('typeFromTenderHint')}
                />
              </div>
            </div>
          </div>

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
                  <option value="SAR">SAR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <label className={fieldLabel}>{t('contractValue')}</label>
                <Input
                  {...register('contractValue', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>
              <div>
                <label className={fieldLabel}>{t('status')}</label>
                <select
                  {...register('status')}
                  className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('sectionTimeline')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t('startDate')}</label>
                <Input {...register('startDate')} type="date" dir="ltr" />
              </div>
              <div>
                <label className={fieldLabel}>{t('endDate')}</label>
                <Input {...register('endDate')} type="date" dir="ltr" />
              </div>
            </div>
          </div>

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
