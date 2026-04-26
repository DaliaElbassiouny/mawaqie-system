'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ClientRecord } from '@/hooks/useClients';

const schema = z.object({
  nameAr: z.string().min(2, 'مطلوب — حرفان على الأقل'),
  nameEn: z.string().max(200).optional().or(z.literal('')),
  code: z.string().min(2, 'مطلوب — حرفان على الأقل').max(50),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.union([z.string().email('بريد إلكتروني غير صحيح'), z.literal('')]).optional(),
  address: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
  onSubmit: (data: FormValues, id?: string) => Promise<void>;
  isLoading: boolean;
}

export function ClientFormModal({
  open,
  onOpenChange,
  client,
  onSubmit,
  isLoading,
}: ClientFormModalProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true },
  });

  useEffect(() => {
    if (open) {
      if (client) {
        reset({
          nameAr: client.nameAr,
          nameEn: client.nameEn ?? '',
          code: client.code,
          phone: client.phone ?? '',
          email: client.email ?? '',
          address: client.address ?? '',
          isActive: client.isActive,
        });
      } else {
        reset({ nameAr: '', nameEn: '', code: '', phone: '', email: '', address: '', isActive: true });
      }
    }
  }, [open, client, reset]);

  const submit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {
      nameAr: values.nameAr,
      code: values.code,
    };
    if (values.nameEn) payload.nameEn = values.nameEn;
    if (values.phone) payload.phone = values.phone;
    if (values.email) payload.email = values.email;
    if (values.address) payload.address = values.address;
    if (isEdit && values.isActive !== undefined) payload.isActive = values.isActive;

    await onSubmit(payload as FormValues, client?.id);
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editClient') : t('newClient')}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('nameAr')} *</label>
            <Input {...register('nameAr')} placeholder="شركة ..." dir="rtl" />
            {errors.nameAr && (
              <p className="text-xs text-red-400">{errors.nameAr.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('nameEn')}</label>
            <Input {...register('nameEn')} placeholder="Company ..." dir="ltr" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('code')} *</label>
            <Input {...register('code')} placeholder="CLIENT-XXX" dir="ltr" />
            {errors.code && (
              <p className="text-xs text-red-400">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('phone')}</label>
            <Input {...register('phone')} placeholder="+966..." dir="ltr" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('email')}</label>
            <Input {...register('email')} type="email" placeholder="info@..." dir="ltr" />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">{tc('status')}</label>
              <select
                {...register('isActive', { setValueAs: (v) => v === 'true' || v === true })}
                className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="true">{t('active')}</option>
                <option value="false">{t('inactive')}</option>
              </select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('address')}</label>
          <Input {...register('address')} placeholder="..." />
        </div>

        <div className="flex gap-3 pt-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
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
