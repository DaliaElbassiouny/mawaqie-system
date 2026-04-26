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
import { usersApi } from '@/lib/api';
import type { ActivityRecord, ActivityStatus } from '@/hooks/useOperations';

const CATEGORIES = ['CIVIL', 'MECHANICAL', 'ELECTRICAL', 'FINISHING', 'PROCUREMENT', 'ADMIN', 'HSE', 'OTHER'] as const;
const STATUSES: ActivityStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'BLOCKED'];

const schema = z.object({
  code: z.string().min(1).max(50),
  nameAr: z.string().min(1).max(300),
  nameEn: z.string().max(300).optional().or(z.literal('')),
  category: z.string().optional(),
  location: z.string().max(200).optional().or(z.literal('')),
  status: z.string().min(1),
  plannedStart: z.string().optional().or(z.literal('')),
  plannedEnd: z.string().optional().or(z.literal('')),
  actualStart: z.string().optional().or(z.literal('')),
  actualEnd: z.string().optional().or(z.literal('')),
  progressPercent: z.union([z.number().min(0).max(100), z.nan()]).optional(),
  responsibleUserId: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  blockerReason: z.string().max(1000).optional().or(z.literal('')),
  delayDays: z.union([z.number().int().min(0), z.nan()]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ActivityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityRecord | null;
  onSubmit: (data: unknown) => Promise<void>;
  isLoading: boolean;
}

function toDateInput(val: string | null | undefined): string {
  if (!val) return '';
  return val.slice(0, 10);
}

interface UserOption {
  id: string;
  nameAr: string;
  nameEn: string | null;
  email: string;
}

export function ActivityFormModal({
  open,
  onOpenChange,
  activity,
  onSubmit,
  isLoading,
}: ActivityFormModalProps) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const isEdit = !!activity;

  const { data: users = [] } = useQuery({
    queryKey: ['activity-users-dropdown'],
    enabled: open,
    queryFn: async () => {
      const { data } = await usersApi.list({ limit: 200 });
      return (data as { data: { items: UserOption[] } }).data.items;
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'NOT_STARTED', category: 'OTHER', progressPercent: 0 },
  });

  useEffect(() => {
    if (!open) return;
    if (activity) {
      reset({
        code: activity.code,
        nameAr: activity.nameAr,
        nameEn: activity.nameEn ?? '',
        category: activity.category,
        location: activity.location ?? '',
        status: activity.status,
        plannedStart: toDateInput(activity.plannedStart),
        plannedEnd: toDateInput(activity.plannedEnd),
        actualStart: toDateInput(activity.actualStart),
        actualEnd: toDateInput(activity.actualEnd),
        progressPercent: activity.progressPercent,
        responsibleUserId: activity.responsibleUserId ?? '',
        notes: activity.notes ?? '',
        blockerReason: activity.blockerReason ?? '',
        delayDays: activity.delayDays ?? undefined,
      });
    } else {
      reset({ code: '', nameAr: '', nameEn: '', category: 'OTHER', location: '', status: 'NOT_STARTED', progressPercent: 0 });
    }
  }, [open, activity, reset]);

  const submit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {
      code: values.code,
      nameAr: values.nameAr,
      status: values.status,
      category: values.category || 'OTHER',
      progressPercent: Number.isNaN(values.progressPercent) ? 0 : (values.progressPercent ?? 0),
    };
    if (values.nameEn) payload.nameEn = values.nameEn;
    if (values.location) payload.location = values.location;
    else if (isEdit) payload.location = '';
    if (values.plannedStart) payload.plannedStart = new Date(values.plannedStart).toISOString();
    else if (isEdit) payload.plannedStart = '';
    if (values.plannedEnd) payload.plannedEnd = new Date(values.plannedEnd).toISOString();
    else if (isEdit) payload.plannedEnd = '';
    if (values.actualStart) payload.actualStart = new Date(values.actualStart).toISOString();
    else if (isEdit) payload.actualStart = '';
    if (values.actualEnd) payload.actualEnd = new Date(values.actualEnd).toISOString();
    else if (isEdit) payload.actualEnd = '';
    if (values.responsibleUserId) payload.responsibleUserId = values.responsibleUserId;
    else if (isEdit) payload.responsibleUserId = '';
    if (values.notes) payload.notes = values.notes;
    else if (isEdit) payload.notes = '';
    if (values.blockerReason) payload.blockerReason = values.blockerReason;
    else if (isEdit) payload.blockerReason = '';
    if (!Number.isNaN(values.delayDays) && values.delayDays !== undefined) {
      payload.delayDays = values.delayDays;
    }
    await onSubmit(payload);
  });

  const fieldLabel = 'text-xs font-medium text-text-muted mb-1 block';
  const selectClass =
    'flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editActivity') : t('newActivity')}
      className="max-w-2xl"
    >
      <form onSubmit={submit}>
        <div className="max-h-[70vh] overflow-y-auto pe-1 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>{t('code')} *</label>
              <Input {...register('code')} placeholder="ACT-001" dir="ltr" />
              {errors.code && <p className="text-xs text-red-400 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className={fieldLabel}>{t('category')}</label>
              <select {...register('category')} className={selectClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>{t('nameAr')} *</label>
              <Input {...register('nameAr')} dir="rtl" />
              {errors.nameAr && <p className="text-xs text-red-400 mt-1">{errors.nameAr.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>{t('nameEn')}</label>
              <Input {...register('nameEn')} dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={fieldLabel}>{t('status')}</label>
              <select {...register('status')} className={selectClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t('progressPercent')}</label>
              <Input
                {...register('progressPercent', { valueAsNumber: true })}
                type="number"
                min="0"
                max="100"
                step="1"
                dir="ltr"
              />
            </div>
            <div>
              <label className={fieldLabel}>{t('location')}</label>
              <Input {...register('location')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>{t('plannedStart')}</label>
              <Input {...register('plannedStart')} type="date" dir="ltr" />
            </div>
            <div>
              <label className={fieldLabel}>{t('plannedEnd')}</label>
              <Input {...register('plannedEnd')} type="date" dir="ltr" />
            </div>
            <div>
              <label className={fieldLabel}>{t('actualStart')}</label>
              <Input {...register('actualStart')} type="date" dir="ltr" />
            </div>
            <div>
              <label className={fieldLabel}>{t('actualEnd')}</label>
              <Input {...register('actualEnd')} type="date" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>{t('responsibleUser')}</label>
              <select {...register('responsibleUserId')} className={selectClass}>
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameAr} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t('delayDays')}</label>
              <Input
                {...register('delayDays', { valueAsNumber: true })}
                type="number"
                min="0"
                step="1"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>{t('blockerReason')}</label>
            <Input {...register('blockerReason')} placeholder="..." />
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
