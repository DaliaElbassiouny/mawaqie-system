'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatNumber, formatCompactNumber, formatText } from '@/lib/utils';
import {
  useCostItems,
  useCreateCostItem,
  useUpdateCostItem,
  useDeleteCostItem,
  type CostItem,
} from '@/hooks/useCost';

const CATEGORY_OPTIONS = [
  'CIVIL', 'MEP', 'MECHANICAL', 'ELECTRICAL', 'FINISHING',
  'PRELIMINARIES', 'PROCUREMENT', 'ADMIN', 'HSE', 'OTHER',
];

const CATEGORY_LABELS: Record<string, string> = {
  CIVIL: 'مدني', MEP: 'كهروميكانيك', MECHANICAL: 'ميكانيكي',
  ELECTRICAL: 'كهربائي', FINISHING: 'تشطيبات', PRELIMINARIES: 'تجهيزات',
  PROCUREMENT: 'مشتريات', ADMIN: 'إداري', HSE: 'السلامة', OTHER: 'أخرى',
};

interface FormState {
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  unit: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  code: '', nameAr: '', nameEn: '', category: 'CIVIL',
  unit: '', quantity: '', unitCost: '', notes: '',
};

interface CostSheetTabProps {
  projectId: string;
  canEdit: boolean;
}

export function CostSheetTab({ projectId, canEdit }: CostSheetTabProps) {
  const t = useTranslations('costControl');
  const tc = useTranslations('common');

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useCostItems(projectId, search ? { search } : undefined);
  const createMutation = useCreateCostItem(projectId);
  const updateMutation = useUpdateCostItem(projectId);
  const deleteMutation = useDeleteCostItem(projectId);

  const items = data?.items ?? [];

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(item: CostItem) {
    setEditing(item);
    setForm({
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? '',
      category: item.category,
      unit: item.unit ?? '',
      quantity: item.quantity ?? '',
      unitCost: item.unitCost ?? '',
      notes: item.notes ?? '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      nameAr: form.nameAr,
      nameEn: form.nameEn || undefined,
      category: form.category,
      unit: form.unit || undefined,
      quantity: form.quantity || undefined,
      unitCost: form.unitCost || undefined,
      notes: form.notes || undefined,
      ...(editing ? {} : { code: form.code }),
    };
    if (editing) {
      await updateMutation.mutateAsync({ itemId: editing.id, data: payload });
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

  const totalBudget = items.reduce((sum, ci) => sum + Number(ci.totalCost ?? 0), 0);

  function field(key: keyof FormState, label: string, opts?: { required?: boolean; type?: string }) {
    return (
      <div>
        <label className="mb-1 block text-xs text-text-muted">{label}{opts?.required && <span className="text-red-400"> *</span>}</label>
        <input
          type={opts?.type ?? 'text'}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="field-input"
          required={opts?.required}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          className="field-input max-w-xs"
          placeholder={tc('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('costSheet.add')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted">{tc('loading')}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state card">
          <p className="text-sm text-text-muted">{t('costSheet.empty')}</p>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={openCreate} className="mt-3 gap-2">
              <Plus className="h-4 w-4" />
              {t('costSheet.add')}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('costSheet.code')}</th>
                <th>{t('costSheet.name')}</th>
                <th>{t('costSheet.category')}</th>
                <th>{t('costSheet.unit')}</th>
                <th className="text-end">{t('costSheet.quantity')}</th>
                <th className="text-end">{t('costSheet.unitCost')}</th>
                <th className="text-end">{t('costSheet.totalCost')}</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono text-xs text-brand">{item.code}</td>
                  <td className="font-medium">{item.nameAr}</td>
                  <td className="text-text-secondary">{CATEGORY_LABELS[item.category] ?? item.category}</td>
                  <td className="text-text-secondary">{formatText(item.unit)}</td>
                  <td className="text-end" dir="ltr">{item.quantity ? formatNumber(item.quantity) : <span className="text-text-muted">—</span>}</td>
                  <td className="text-end" dir="ltr">{item.unitCost ? formatCompactNumber(item.unitCost) : <span className="text-text-muted">—</span>}</td>
                  <td className="text-end font-semibold text-text-primary" dir="ltr">
                    {item.totalCost ? formatCompactNumber(item.totalCost) : <span className="text-text-muted font-normal">—</span>}
                  </td>
                  {canEdit && (
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-hover">
                <td colSpan={canEdit ? 6 : 5} className="text-end text-xs font-medium text-text-muted px-4 py-3">
                  {tc('total')}
                </td>
                <td className="text-end font-bold text-brand px-4 py-3" dir="ltr">
                  {formatCompactNumber(totalBudget)}
                </td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? t('costSheet.editItem') : t('costSheet.addItem')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && field('code', t('costSheet.code'), { required: true })}
          {field('nameAr', t('costSheet.name'), { required: true })}
          <div>
            <label className="mb-1 block text-xs text-text-muted">{t('costSheet.category')}</label>
            <select
              className="field-select"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('unit', t('costSheet.unit'))}
            {field('quantity', t('costSheet.quantity'), { type: 'number' })}
          </div>
          {field('unitCost', t('costSheet.unitCost'), { type: 'number' })}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {tc('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={t('costSheet.deleteConfirm')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{deleteTarget?.nameAr}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {tc('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
