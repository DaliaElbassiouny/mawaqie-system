'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  X,
  ShoppingCart,
  CalendarDays,
  User,
  Package,
  Tag,
  Banknote,
  FileText,
  Paperclip,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDateWithEnglishDigits, formatNumber } from '@/lib/utils';
import {
  useCreatePurchaseRequest,
  useUpdatePurchaseRequest,
  type PurchaseRequest,
  type PRStatus,
  type PRPriority,
  type PRRequirementType,
} from '@/hooks/useProcurement';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/store/auth.store';
import { DocumentSection } from '@/components/documents/DocumentSection';

// ─── Status & Priority config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<PRStatus, { ar: string; en: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info' }> = {
  DRAFT:              { ar: 'مسودة',           en: 'Draft',             variant: 'muted' },
  SUBMITTED:          { ar: 'مقدم',            en: 'Submitted',         variant: 'info' },
  UNDER_REVIEW:       { ar: 'قيد المراجعة',    en: 'Under Review',      variant: 'warning' },
  APPROVED:           { ar: 'معتمد',           en: 'Approved',          variant: 'success' },
  REJECTED:           { ar: 'مرفوض',           en: 'Rejected',          variant: 'danger' },
  CANCELLED:          { ar: 'ملغي',            en: 'Cancelled',         variant: 'muted' },
  PARTIALLY_FULFILLED:{ ar: 'منفذ جزئياً',     en: 'Partially Fulfilled', variant: 'warning' },
  FULFILLED:          { ar: 'منفذ',            en: 'Fulfilled',         variant: 'success' },
  RECEIVED:           { ar: 'مستلم',           en: 'Received',          variant: 'success' },
};

const PRIORITY_CONFIG = {
  LOW:    { ar: 'منخفضة',  en: 'Low',    color: 'text-text-muted' },
  MEDIUM: { ar: 'متوسطة', en: 'Medium', color: 'text-amber-400' },
  HIGH:   { ar: 'عالية',  en: 'High',   color: 'text-red-400' },
};

const TYPE_CONFIG = {
  MATERIALS: { ar: 'مواد', en: 'Materials' },
  EQUIPMENT: { ar: 'معدات', en: 'Equipment' },
  SERVICES:  { ar: 'خدمات', en: 'Services' },
  OTHER:     { ar: 'أخرى',  en: 'Other' },
};

const EDITABLE_STATUSES: PRStatus[] = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED',
  'CANCELLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'RECEIVED',
];

interface Props {
  mode: 'view' | 'create';
  request?: PurchaseRequest;
  onClose: () => void;
}

export function PurchaseRequestDrawer({ mode, request, onClose }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('procurement:create');
  const canUpdate = hasPermission('procurement:update');
  const canApprove = hasPermission('procurement:approve');

  const { data: projectsData } = useProjects({ page: 1, limit: 100 });
  const projects = projectsData?.items ?? [];

  const createMutation = useCreatePurchaseRequest();
  const updateMutation = useUpdatePurchaseRequest();

  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [form, setForm] = useState({
    projectId: request?.project.id ?? '',
    nameAr: request?.nameAr ?? '',
    nameEn: request?.nameEn ?? '',
    description: request?.description ?? '',
    requirementType: request?.requirementType ?? 'MATERIALS',
    priority: request?.priority ?? 'MEDIUM',
    quantity: request?.quantity ?? '',
    unit: request?.unit ?? '',
    totalAmount: request?.totalAmount ?? '',
    vendor: request?.vendor ?? '',
    expectedDeliveryDate: request?.expectedDeliveryDate
      ? new Date(request.expectedDeliveryDate).toISOString().split('T')[0]
      : '',
    notes: request?.notes ?? '',
  });
  const [statusUpdate, setStatusUpdate] = useState<PRStatus | ''>('');
  const [approvalNote, setApprovalNote] = useState('');
  const [error, setError] = useState('');

  const isView = mode === 'view';

  const handleCreate = async () => {
    if (!form.projectId || !form.nameAr) {
      setError(isAr ? 'المشروع والاسم بالعربية مطلوبان' : 'Project and Arabic name are required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        projectId: form.projectId,
        nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        description: form.description || undefined,
        requirementType: form.requirementType,
        priority: form.priority,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unit: form.unit || undefined,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        vendor: form.vendor || undefined,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        notes: form.notes || undefined,
      });
      onClose();
    } catch {
      setError(isAr ? 'حدث خطأ أثناء الإنشاء' : 'An error occurred');
    }
  };

  const handleStatusUpdate = async () => {
    if (!request || !statusUpdate) return;
    try {
      await updateMutation.mutateAsync({
        id: request.id,
        data: { status: statusUpdate, approvalNote: approvalNote || undefined },
      });
      setStatusUpdate('');
      setApprovalNote('');
    } catch {
      setError(isAr ? 'حدث خطأ أثناء التحديث' : 'An error occurred');
    }
  };

  const label = (cfg: { ar: string; en: string }) => isAr ? cfg.ar : cfg.en;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          'w-full max-w-xl bg-surface-card border-s border-surface-border flex flex-col shadow-2xl',
          'animate-in slide-in-from-right duration-200',
        )}
        style={{ direction: locale === 'ar' ? 'rtl' : 'ltr' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-brand/10 p-2">
              <ShoppingCart className="w-4 h-4 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-muted">
                {isView ? request?.prNumber : (isAr ? 'طلب شراء جديد' : 'New Purchase Request')}
              </p>
              <h2 className="text-base font-semibold text-text-primary truncate">
                {isView ? request?.nameAr : (isAr ? 'إنشاء طلب شراء' : 'Create Purchase Request')}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar (view mode only) */}
        {isView && (
          <div className="flex border-b border-surface-border px-5 gap-4">
            {[
              { key: 'details', label: isAr ? 'التفاصيل' : 'Details' },
              { key: 'documents', label: isAr ? 'المستندات' : 'Documents' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'details' | 'documents')}
                className={cn(
                  'py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-muted hover:text-text-primary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* CREATE FORM */}
          {mode === 'create' && (
            <div className="space-y-4">
              {/* Project */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">{isAr ? 'المشروع *' : 'Project *'}</span>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="field-select w-full"
                >
                  <option value="">{isAr ? 'اختر المشروع...' : 'Select project...'}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.nameAr}</option>
                  ))}
                </select>
              </label>

              {/* Name AR */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">{isAr ? 'الاسم بالعربية *' : 'Name (Arabic) *'}</span>
                <input
                  type="text"
                  value={form.nameAr}
                  onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                  className="field-input w-full"
                  placeholder={isAr ? 'مثال: توريد حديد تسليح...' : 'e.g., Rebar supply...'}
                />
              </label>

              {/* Type + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary">{isAr ? 'نوع المتطلب' : 'Type'}</span>
                  <select value={form.requirementType} onChange={(e) => setForm((f) => ({ ...f, requirementType: e.target.value as PRRequirementType }))} className="field-select w-full">
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary">{isAr ? 'الأولوية' : 'Priority'}</span>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as PRPriority }))} className="field-select w-full">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary">{isAr ? 'الكمية' : 'Quantity'}</span>
                  <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="field-input w-full" placeholder="0" min="0" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary">{isAr ? 'الوحدة' : 'Unit'}</span>
                  <input type="text" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="field-input w-full" placeholder={isAr ? 'م³، طن، وحدة...' : 'm³, ton, unit...'} />
                </label>
              </div>

              {/* Amount + Vendor */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary">{isAr ? 'المبلغ التقديري (ر.س)' : 'Estimated Amount (SAR)'}</span>
                  <input type="number" value={form.totalAmount} onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))} className="field-input w-full" placeholder="0" min="0" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary">{isAr ? 'المورد المقترح' : 'Proposed Vendor'}</span>
                  <input type="text" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className="field-input w-full" placeholder={isAr ? 'اسم المورد...' : 'Vendor name...'} />
                </label>
              </div>

              {/* Expected Delivery */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">{isAr ? 'تاريخ التسليم المتوقع' : 'Expected Delivery Date'}</span>
                <input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))} className="field-input w-full" dir="ltr" />
              </label>

              {/* Description */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">{isAr ? 'الوصف التفصيلي' : 'Description'}</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="field-textarea w-full"
                  placeholder={isAr ? 'تفاصيل المواصفات والكميات...' : 'Specification details...'}
                />
              </label>

              {/* Notes */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">{isAr ? 'ملاحظات' : 'Notes'}</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="field-textarea w-full"
                  placeholder={isAr ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                />
              </label>
            </div>
          )}

          {/* VIEW DETAILS */}
          {isView && activeTab === 'details' && request && (
            <div className="space-y-5">
              {/* Status banner */}
              <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-hover/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{isAr ? 'الحالة:' : 'Status:'}</span>
                  <Badge variant={STATUS_CONFIG[request.status].variant}>
                    {label(STATUS_CONFIG[request.status])}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', PRIORITY_CONFIG[request.priority]?.color)}>
                    ● {label(PRIORITY_CONFIG[request.priority] ?? { ar: request.priority, en: request.priority })}
                  </span>
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4">
                <InfoCell icon={<Tag className="w-3.5 h-3.5" />} label={isAr ? 'النوع' : 'Type'} value={label(TYPE_CONFIG[request.requirementType] ?? { ar: request.requirementType, en: request.requirementType })} />
                <InfoCell icon={<Package className="w-3.5 h-3.5" />} label={isAr ? 'الكمية' : 'Quantity'} value={request.quantity ? `${formatNumber(Number(request.quantity))} ${request.unit ?? ''}` : '—'} />
                <InfoCell icon={<Banknote className="w-3.5 h-3.5" />} label={isAr ? 'المبلغ' : 'Amount'} value={request.totalAmount ? `${formatNumber(Number(request.totalAmount))} ${request.currency}` : '—'} />
                <InfoCell icon={<User className="w-3.5 h-3.5" />} label={isAr ? 'المورد' : 'Vendor'} value={request.vendor ?? '—'} />
                <InfoCell icon={<CalendarDays className="w-3.5 h-3.5" />} label={isAr ? 'تاريخ الطلب' : 'Requested'} value={formatDateWithEnglishDigits(request.requestedAt, locale, { month: 'short', day: 'numeric', year: 'numeric' })} />
                <InfoCell icon={<CalendarDays className="w-3.5 h-3.5" />} label={isAr ? 'التسليم المتوقع' : 'Expected Delivery'} value={request.expectedDeliveryDate ? formatDateWithEnglishDigits(request.expectedDeliveryDate, locale, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
              </div>

              {/* Project */}
              <div className="rounded-xl border border-surface-border bg-surface-hover/20 px-4 py-3 space-y-1">
                <p className="text-xs text-text-muted">{isAr ? 'المشروع' : 'Project'}</p>
                <p className="text-sm font-semibold text-text-primary">{request.project.nameAr}</p>
                <p className="text-xs text-text-muted">{request.project.code}</p>
              </div>

              {/* Description */}
              {request.description && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {isAr ? 'الوصف' : 'Description'}
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed bg-surface-hover/20 rounded-xl border border-surface-border px-4 py-3">
                    {request.description}
                  </p>
                </div>
              )}

              {/* Notes */}
              {request.notes && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-1.5">{isAr ? 'ملاحظات' : 'Notes'}</p>
                  <p className="text-sm text-text-secondary bg-surface-hover/20 rounded-xl border border-surface-border px-4 py-3">
                    {request.notes}
                  </p>
                </div>
              )}

              {/* Approval note */}
              {request.approvalNote && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-400 mb-1">{isAr ? 'ملاحظة الاعتماد' : 'Approval Note'}</p>
                  <p className="text-sm text-text-secondary">{request.approvalNote}</p>
                </div>
              )}

              {/* Requester */}
              {request.requester && (
                <InfoCell
                  icon={<User className="w-3.5 h-3.5" />}
                  label={isAr ? 'مقدم الطلب' : 'Requested By'}
                  value={request.requester.nameAr}
                />
              )}

              {/* Status update (for authorized users) */}
              {canUpdate && (
                <div className="rounded-xl border border-surface-border bg-surface-hover/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-text-secondary">{isAr ? 'تحديث الحالة' : 'Update Status'}</p>
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value as PRStatus | '')}
                    className="field-select w-full"
                  >
                    <option value="">{isAr ? 'اختر الحالة الجديدة...' : 'Select new status...'}</option>
                    {EDITABLE_STATUSES
                      .filter((s) => s !== request.status)
                      .filter((s) => s !== 'APPROVED' || canApprove)
                      .map((s) => (
                        <option key={s} value={s}>{label(STATUS_CONFIG[s])}</option>
                      ))}
                  </select>
                  {statusUpdate && (
                    <textarea
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      rows={2}
                      className="field-textarea w-full"
                      placeholder={isAr ? 'ملاحظة (اختياري)...' : 'Note (optional)...'}
                    />
                  )}
                  {statusUpdate && (
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={updateMutation.isPending}
                      className="w-full"
                    >
                      {updateMutation.isPending
                        ? (isAr ? 'جارٍ التحديث...' : 'Updating...')
                        : (isAr ? 'تأكيد التحديث' : 'Confirm Update')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW DOCUMENTS */}
          {isView && activeTab === 'documents' && request && (
            <DocumentSection
              entityType="purchase_request"
              entityId={request.id}
              defaultCategory="purchase_request"
              readOnly={!canCreate}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-border">
          <Button variant="outline" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
          {mode === 'create' && canCreate && (
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending
                ? (isAr ? 'جارٍ الحفظ...' : 'Saving...')
                : (isAr ? 'إنشاء الطلب' : 'Create Request')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
