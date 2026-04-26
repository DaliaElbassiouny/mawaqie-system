'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDate, formatCompactNumber } from '@/lib/utils';
import {
  useExtracts,
  useCreateExtract,
  useUpdateExtract,
  useDeleteExtract,
  type Extract,
  type ExtractStatus,
} from '@/hooks/useCost';

const STATUS_VARIANTS: Record<ExtractStatus, 'muted' | 'warning' | 'success' | 'gold'> = {
  DRAFT: 'muted',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  PAID: 'gold',
};

interface FormState {
  extractNumber: string;
  date: string;
  description: string;
  amountBeforeTax: string;
  taxAmount: string;
  currency: string;
  status: ExtractStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  extractNumber: '', date: '', description: '',
  amountBeforeTax: '', taxAmount: '', currency: 'SAR', status: 'DRAFT', notes: '',
};

interface ExtractsTabProps {
  projectId: string;
  canEdit: boolean;
}

export function ExtractsTab({ projectId, canEdit }: ExtractsTabProps) {
  const t = useTranslations('costControl');
  const tc = useTranslations('common');

  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Extract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Extract | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const params: Record<string, unknown> = {};
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useExtracts(projectId, Object.keys(params).length > 0 ? params : undefined);
  const createMutation = useCreateExtract(projectId);
  const updateMutation = useUpdateExtract(projectId);
  const deleteMutation = useDeleteExtract(projectId);

  const extracts = data?.items ?? [];

  const STATUSES: ExtractStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'];
  const STATUS_LABELS = {
    DRAFT: t('statuses.DRAFT'),
    SUBMITTED: t('statuses.SUBMITTED'),
    APPROVED: t('statuses.APPROVED'),
    PAID: t('statuses.PAID'),
  };

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(ext: Extract) {
    setEditing(ext);
    setForm({
      extractNumber: ext.extractNumber,
      date: ext.date.slice(0, 10),
      description: ext.description ?? '',
      amountBeforeTax: ext.amountBeforeTax,
      taxAmount: ext.taxAmount,
      currency: ext.currency,
      status: ext.status,
      notes: ext.notes ?? '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(editing ? {} : { extractNumber: form.extractNumber }),
      date: form.date,
      description: form.description || undefined,
      amountBeforeTax: form.amountBeforeTax,
      taxAmount: form.taxAmount || undefined,
      currency: form.currency,
      status: editing ? form.status : undefined,
      notes: form.notes || undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ extractId: editing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const totalAmount = extracts.reduce((sum, e) => sum + Number(e.totalAmount), 0);
  const totalPaid = extracts.filter((e) => e.status === 'PAID').reduce((s, e) => s + Number(e.totalAmount), 0);

  const setFormField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select className="field-select w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('extracts.allStatuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {canEdit && (
          <Button size="sm" className="ms-auto gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('extracts.add')}
          </Button>
        )}
      </div>

      {/* Summary strip */}
      {extracts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-text-muted">{t('extracts.totalClaimed')}</span>
            <span className="text-sm font-bold text-text-primary" dir="ltr">
              {formatCompactNumber(totalAmount)} <span className="text-xs font-normal text-text-muted">{extracts[0]?.currency}</span>
            </span>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-text-muted">{t('statuses.PAID')}</span>
            <span className="text-sm font-bold text-emerald-400" dir="ltr">
              {formatCompactNumber(totalPaid)} <span className="text-xs font-normal text-emerald-400/70">{extracts[0]?.currency}</span>
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted">{tc('loading')}</p>
        </div>
      ) : extracts.length === 0 ? (
        <div className="empty-state card">
          <p className="text-sm text-text-muted">{t('extracts.empty')}</p>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={openCreate} className="mt-3 gap-2">
              <Plus className="h-4 w-4" />
              {t('extracts.add')}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('extracts.extractNumber')}</th>
                <th>{t('extracts.date')}</th>
                <th>{t('extracts.description')}</th>
                <th>{t('extracts.status')}</th>
                <th className="text-end">{t('extracts.amountBeforeTax')}</th>
                <th className="text-end">{t('extracts.taxAmount')}</th>
                <th className="text-end">{t('extracts.totalAmount')}</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {extracts.map((ext) => (
                <tr key={ext.id}>
                  <td className="font-mono text-xs text-brand">{ext.extractNumber}</td>
                  <td className="text-text-secondary" dir="ltr">{formatDate(ext.date)}</td>
                  <td className="max-w-xs truncate text-text-secondary">
                    {ext.description ?? <span className="text-text-muted">—</span>}
                  </td>
                  <td>
                    <Badge variant={STATUS_VARIANTS[ext.status]}>{STATUS_LABELS[ext.status]}</Badge>
                  </td>
                  <td className="text-end text-text-secondary" dir="ltr">{formatCompactNumber(ext.amountBeforeTax)}</td>
                  <td className="text-end text-text-secondary" dir="ltr">{formatCompactNumber(ext.taxAmount)}</td>
                  <td className="text-end font-semibold" dir="ltr">{formatCompactNumber(ext.totalAmount)}</td>
                  {canEdit && (
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(ext)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(ext)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? t('extracts.editExtract') : t('extracts.addExtract')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('extracts.extractNumber')} <span className="text-red-400">*</span></label>
              <input className="field-input" value={form.extractNumber} onChange={(e) => setFormField('extractNumber', e.target.value)} required />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('extracts.date')} <span className="text-red-400">*</span></label>
              <input type="date" className="field-input" value={form.date} onChange={(e) => setFormField('date', e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">{tc('currency')}</label>
              <select className="field-select" value={form.currency} onChange={(e) => setFormField('currency', e.target.value)}>
                {['SAR', 'USD', 'EUR', 'AED'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">{t('extracts.description')}</label>
            <textarea className="field-textarea" value={form.description} onChange={(e) => setFormField('description', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('extracts.amountBeforeTax')} <span className="text-red-400">*</span></label>
              <input type="number" className="field-input" value={form.amountBeforeTax} onChange={(e) => setFormField('amountBeforeTax', e.target.value)} required min="0" step="0.01" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('extracts.taxAmount')}</label>
              <input type="number" className="field-input" value={form.taxAmount} onChange={(e) => setFormField('taxAmount', e.target.value)} min="0" step="0.01" />
            </div>
          </div>
          {editing && (
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('extracts.status')}</label>
              <select className="field-select" value={form.status} onChange={(e) => setFormField('status', e.target.value as ExtractStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{tc('cancel')}</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{tc('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={t('extracts.deleteConfirm')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{deleteTarget?.extractNumber}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>{tc('delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
