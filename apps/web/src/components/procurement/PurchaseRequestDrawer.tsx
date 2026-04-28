'use client';

import { useState, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Send,
  ShoppingCart,
  Tag,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentSection } from '@/components/documents/DocumentSection';
import { getApiErrorMessage } from '@/lib/api';
import { cn, formatDateWithEnglishDigits, formatNumber } from '@/lib/utils';
import {
  useApprovePRStage,
  useCreatePurchaseRequest,
  usePurchaseRequest,
  useRejectPRStage,
  useSubmitPurchaseRequest,
  useUpdatePurchaseRequest,
  type PRApprovalStage,
  type PRPriority,
  type PRRequirementType,
  type PRStatus,
  type PurchaseRequest,
} from '@/hooks/useProcurement';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/store/auth.store';

const EMPTY_VALUE = '—';

const STATUS_CONFIG: Record<
  PRStatus,
  {
    ar: string;
    en: string;
    variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info';
  }
> = {
  DRAFT: { ar: 'مسودة', en: 'Draft', variant: 'muted' },
  SUBMITTED: { ar: 'مقدم', en: 'Submitted', variant: 'info' },
  PENDING_APPROVAL: { ar: 'بانتظار الاعتماد', en: 'Pending Approval', variant: 'warning' },
  UNDER_REVIEW: { ar: 'قيد المراجعة', en: 'Under Review', variant: 'warning' },
  APPROVED: { ar: 'معتمد', en: 'Approved', variant: 'success' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected', variant: 'danger' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled', variant: 'muted' },
  PARTIALLY_FULFILLED: { ar: 'منفذ جزئيًا', en: 'Partially Fulfilled', variant: 'warning' },
  FULFILLED: { ar: 'منفذ', en: 'Fulfilled', variant: 'success' },
  RECEIVED: { ar: 'مستلم', en: 'Received', variant: 'success' },
  ORDERED: { ar: 'مطلوب', en: 'Ordered', variant: 'info' },
};

const PRIORITY_CONFIG: Record<PRPriority, { ar: string; en: string; color: string }> = {
  LOW: { ar: 'منخفضة', en: 'Low', color: 'text-text-muted' },
  MEDIUM: { ar: 'متوسطة', en: 'Medium', color: 'text-amber-400' },
  HIGH: { ar: 'عالية', en: 'High', color: 'text-red-400' },
};

const TYPE_CONFIG: Record<PRRequirementType, { ar: string; en: string }> = {
  MATERIALS: { ar: 'مواد', en: 'Materials' },
  EQUIPMENT: { ar: 'معدات', en: 'Equipment' },
  SERVICES: { ar: 'خدمات', en: 'Services' },
  OTHER: { ar: 'أخرى', en: 'Other' },
};

const STAGE_LABELS: Record<PRApprovalStage, { ar: string; en: string }> = {
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  PROCUREMENT_REVIEW: { ar: 'مراجعة المشتريات', en: 'Procurement Review' },
  COST_REVIEW: { ar: 'مراجعة التكاليف', en: 'Cost Review' },
  PM_REVIEW: { ar: 'اعتماد مدير المشروع', en: 'Project Manager Approval' },
  FINAL_REVIEW: { ar: 'الاعتماد النهائي', en: 'Final Approval' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
};

const STAGE_ROLE_CODES: Record<PRApprovalStage, string[]> = {
  DRAFT: [],
  PROCUREMENT_REVIEW: ['PROCUREMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'],
  COST_REVIEW: ['COST_CONTROLLER', 'ADMIN', 'SUPER_ADMIN'],
  PM_REVIEW: ['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
  FINAL_REVIEW: ['ADMIN', 'SUPER_ADMIN'],
  COMPLETED: [],
  REJECTED: [],
};

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  PROCUREMENT_OFFICER: { ar: 'مسؤول المشتريات', en: 'Procurement Officer' },
  COST_CONTROLLER: { ar: 'مراقب التكاليف', en: 'Cost Controller' },
  PROJECT_MANAGER: { ar: 'مدير المشروع', en: 'Project Manager' },
  ADMIN: { ar: 'المشرف', en: 'Admin' },
  SUPER_ADMIN: { ar: 'مدير النظام', en: 'Super Admin' },
};

const APPROVAL_STAGES: PRApprovalStage[] = [
  'PROCUREMENT_REVIEW',
  'COST_REVIEW',
  'PM_REVIEW',
  'FINAL_REVIEW',
];

interface Props {
  mode: 'view' | 'create';
  request?: PurchaseRequest;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function PurchaseRequestDrawer({ mode, request, onClose, onSuccess }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, hasPermission } = useAuthStore();
  const userRoles: string[] = (user as { roles?: string[] } | null)?.roles ?? [];

  const canCreate = hasPermission('procurement:create');
  const canUpdate = hasPermission('procurement:update');
  const canApprove = hasPermission('procurement:approve');
  const isView = mode === 'view';

  const { data: projectsData } = useProjects({ page: 1, limit: 100 });
  const projects = projectsData?.items ?? [];

  const { data: liveRequest } = usePurchaseRequest(request?.id ?? '');
  const currentRequest = liveRequest ?? request;

  const createMutation = useCreatePurchaseRequest();
  const updateMutation = useUpdatePurchaseRequest();
  const submitMutation = useSubmitPurchaseRequest();
  const approveMutation = useApprovePRStage();
  const rejectMutation = useRejectPRStage();

  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'documents'>('details');
  const [error, setError] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [form, setForm] = useState({
    projectId: request?.project.id ?? '',
    nameAr: request?.nameAr ?? '',
    nameEn: request?.nameEn ?? '',
    description: request?.description ?? '',
    requirementType: (request?.requirementType ?? 'MATERIALS') as PRRequirementType,
    priority: (request?.priority ?? 'MEDIUM') as PRPriority,
    quantity: request?.quantity ? String(request.quantity) : '',
    unit: request?.unit ?? '',
    totalAmount: request?.totalAmount ? String(request.totalAmount) : '',
    vendor: request?.vendor ?? '',
    expectedDeliveryDate: request?.expectedDeliveryDate
      ? new Date(request.expectedDeliveryDate).toISOString().split('T')[0]
      : '',
    notes: request?.notes ?? '',
  });

  const label = <T extends { ar: string; en: string }>(value: T) => (isAr ? value.ar : value.en);

  const currentStage = currentRequest?.currentStage ?? 'DRAFT';
  const allowedRoles = STAGE_ROLE_CODES[currentStage] ?? [];
  const isWorkflowStageActive = !['DRAFT', 'COMPLETED', 'REJECTED'].includes(currentStage);
  const canActOnStage =
    Boolean(currentRequest) &&
    canApprove &&
    allowedRoles.some((role) => userRoles.includes(role));
  const nextApproverRoles = allowedRoles
    .map((role) => ROLE_LABELS[role])
    .filter(Boolean)
    .map((role) => label(role));

  const submitCreate = async (saveAsDraft: boolean) => {
    if (!form.projectId || !form.nameAr.trim()) {
      setError(isAr ? 'المشروع والاسم العربي مطلوبان' : 'Project and Arabic name are required');
      return;
    }

    try {
      setError('');
      await createMutation.mutateAsync({
        projectId: form.projectId,
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        description: form.description.trim() || undefined,
        requirementType: form.requirementType,
        priority: form.priority,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unit: form.unit.trim() || undefined,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        vendor: form.vendor.trim() || undefined,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        notes: form.notes.trim() || undefined,
        saveAsDraft,
      });

      onSuccess?.(
        saveAsDraft
          ? isAr
            ? 'تم حفظ الطلب كمسودة'
            : 'Request saved as draft'
          : isAr
            ? 'تم إنشاء الطلب وإرساله للاعتماد'
            : 'Request created and submitted for approval',
      );
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, isAr ? 'حدث خطأ أثناء إنشاء الطلب' : 'An error occurred while creating the request'));
    }
  };

  const handleSubmit = async () => {
    if (!currentRequest) return;

    try {
      setError('');
      await submitMutation.mutateAsync({ id: currentRequest.id });
      onSuccess?.(isAr ? 'تم تقديم الطلب للاعتماد' : 'Request submitted for approval');
    } catch (err) {
      setError(getApiErrorMessage(err, isAr ? 'حدث خطأ أثناء التقديم' : 'An error occurred while submitting'));
    }
  };

  const handleApprove = async () => {
    if (!currentRequest) return;

    try {
      setError('');
      await approveMutation.mutateAsync({
        id: currentRequest.id,
        note: actionNote.trim() || undefined,
      });
      setActionNote('');
      setShowRejectForm(false);
      onSuccess?.(isAr ? 'تم اعتماد المرحلة الحالية' : 'Current stage approved');
    } catch (err) {
      setError(getApiErrorMessage(err, isAr ? 'حدث خطأ أثناء الاعتماد' : 'An error occurred while approving'));
    }
  };

  const handleReject = async () => {
    if (!currentRequest) return;

    if (!actionNote.trim()) {
      setError(isAr ? 'سبب الرفض مطلوب' : 'Rejection reason is required');
      return;
    }

    try {
      setError('');
      await rejectMutation.mutateAsync({
        id: currentRequest.id,
        note: actionNote.trim(),
      });
      setActionNote('');
      setShowRejectForm(false);
      onSuccess?.(isAr ? 'تم رفض الطلب' : 'Request rejected');
    } catch (err) {
      setError(getApiErrorMessage(err, isAr ? 'حدث خطأ أثناء الرفض' : 'An error occurred while rejecting'));
    }
  };

  const handleStatusUpdate = async (status: PRStatus) => {
    if (!currentRequest) return;

    try {
      setError('');
      await updateMutation.mutateAsync({ id: currentRequest.id, data: { status } });
      onSuccess?.(
        status === 'FULFILLED'
          ? isAr
            ? 'تم تحديث الطلب إلى منفذ'
            : 'Request marked as fulfilled'
          : isAr
            ? 'تم تحديث الطلب إلى مستلم'
            : 'Request marked as received',
      );
    } catch (err) {
      setError(getApiErrorMessage(err, isAr ? 'حدث خطأ أثناء تحديث الحالة' : 'An error occurred while updating status'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="flex h-full w-full max-w-xl flex-col border-s border-surface-border bg-surface-card shadow-2xl"
        style={{ direction: isAr ? 'rtl' : 'ltr' }}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-brand/10 p-2">
              <ShoppingCart className="h-4 w-4 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-muted">
                {isView ? currentRequest?.prNumber ?? EMPTY_VALUE : isAr ? 'طلب شراء جديد' : 'New Purchase Request'}
              </p>
              <h2 className="truncate text-base font-semibold text-text-primary">
                {isView ? currentRequest?.nameAr ?? EMPTY_VALUE : isAr ? 'إنشاء طلب شراء' : 'Create Purchase Request'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isView && (
          <div className="flex gap-4 border-b border-surface-border px-5">
            {[
              { key: 'details', label: isAr ? 'التفاصيل' : 'Details' },
              { key: 'workflow', label: isAr ? 'سير الاعتماد' : 'Workflow' },
              { key: 'documents', label: isAr ? 'المستندات' : 'Documents' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  'border-b-2 py-3 text-sm font-medium transition-colors',
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

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <Field label={isAr ? 'المشروع *' : 'Project *'}>
                <select
                  value={form.projectId}
                  onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
                  className="field-select w-full"
                >
                  <option value="">{isAr ? 'اختر المشروع...' : 'Select project...'}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.nameAr}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={isAr ? 'الاسم بالعربية *' : 'Name (Arabic) *'}>
                <input
                  type="text"
                  value={form.nameAr}
                  onChange={(event) => setForm((prev) => ({ ...prev, nameAr: event.target.value }))}
                  className="field-input w-full"
                  placeholder={isAr ? 'مثال: توريد حديد تسليح' : 'e.g. Rebar supply'}
                />
              </Field>

              <Field label={isAr ? 'الاسم بالإنجليزية' : 'Name (English)'}>
                <input
                  type="text"
                  value={form.nameEn}
                  onChange={(event) => setForm((prev) => ({ ...prev, nameEn: event.target.value }))}
                  className="field-input w-full"
                  placeholder={isAr ? 'اختياري' : 'Optional'}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={isAr ? 'نوع المتطلب' : 'Requirement Type'}>
                  <select
                    value={form.requirementType}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        requirementType: event.target.value as PRRequirementType,
                      }))
                    }
                    className="field-select w-full"
                  >
                    {(Object.keys(TYPE_CONFIG) as PRRequirementType[]).map((type) => (
                      <option key={type} value={type}>
                        {label(TYPE_CONFIG[type])}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={isAr ? 'الأولوية' : 'Priority'}>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        priority: event.target.value as PRPriority,
                      }))
                    }
                    className="field-select w-full"
                  >
                    {(Object.keys(PRIORITY_CONFIG) as PRPriority[]).map((priority) => (
                      <option key={priority} value={priority}>
                        {label(PRIORITY_CONFIG[priority])}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={isAr ? 'الكمية' : 'Quantity'}>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                    className="field-input w-full"
                    placeholder="0"
                  />
                </Field>

                <Field label={isAr ? 'الوحدة' : 'Unit'}>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                    className="field-input w-full"
                    placeholder={isAr ? 'طن، م3، وحدة...' : 'ton, m3, unit...'}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={isAr ? 'القيمة التقديرية (ر.س)' : 'Estimated Amount (SAR)'}>
                  <input
                    type="number"
                    min="0"
                    value={form.totalAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, totalAmount: event.target.value }))}
                    className="field-input w-full"
                    placeholder="0"
                  />
                </Field>

                <Field label={isAr ? 'المورد المقترح' : 'Proposed Vendor'}>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value }))}
                    className="field-input w-full"
                    placeholder={isAr ? 'اسم المورد...' : 'Vendor name...'}
                  />
                </Field>
              </div>

              <Field label={isAr ? 'تاريخ التسليم المتوقع' : 'Expected Delivery Date'}>
                <input
                  type="date"
                  dir="ltr"
                  value={form.expectedDeliveryDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, expectedDeliveryDate: event.target.value }))
                  }
                  className="field-input w-full"
                />
              </Field>

              <Field label={isAr ? 'الوصف' : 'Description'}>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="field-textarea w-full"
                  rows={4}
                  placeholder={isAr ? 'تفاصيل الطلب والغرض منه' : 'Request purpose and details'}
                />
              </Field>

              <Field label={isAr ? 'ملاحظات' : 'Notes'}>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="field-textarea w-full"
                  rows={3}
                  placeholder={isAr ? 'ملاحظات إضافية' : 'Additional notes'}
                />
              </Field>

              <div className="rounded-xl border border-surface-border bg-surface-hover/20 px-4 py-3">
                <p className="text-xs font-semibold text-text-secondary">
                  {isAr ? 'سلوك الحفظ' : 'Create behavior'}
                </p>
                <p className="mt-1 text-xs leading-6 text-text-muted">
                  {isAr
                    ? 'الإجراء الرئيسي ينشئ الطلب ويرسله مباشرة إلى مراجعة المشتريات. إذا احتجت مسودة فقط استخدم زر "حفظ كمسودة".'
                    : 'The primary action creates the request and immediately submits it to Procurement Review. Use "Save as Draft" only when needed.'}
                </p>
              </div>
            </div>
          )}

          {isView && currentRequest && activeTab === 'details' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-hover/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_CONFIG[currentRequest.status].variant}>
                        {label(STATUS_CONFIG[currentRequest.status])}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        {isAr ? 'المرحلة الحالية:' : 'Current stage:'}{' '}
                        <span className="font-medium text-text-secondary">
                          {label(STAGE_LABELS[currentRequest.currentStage])}
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">
                      {isAr ? 'رقم الطلب:' : 'Request number:'}{' '}
                      <span className="font-mono text-text-secondary">{currentRequest.prNumber}</span>
                    </p>
                  </div>
                  <div className="text-xs text-text-muted">
                    {isAr ? 'تاريخ الطلب:' : 'Requested:'}{' '}
                    {formatDateWithEnglishDigits(currentRequest.requestedAt, locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                {nextApproverRoles.length > 0 && currentRequest.currentStage !== 'COMPLETED' && currentRequest.currentStage !== 'REJECTED' && (
                  <div className="mt-3 rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-xs text-text-muted">
                    {isAr ? 'المراجع التالي:' : 'Next reviewer:'}{' '}
                    <span className="font-medium text-text-secondary">{nextApproverRoles.join(' / ')}</span>
                  </div>
                )}
              </div>

              {currentRequest.status === 'DRAFT' && canUpdate && (
                <div className="rounded-xl border border-surface-border bg-surface-hover/20 p-4">
                  <p className="text-xs font-semibold text-text-secondary">
                    {isAr ? 'إرسال الطلب للاعتماد' : 'Submit request for approval'}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {isAr
                      ? 'سيتم نقل الطلب مباشرة إلى مرحلة مراجعة المشتريات.'
                      : 'The request will move directly to Procurement Review.'}
                  </p>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    size="sm"
                    className="mt-3 w-full"
                  >
                    <Send className="me-1.5 h-3.5 w-3.5" />
                    {submitMutation.isPending
                      ? isAr
                        ? 'جارٍ التقديم...'
                        : 'Submitting...'
                      : isAr
                        ? 'تقديم الطلب'
                        : 'Submit Request'}
                  </Button>
                </div>
              )}

              {isWorkflowStageActive && canActOnStage && (
                <div className="space-y-3 rounded-xl border border-surface-border bg-surface-hover/20 p-4">
                  <p className="text-xs font-semibold text-text-secondary">
                    {isAr ? 'إجراء الاعتماد' : 'Approval action'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {isAr ? 'المرحلة الحالية:' : 'Current stage:'}{' '}
                    <span className="font-medium text-text-secondary">
                      {label(STAGE_LABELS[currentRequest.currentStage])}
                    </span>
                  </p>
                  <textarea
                    value={actionNote}
                    onChange={(event) => setActionNote(event.target.value)}
                    rows={3}
                    className="field-textarea w-full text-sm"
                    placeholder={
                      showRejectForm
                        ? isAr
                          ? 'سبب الرفض مطلوب'
                          : 'Rejection reason is required'
                        : isAr
                          ? 'ملاحظة اعتماد (اختيارية)'
                          : 'Approval note (optional)'
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {!showRejectForm && (
                      <Button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        size="sm"
                        className="flex-1"
                      >
                        <CheckCircle2 className="me-1.5 h-3.5 w-3.5" />
                        {approveMutation.isPending
                          ? isAr
                            ? 'جارٍ الاعتماد...'
                            : 'Approving...'
                          : isAr
                            ? 'اعتماد'
                            : 'Approve'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10',
                        showRejectForm && 'bg-red-500/10',
                      )}
                      onClick={() => {
                        if (showRejectForm) {
                          void handleReject();
                          return;
                        }
                        setShowRejectForm(true);
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <XCircle className="me-1.5 h-3.5 w-3.5" />
                      {rejectMutation.isPending
                        ? isAr
                          ? 'جارٍ الرفض...'
                          : 'Rejecting...'
                        : showRejectForm
                          ? isAr
                            ? 'تأكيد الرفض'
                            : 'Confirm Reject'
                          : isAr
                            ? 'رفض'
                            : 'Reject'}
                    </Button>
                    {showRejectForm && (
                      <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)}>
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {isWorkflowStageActive && !canActOnStage && nextApproverRoles.length > 0 && (
                <div className="rounded-xl border border-surface-border bg-surface-hover/20 p-4">
                  <p className="text-xs font-semibold text-text-secondary">
                    {isAr ? 'لا يمكنك الاعتماد في هذه المرحلة' : 'You cannot act at this stage'}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {isAr ? 'المرحلة الحالية تتطلب:' : 'The current stage requires:'}{' '}
                    <span className="font-medium text-text-secondary">{nextApproverRoles.join(' / ')}</span>
                  </p>
                </div>
              )}

              {canUpdate && currentRequest.status === 'APPROVED' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate('FULFILLED')}
                    disabled={updateMutation.isPending}
                  >
                    {isAr ? 'تحديث إلى منفذ' : 'Mark Fulfilled'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate('RECEIVED')}
                    disabled={updateMutation.isPending}
                  >
                    {isAr ? 'تحديث إلى مستلم' : 'Mark Received'}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InfoCell
                  icon={<Tag className="h-3.5 w-3.5" />}
                  label={isAr ? 'النوع' : 'Type'}
                  value={label(TYPE_CONFIG[currentRequest.requirementType])}
                />
                <InfoCell
                  icon={<Package className="h-3.5 w-3.5" />}
                  label={isAr ? 'الكمية' : 'Quantity'}
                  value={
                    currentRequest.quantity
                      ? `${formatNumber(Number(currentRequest.quantity))} ${currentRequest.unit ?? ''}`.trim()
                      : EMPTY_VALUE
                  }
                />
                <InfoCell
                  icon={<Banknote className="h-3.5 w-3.5" />}
                  label={isAr ? 'المبلغ' : 'Amount'}
                  value={
                    currentRequest.totalAmount
                      ? `${formatNumber(Number(currentRequest.totalAmount))} ${currentRequest.currency}`
                      : EMPTY_VALUE
                  }
                />
                <InfoCell
                  icon={<User className="h-3.5 w-3.5" />}
                  label={isAr ? 'المورد' : 'Vendor'}
                  value={currentRequest.vendor ?? EMPTY_VALUE}
                />
                <InfoCell
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label={isAr ? 'تاريخ الطلب' : 'Requested Date'}
                  value={formatDateWithEnglishDigits(currentRequest.requestedAt, locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                />
                <InfoCell
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label={isAr ? 'التسليم المتوقع' : 'Expected Delivery'}
                  value={
                    currentRequest.expectedDeliveryDate
                      ? formatDateWithEnglishDigits(currentRequest.expectedDeliveryDate, locale, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : EMPTY_VALUE
                  }
                />
              </div>

              {(currentRequest.items?.length ?? 0) > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-hover/10">
                  <div className="border-b border-surface-border px-4 py-3">
                    <p className="text-xs font-semibold text-text-secondary">
                      {isAr ? 'بنود الطلب' : 'Request Items'}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-hover/40">
                        <tr>
                          <th className="px-4 py-2 text-start text-xs text-text-muted">#</th>
                          <th className="px-4 py-2 text-start text-xs text-text-muted">
                            {isAr ? 'البند' : 'Item'}
                          </th>
                          <th className="px-4 py-2 text-start text-xs text-text-muted">
                            {isAr ? 'الكمية' : 'Quantity'}
                          </th>
                          <th className="px-4 py-2 text-start text-xs text-text-muted">
                            {isAr ? 'القيمة التقديرية' : 'Estimated'}
                          </th>
                          <th className="px-4 py-2 text-start text-xs text-text-muted">
                            {isAr ? 'القيمة المعتمدة' : 'Approved'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {(currentRequest.items ?? []).map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-xs text-text-muted">
                              {formatNumber(item.lineNumber)}
                            </td>
                            <td className="px-4 py-2">
                              <p className="font-medium text-text-primary">{item.titleAr}</p>
                              {item.description && (
                                <p className="mt-0.5 text-xs text-text-muted">{item.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs text-text-secondary">
                              {item.quantity
                                ? `${formatNumber(Number(item.quantity))} ${item.unit ?? ''}`.trim()
                                : EMPTY_VALUE}
                            </td>
                            <td className="px-4 py-2 text-xs text-text-secondary">
                              {item.estimatedTotal
                                ? `${formatNumber(Number(item.estimatedTotal))} ${currentRequest.currency}`
                                : EMPTY_VALUE}
                            </td>
                            <td className="px-4 py-2 text-xs text-text-secondary">
                              {item.approvedTotal
                                ? `${formatNumber(Number(item.approvedTotal))} ${currentRequest.currency}`
                                : EMPTY_VALUE}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-surface-border bg-surface-hover/20 px-4 py-3">
                <p className="text-xs text-text-muted">{isAr ? 'المشروع' : 'Project'}</p>
                <p className="text-sm font-semibold text-text-primary">{currentRequest.project.nameAr}</p>
                <p className="text-xs text-text-muted">{currentRequest.project.code}</p>
              </div>

              {currentRequest.activity && (
                <div className="rounded-xl border border-surface-border bg-surface-hover/20 px-4 py-3">
                  <p className="text-xs text-text-muted">{isAr ? 'النشاط المرتبط' : 'Linked Activity'}</p>
                  <p className="text-sm font-semibold text-text-primary">{currentRequest.activity.nameAr}</p>
                  <p className="text-xs text-text-muted">{currentRequest.activity.code}</p>
                </div>
              )}

              {currentRequest.description && (
                <SectionText
                  title={isAr ? 'الوصف' : 'Description'}
                  icon={<FileText className="h-3.5 w-3.5" />}
                  value={currentRequest.description}
                />
              )}

              {currentRequest.notes && (
                <SectionText title={isAr ? 'ملاحظات' : 'Notes'} value={currentRequest.notes} />
              )}

              {currentRequest.approvalNote && (
                <div
                  className={cn(
                    'rounded-xl border px-4 py-3',
                    currentRequest.status === 'REJECTED'
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-amber-500/20 bg-amber-500/5',
                  )}
                >
                  <p
                    className={cn(
                      'mb-1 text-xs font-semibold',
                      currentRequest.status === 'REJECTED' ? 'text-red-400' : 'text-amber-400',
                    )}
                  >
                    {currentRequest.status === 'REJECTED'
                      ? isAr
                        ? 'سبب الرفض'
                        : 'Rejection Note'
                      : isAr
                        ? 'ملاحظة الاعتماد'
                        : 'Approval Note'}
                  </p>
                  <p className="text-sm text-text-secondary">{currentRequest.approvalNote}</p>
                </div>
              )}

              {currentRequest.requester && (
                <InfoCell
                  icon={<User className="h-3.5 w-3.5" />}
                  label={isAr ? 'مقدم الطلب' : 'Requested By'}
                  value={currentRequest.requester.nameAr}
                />
              )}
            </div>
          )}

          {isView && currentRequest && activeTab === 'workflow' && (
            <ApprovalChain request={currentRequest} isAr={isAr} locale={locale} />
          )}

          {isView && currentRequest && activeTab === 'documents' && (
            <DocumentSection
              entityType="purchase_request"
              entityId={currentRequest.id}
              defaultCategory="purchase_request"
              readOnly={!canCreate}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
          {mode === 'create' && canCreate && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void submitCreate(true)}
                disabled={createMutation.isPending}
              >
                {isAr ? 'حفظ كمسودة' : 'Save as Draft'}
              </Button>
              <Button onClick={() => void submitCreate(false)} disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? isAr
                    ? 'جارٍ الحفظ...'
                    : 'Saving...'
                  : isAr
                    ? 'إنشاء وإرسال للاعتماد'
                    : 'Create and Submit for Approval'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalChain({
  request,
  isAr,
  locale,
}: {
  request: PurchaseRequest;
  isAr: boolean;
  locale: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {isAr ? 'مسار الاعتماد' : 'Approval Workflow'}
      </p>

      <StageRow
        label={isAr ? 'تقديم الطلب' : 'Request Submitted'}
        roleLabel={isAr ? 'مقدم الطلب' : 'Requester'}
        status={request.status === 'DRAFT' ? 'PENDING' : 'APPROVED'}
        actorName={request.requester?.nameAr ?? null}
        date={request.status === 'DRAFT' ? null : request.requestedAt}
        note={null}
        isAr={isAr}
        locale={locale}
        isCurrent={false}
      />

      {APPROVAL_STAGES.map((stage) => {
        const step = (request.approvalSteps ?? []).find((entry) => entry.stage === stage);
        const isCurrent =
          request.currentStage === stage &&
          request.currentStage !== 'COMPLETED' &&
          request.currentStage !== 'REJECTED';
        const isPast = isStageCompleted(stage, request.currentStage, request.status);

        let status: StepStatus = 'NOT_REACHED';
        if (step) {
          status =
            step.status === 'APPROVED'
              ? 'APPROVED'
              : step.status === 'REJECTED'
                ? 'REJECTED'
                : 'PENDING';
        } else if (isCurrent) {
          status = 'PENDING';
        } else if (isPast) {
          status = 'APPROVED';
        }

        return (
          <StageRow
            key={stage}
            label={isAr ? STAGE_LABELS[stage].ar : STAGE_LABELS[stage].en}
            roleLabel={getStageRoleLabel(stage, isAr)}
            status={status}
            actorName={step?.actor?.nameAr ?? null}
            date={step?.decidedAt ?? null}
            note={step?.note ?? null}
            isAr={isAr}
            locale={locale}
            isCurrent={isCurrent}
          />
        );
      })}

      {(request.currentStage === 'COMPLETED' || request.currentStage === 'REJECTED') && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3',
            request.currentStage === 'COMPLETED'
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-red-500/30 bg-red-500/5',
          )}
        >
          {request.currentStage === 'COMPLETED' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
          )}
          <div>
            <p
              className={cn(
                'text-sm font-semibold',
                request.currentStage === 'COMPLETED' ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {request.currentStage === 'COMPLETED'
                ? isAr
                  ? 'تم الاعتماد النهائي'
                  : 'Finally Approved'
                : isAr
                  ? 'تم رفض الطلب'
                  : 'Request Rejected'}
            </p>
            {request.approvedAt && (
              <p className="text-xs text-text-muted">
                {formatDateWithEnglishDigits(request.approvedAt, locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isStageCompleted(
  stage: PRApprovalStage,
  currentStage: PRApprovalStage,
  status: PRStatus,
) {
  const order: PRApprovalStage[] = [
    'PROCUREMENT_REVIEW',
    'COST_REVIEW',
    'PM_REVIEW',
    'FINAL_REVIEW',
    'COMPLETED',
  ];

  const stageIndex = order.indexOf(stage);
  const currentIndex = order.indexOf(currentStage);

  return stageIndex >= 0 && currentIndex > stageIndex && status !== 'REJECTED';
}

function getStageRoleLabel(stage: PRApprovalStage, isAr: boolean) {
  const roleLabels = (STAGE_ROLE_CODES[stage] ?? [])
    .map((role) => ROLE_LABELS[role])
    .filter(Boolean)
    .map((role) => (isAr ? role.ar : role.en));

  return roleLabels.join(' / ');
}

type StepStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'NOT_REACHED';

function StageRow({
  label,
  roleLabel,
  status,
  actorName,
  date,
  note,
  isAr,
  locale,
  isCurrent,
}: {
  label: string;
  roleLabel: string;
  status: StepStatus;
  actorName: string | null;
  date: string | null;
  note: string | null;
  isAr: boolean;
  locale: string;
  isCurrent: boolean;
}) {
  const icon = {
    APPROVED: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    REJECTED: <XCircle className="h-4 w-4 text-red-400" />,
    PENDING: <Clock className="h-4 w-4 text-amber-400" />,
    NOT_REACHED: <Clock className="h-4 w-4 text-text-muted/40" />,
  }[status];

  const textColor = {
    APPROVED: 'text-text-primary',
    REJECTED: 'text-red-400',
    PENDING: 'text-amber-400',
    NOT_REACHED: 'text-text-muted/60',
  }[status];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        isCurrent ? 'border-amber-400/30 bg-amber-400/5' : 'border-surface-border bg-surface-hover/10',
      )}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', textColor)}>{label}</p>
        {roleLabel && <p className="mt-0.5 text-xs text-text-muted">{roleLabel}</p>}
        {actorName && <p className="mt-1 text-xs text-text-secondary">{actorName}</p>}
        {date && (
          <p className="text-xs text-text-muted">
            {formatDateWithEnglishDigits(date, locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
        {note && <p className="mt-1 text-xs italic text-text-secondary">"{note}"</p>}
        {isCurrent && (
          <p className="mt-1 text-xs font-medium text-amber-400">
            {isAr ? 'بانتظار الإجراء' : 'Awaiting action'}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function SectionText({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
        {icon}
        {title}
      </p>
      <p className="rounded-xl border border-surface-border bg-surface-hover/20 px-4 py-3 text-sm leading-relaxed text-text-secondary">
        {value}
      </p>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
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
