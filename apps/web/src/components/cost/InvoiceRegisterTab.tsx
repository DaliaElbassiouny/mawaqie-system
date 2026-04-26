'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDate, formatCompactNumber } from '@/lib/utils';
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useCostItems,
  type Invoice,
  type InvoiceStatus,
} from '@/hooks/useCost';

const STATUS_VARIANTS: Record<InvoiceStatus, 'muted' | 'warning' | 'success' | 'gold'> = {
  DRAFT: 'muted',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  PAID: 'gold',
};

interface FormState {
  invoiceNumber: string;
  date: string;
  vendor: string;
  costItemId: string;
  description: string;
  amountBeforeTax: string;
  taxAmount: string;
  currency: string;
  status: InvoiceStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  invoiceNumber: '', date: '', vendor: '', costItemId: '', description: '',
  amountBeforeTax: '', taxAmount: '', currency: 'SAR', status: 'DRAFT', notes: '',
};

interface InvoiceRegisterTabProps {
  projectId: string;
  canEdit: boolean;
}

export function InvoiceRegisterTab({ projectId, canEdit }: InvoiceRegisterTabProps) {
  const t = useTranslations('costControl');
  const tc = useTranslations('common');

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const params: Record<string, unknown> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading } = useInvoices(projectId, Object.keys(params).length > 0 ? params : undefined);
  const { data: costItemsData } = useCostItems(projectId);
  const createMutation = useCreateInvoice(projectId);
  const updateMutation = useUpdateInvoice(projectId);
  const deleteMutation = useDeleteInvoice(projectId);

  const invoices = data?.items ?? [];
  const costItems = costItemsData?.items ?? [];

  const STATUSES: InvoiceStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'];
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

  function openEdit(inv: Invoice) {
    setEditing(inv);
    setForm({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date.slice(0, 10),
      vendor: inv.vendor,
      costItemId: inv.costItem?.id ?? '',
      description: inv.description ?? '',
      amountBeforeTax: inv.amountBeforeTax,
      taxAmount: inv.taxAmount,
      currency: inv.currency,
      status: inv.status,
      notes: inv.notes ?? '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(editing ? {} : { invoiceNumber: form.invoiceNumber }),
      date: form.date,
      vendor: form.vendor,
      costItemId: form.costItemId || undefined,
      description: form.description || undefined,
      amountBeforeTax: form.amountBeforeTax,
      taxAmount: form.taxAmount || undefined,
      currency: form.currency,
      status: editing ? form.status : undefined,
      notes: form.notes || undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ invoiceId: editing.id, data: payload });
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

  const totalGross = invoices.reduce((sum, inv) => sum + Number(inv.grossAmount), 0);
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.grossAmount), 0);

  const setFormField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="field-input max-w-xs"
          placeholder={tc('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field-select w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('invoices.allStatuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {canEdit && (
          <Button size="sm" className="ms-auto gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('invoices.add')}
          </Button>
        )}
      </div>

      {/* Summary strip */}
      {invoices.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-text-muted">{t('invoices.total')}</span>
            <span className="text-sm font-bold text-text-primary" dir="ltr">
              {formatCompactNumber(totalGross)} <span className="text-xs font-normal text-text-muted">{invoices[0]?.currency}</span>
            </span>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-text-muted">{t('statuses.PAID')}</span>
            <span className="text-sm font-bold text-emerald-400" dir="ltr">
              {formatCompactNumber(totalPaid)} <span className="text-xs font-normal text-emerald-400/70">{invoices[0]?.currency}</span>
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted">{tc('loading')}</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state card">
          <p className="text-sm text-text-muted">{t('invoices.empty')}</p>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={openCreate} className="mt-3 gap-2">
              <Plus className="h-4 w-4" />
              {t('invoices.add')}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('invoices.invoiceNumber')}</th>
                <th>{t('invoices.date')}</th>
                <th>{t('invoices.vendor')}</th>
                <th>{t('invoices.costItem')}</th>
                <th>{t('invoices.status')}</th>
                <th className="text-end">{t('invoices.amountBeforeTax')}</th>
                <th className="text-end">{t('invoices.grossAmount')}</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono text-xs text-brand">{inv.invoiceNumber}</td>
                  <td className="text-text-secondary" dir="ltr">{formatDate(inv.date)}</td>
                  <td className="font-medium">{inv.vendor}</td>
                  <td>
                    {inv.costItem
                      ? <span className="font-mono text-xs text-brand bg-brand/8 px-1.5 py-0.5 rounded">{inv.costItem.code}</span>
                      : <span className="text-text-muted">—</span>}
                  </td>
                  <td>
                    <Badge variant={STATUS_VARIANTS[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
                  </td>
                  <td className="text-end text-text-secondary" dir="ltr">{formatCompactNumber(inv.amountBeforeTax)}</td>
                  <td className="text-end font-semibold" dir="ltr">{formatCompactNumber(inv.grossAmount)}</td>
                  {canEdit && (
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(inv)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(inv)}>
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
        title={editing ? t('invoices.editInvoice') : t('invoices.addInvoice')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('invoices.invoiceNumber')} <span className="text-red-400">*</span></label>
              <input className="field-input" value={form.invoiceNumber} onChange={(e) => setFormField('invoiceNumber', e.target.value)} required />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('invoices.date')} <span className="text-red-400">*</span></label>
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
            <label className="mb-1 block text-xs text-text-muted">{t('invoices.vendor')} <span className="text-red-400">*</span></label>
            <input className="field-input" value={form.vendor} onChange={(e) => setFormField('vendor', e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">{t('invoices.costItem')}</label>
            <select className="field-select" value={form.costItemId} onChange={(e) => setFormField('costItemId', e.target.value)}>
              <option value="">{t('invoices.noCostItem')}</option>
              {costItems.map((ci) => <option key={ci.id} value={ci.id}>{ci.code} — {ci.nameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">{t('invoices.description')}</label>
            <textarea className="field-textarea" value={form.description} onChange={(e) => setFormField('description', e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('invoices.amountBeforeTax')} <span className="text-red-400">*</span></label>
              <input type="number" className="field-input" value={form.amountBeforeTax} onChange={(e) => setFormField('amountBeforeTax', e.target.value)} required min="0" step="0.01" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('invoices.taxAmount')}</label>
              <input type="number" className="field-input" value={form.taxAmount} onChange={(e) => setFormField('taxAmount', e.target.value)} min="0" step="0.01" />
            </div>
          </div>
          {editing && (
            <div>
              <label className="mb-1 block text-xs text-text-muted">{t('invoices.status')}</label>
              <select className="field-select" value={form.status} onChange={(e) => setFormField('status', e.target.value as InvoiceStatus)}>
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
        title={t('invoices.deleteConfirm')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{deleteTarget?.invoiceNumber} — {deleteTarget?.vendor}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>{tc('delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
