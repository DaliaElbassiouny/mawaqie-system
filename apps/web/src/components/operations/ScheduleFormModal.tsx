'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ScheduleRecord } from '@/hooks/useOperations';
import { formatNumber } from '@/lib/utils';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

const schema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  title: z.string().max(300).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface ScheduleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleRecord | null;
  onSubmit: (data: unknown) => Promise<void>;
  isLoading: boolean;
}

export function ScheduleFormModal({
  open,
  onOpenChange,
  schedule,
  onSubmit,
  isLoading,
}: ScheduleFormModalProps) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const isEdit = !!schedule;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: currentYear,
      month: new Date().getMonth() + 1,
      title: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (schedule) {
      reset({
        year: schedule.year,
        month: schedule.month,
        title: schedule.title ?? '',
        notes: schedule.notes ?? '',
      });
    } else {
      reset({ year: currentYear, month: new Date().getMonth() + 1, title: '', notes: '' });
    }
  }, [open, schedule, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      year: values.year,
      month: values.month,
      title: values.title || undefined,
      notes: values.notes || undefined,
    });
  });

  const fieldLabel = 'text-xs font-medium text-text-muted mb-1 block';
  const selectClass =
    'flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editSchedule') : t('newSchedule')}
      className="max-w-lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>{t('year')} *</label>
            <select {...register('year', { valueAsNumber: true })} className={selectClass}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{formatNumber(y)}</option>
              ))}
            </select>
            {errors.year && <p className="text-xs text-red-400 mt-1">{errors.year.message}</p>}
          </div>
          <div>
            <label className={fieldLabel}>{t('month')} *</label>
            <select {...register('month', { valueAsNumber: true })} className={selectClass}>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{t(`months.${m}`)}</option>
              ))}
            </select>
            {errors.month && <p className="text-xs text-red-400 mt-1">{errors.month.message}</p>}
          </div>
        </div>

        <div>
          <label className={fieldLabel}>{t('scheduleTitle')}</label>
          <Input {...register('title')} placeholder="..." />
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

        <div className="flex gap-3 pt-2 justify-end border-t border-surface-border">
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
