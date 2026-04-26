'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usersApi, operationsApi } from '@/lib/api';
import {
  formatCurrency,
  formatDateWithEnglishDigits,
  formatNumber,
  formatPercent,
  formatText,
} from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  useSubmitForApproval,
  useApproveActivity,
  type ActivityRecord,
  type LookaheadPriority,
  type LookaheadStatus,
  type ActivityStatus,
  type ApprovalStatus,
  type ActivityCostHealth,
  type CostTimingStatus,
  type RequirementReadinessStatus,
  type ScheduleRecord,
} from '@/hooks/useOperations';

// ─── Types ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'CIVIL', 'MECHANICAL', 'ELECTRICAL', 'FINISHING',
  'PROCUREMENT', 'ADMIN', 'HSE', 'OTHER',
] as const;

const STATUSES: ActivityStatus[] = [
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'BLOCKED',
];

const LOOKAHEAD_STATUSES: LookaheadStatus[] = [
  'PLANNED', 'READY', 'IN_PROGRESS', 'BLOCKED', 'DONE',
];

const PRIORITIES: LookaheadPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const REQUIREMENT_STATUSES: RequirementReadinessStatus[] = [
  'PENDING',
  'REQUESTED',
  'PARTIALLY_AVAILABLE',
  'AVAILABLE',
  'BLOCKED',
];

const STATUS_VARIANT: Record<ActivityStatus, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  NOT_STARTED: 'muted',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  DELAYED: 'warning',
  BLOCKED: 'danger',
};

const APPROVAL_VARIANT: Record<ApprovalStatus, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  NOT_REQUIRED: 'muted',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const COST_HEALTH_VARIANT: Record<
  ActivityCostHealth,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  NOT_SET: 'muted',
  PLANNED: 'default',
  AT_RISK: 'warning',
  ON_TRACK: 'success',
  OVER: 'danger',
  UNPLANNED: 'warning',
};

const COST_TIMING_VARIANT: Record<
  CostTimingStatus,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  NONE: 'muted',
  WATCH: 'warning',
  BLOCKED: 'danger',
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  code: z.string().max(20).optional().or(z.literal('')),
  nameAr: z.string().min(1, 'مطلوب').max(300),
  nameEn: z.string().max(300).optional().or(z.literal('')),
  category: z.string().optional(),
  location: z.string().max(200).optional().or(z.literal('')),
  status: z.string(),
  lookaheadStatus: z.string(),
  priority: z.string(),
  readyForExecution: z.boolean().optional(),
  missingRequirements: z.string().max(1000).optional().or(z.literal('')),
  progressPercent: z.number().min(0).max(100).optional(),
  plannedStart: z.string().optional().or(z.literal('')),
  plannedEnd: z.string().optional().or(z.literal('')),
  actualStart: z.string().optional().or(z.literal('')),
  actualEnd: z.string().optional().or(z.literal('')),
  blockerReason: z.string().max(1000).optional().or(z.literal('')),
  requiredLabor: z.string().max(500).optional().or(z.literal('')),
  laborRequirementStatus: z.string().optional(),
  laborRequirementNotes: z.string().max(1000).optional().or(z.literal('')),
  requiredMaterials: z.string().max(500).optional().or(z.literal('')),
  materialsRequirementStatus: z.string().optional(),
  materialsRequirementNotes: z.string().max(1000).optional().or(z.literal('')),
  requiredEquipment: z.string().max(500).optional().or(z.literal('')),
  equipmentRequirementStatus: z.string().optional(),
  equipmentRequirementNotes: z.string().max(1000).optional().or(z.literal('')),
  expectedCost: z.number().optional(),
  actualCost: z.number().optional(),
  responsibleUserId: z.string().optional().or(z.literal('')),
  requiresApproval: z.boolean().optional(),
  scheduleId: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInput(val: string | null | undefined): string {
  if (!val) return '';
  return val.slice(0, 10);
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-surface-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-card hover:bg-surface-hover text-sm font-semibold text-text-primary transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Approval panel (view mode only) ─────────────────────────────────────────

function ApprovalPanel({
  activity,
  projectId,
  canApprove,
}: {
  activity: ActivityRecord;
  projectId: string;
  canApprove: boolean;
}) {
  const t = useTranslations('operations');
  const locale = useLocale();
  const [note, setNote] = useState('');
  const submitMutation = useSubmitForApproval(projectId);
  const approveMutation = useApproveActivity(projectId);

  const canSubmit =
    activity.requiresApproval &&
    activity.approvalStatus !== 'PENDING' &&
    activity.approvalStatus !== 'APPROVED';

  const canAct = canApprove && activity.approvalStatus === 'PENDING';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">{t('status')}:</span>
        <Badge variant={APPROVAL_VARIANT[activity.approvalStatus]}>
          {t(`approvalStatuses.${activity.approvalStatus}`)}
        </Badge>
      </div>

      {activity.approvedBy && (
        <p className="text-xs text-text-muted">
          {formatDateWithEnglishDigits(activity.approvedAt, locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })} — {formatText(activity.approvedBy.nameAr)}
          {activity.approvalNote && ` — ${formatText(activity.approvalNote)}`}
        </p>
      )}

      {canSubmit && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => submitMutation.mutate(activity.id)}
          disabled={submitMutation.isPending}
        >
          {t('submitForApproval')}
        </Button>
      )}

      {canAct && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('approvalNote')}
            rows={2}
            className="flex w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => approveMutation.mutate({ activityId: activity.id, decision: 'APPROVED', note })}
              disabled={approveMutation.isPending}
            >
              {t('approve')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => approveMutation.mutate({ activityId: activity.id, decision: 'REJECTED', note })}
              disabled={approveMutation.isPending}
            >
              {t('reject')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

interface ActivityDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  activity: ActivityRecord | null;
}

interface UserOption { id: string; nameAr: string; nameEn: string | null; email: string; }

export function ActivityDrawer({ open, onOpenChange, projectId, activity }: ActivityDrawerProps) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const { hasPermission } = useAuthStore();
  const isEdit = !!activity;

  const canEdit = hasPermission('operations:update') || hasPermission('operations:create');
  const canDelete = hasPermission('operations:delete');
  const canApprove = hasPermission('operations:approve');

  const createMutation = useCreateActivity(projectId);
  const updateMutation = useUpdateActivity(projectId);
  const deleteMutation = useDeleteActivity(projectId);

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ['users-dropdown'],
    enabled: open,
    queryFn: async () => {
      const { data } = await usersApi.list({ limit: 200 });
      return (data as { data: { items: UserOption[] } }).data?.items ?? [];
    },
  });

  const { data: schedules = [] } = useQuery<ScheduleRecord[]>({
    queryKey: ['operations', 'schedules', projectId],
    enabled: open,
    queryFn: async () => {
      const { data } = await operationsApi.listSchedules(projectId);
      return (data as { data: ScheduleRecord[] }).data;
    },
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'NOT_STARTED',
      lookaheadStatus: 'PLANNED',
      priority: 'MEDIUM',
      readyForExecution: false,
      category: 'OTHER',
      progressPercent: 0,
      laborRequirementStatus: 'PENDING',
      materialsRequirementStatus: 'PENDING',
      equipmentRequirementStatus: 'PENDING',
      requiresApproval: false,
    },
  });

  const watchStatus = watch('status');
  const watchLookaheadStatus = watch('lookaheadStatus');
  const watchReadyForExecution = watch('readyForExecution');
  const watchRequiresApproval = watch('requiresApproval');

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
        lookaheadStatus: activity.lookaheadStatus,
        priority: activity.priority,
        readyForExecution: activity.readyForExecution,
        missingRequirements: activity.missingRequirements ?? '',
        progressPercent: activity.progressPercent,
        plannedStart: toDateInput(activity.plannedStart),
        plannedEnd: toDateInput(activity.plannedEnd),
        actualStart: toDateInput(activity.actualStart),
        actualEnd: toDateInput(activity.actualEnd),
        blockerReason: activity.blockerReason ?? '',
        requiredLabor: activity.requiredLabor ?? '',
        laborRequirementStatus: activity.laborRequirementStatus ?? 'PENDING',
        laborRequirementNotes: activity.laborRequirementNotes ?? '',
        requiredMaterials: activity.requiredMaterials ?? '',
        materialsRequirementStatus: activity.materialsRequirementStatus ?? 'PENDING',
        materialsRequirementNotes: activity.materialsRequirementNotes ?? '',
        requiredEquipment: activity.requiredEquipment ?? '',
        equipmentRequirementStatus: activity.equipmentRequirementStatus ?? 'PENDING',
        equipmentRequirementNotes: activity.equipmentRequirementNotes ?? '',
        expectedCost: activity.expectedCost ?? undefined,
        actualCost: activity.actualCost ?? undefined,
        responsibleUserId: activity.responsibleUserId ?? '',
        requiresApproval: activity.requiresApproval,
        scheduleId: activity.scheduleId ?? '',
        notes: activity.notes ?? '',
      });
    } else {
      reset({
        code: '',
        nameAr: '',
        nameEn: '',
        category: 'OTHER',
        location: '',
        status: 'NOT_STARTED',
        lookaheadStatus: 'PLANNED',
        priority: 'MEDIUM',
        readyForExecution: false,
        missingRequirements: '',
        progressPercent: 0,
        plannedStart: '',
        plannedEnd: '',
        actualStart: '',
        actualEnd: '',
        blockerReason: '',
        requiredLabor: '',
        laborRequirementStatus: 'PENDING',
        laborRequirementNotes: '',
        requiredMaterials: '',
        materialsRequirementStatus: 'PENDING',
        materialsRequirementNotes: '',
        requiredEquipment: '',
        equipmentRequirementStatus: 'PENDING',
        equipmentRequirementNotes: '',
        expectedCost: undefined,
        actualCost: undefined,
        responsibleUserId: '',
        requiresApproval: false,
        scheduleId: '',
        notes: '',
      });
    }
  }, [open, activity, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {
      nameAr: values.nameAr,
      status: values.status,
      lookaheadStatus: values.lookaheadStatus,
      priority: values.priority,
      readyForExecution: values.readyForExecution ?? false,
      category: values.category || 'OTHER',
      progressPercent: values.progressPercent ?? 0,
      requiresApproval: values.requiresApproval ?? false,
      laborRequirementStatus: values.laborRequirementStatus,
      materialsRequirementStatus: values.materialsRequirementStatus,
      equipmentRequirementStatus: values.equipmentRequirementStatus,
    };

    if (values.code) payload.code = values.code;
    if (values.nameEn) payload.nameEn = values.nameEn;
    else if (isEdit) payload.nameEn = '';
    if (values.location) payload.location = values.location;
    else if (isEdit) payload.location = '';
    if (values.plannedStart) payload.plannedStart = values.plannedStart;
    else if (isEdit) payload.plannedStart = '';
    if (values.plannedEnd) payload.plannedEnd = values.plannedEnd;
    else if (isEdit) payload.plannedEnd = '';
    if (values.actualStart) payload.actualStart = values.actualStart;
    else if (isEdit) payload.actualStart = '';
    if (values.actualEnd) payload.actualEnd = values.actualEnd;
    else if (isEdit) payload.actualEnd = '';
    if (values.blockerReason) payload.blockerReason = values.blockerReason;
    else if (isEdit) payload.blockerReason = '';
    if (values.missingRequirements) payload.missingRequirements = values.missingRequirements;
    else if (isEdit) payload.missingRequirements = '';
    if (values.requiredLabor) payload.requiredLabor = values.requiredLabor;
    else if (isEdit) payload.requiredLabor = '';
    if (values.laborRequirementNotes) payload.laborRequirementNotes = values.laborRequirementNotes;
    else if (isEdit) payload.laborRequirementNotes = '';
    if (values.requiredMaterials) payload.requiredMaterials = values.requiredMaterials;
    else if (isEdit) payload.requiredMaterials = '';
    if (values.materialsRequirementNotes) payload.materialsRequirementNotes = values.materialsRequirementNotes;
    else if (isEdit) payload.materialsRequirementNotes = '';
    if (values.requiredEquipment) payload.requiredEquipment = values.requiredEquipment;
    else if (isEdit) payload.requiredEquipment = '';
    if (values.equipmentRequirementNotes) payload.equipmentRequirementNotes = values.equipmentRequirementNotes;
    else if (isEdit) payload.equipmentRequirementNotes = '';
    if (values.expectedCost !== undefined && !Number.isNaN(values.expectedCost))
      payload.expectedCost = values.expectedCost;
    else if (isEdit) payload.expectedCost = null;
    if (values.actualCost !== undefined && !Number.isNaN(values.actualCost))
      payload.actualCost = values.actualCost;
    else if (isEdit) payload.actualCost = null;
    if (values.responsibleUserId) payload.responsibleUserId = values.responsibleUserId;
    else if (isEdit) payload.responsibleUserId = '';
    if (values.scheduleId) payload.scheduleId = values.scheduleId;
    else if (isEdit) payload.scheduleId = '';
    if (values.notes) payload.notes = values.notes;
    else if (isEdit) payload.notes = '';

    if (isEdit && activity) {
      await updateMutation.mutateAsync({ activityId: activity.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  });

  const handleDelete = async () => {
    if (!activity || !window.confirm(t('confirmDeleteActivity'))) return;
    await deleteMutation.mutateAsync(activity.id);
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const fieldLabel = 'text-xs font-medium text-text-muted mb-1 block';
  const selectClass =
    'flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 end-0 z-50 w-full max-w-[560px] bg-surface-card border-s border-surface-border shadow-2xl flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
            <div className="flex items-center gap-3">
              {activity && (
                <span className="text-xs font-mono text-text-muted bg-surface-hover px-2 py-0.5 rounded">
                  {activity.code}
                </span>
              )}
              <Dialog.Title className="text-base font-semibold text-text-primary">
                {isEdit ? t('editActivity') : t('newActivity')}
              </Dialog.Title>
              {activity && (
                <Badge variant={STATUS_VARIANT[activity.status]}>
                  {t(`statuses.${activity.status}`)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEdit && canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-surface-hover transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <Dialog.Close className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">

              {/* Section 1: Basic Info */}
              <Section title={t('sections.basic')}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>{t('code')}</label>
                    <Input
                      {...register('code')}
                      placeholder="ACT-001"
                      dir="ltr"
                      disabled={isEdit}
                    />
                    {!isEdit && (
                      <p className="text-xs text-text-muted mt-1">{t('codeHint')}</p>
                    )}
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
                </div>
                <div>
                  <label className={fieldLabel}>{t('nameAr')} *</label>
                  <Input {...register('nameAr')} dir="rtl" />
                  {errors.nameAr && <p className="text-xs text-red-400 mt-1">{errors.nameAr.message}</p>}
                </div>
                <div>
                  <label className={fieldLabel}>{t('nameEn')}</label>
                  <Input {...register('nameEn')} dir="ltr" />
                </div>
                <div>
                  <label className={fieldLabel}>{t('location')}</label>
                  <Input {...register('location')} />
                </div>
              </Section>

              {/* Section 2: Execution */}
              <Section title={t('sections.execution')}>
                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>{t('lookaheadStatus')}</label>
                    <select {...register('lookaheadStatus')} className={selectClass}>
                      {LOOKAHEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>{t(`lookaheadStatuses.${status}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('priority')}</label>
                    <select {...register('priority')} className={selectClass}>
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>{t(`priorities.${priority}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(watchStatus === 'BLOCKED' || watchLookaheadStatus === 'BLOCKED') && (
                  <div>
                    <label className={fieldLabel}>{t('blockerReason')}</label>
                    <Input {...register('blockerReason')} placeholder={t('blockerReasonHint')} />
                  </div>
                )}

                <div className="rounded-xl border border-surface-border bg-navy-900/40 px-4 py-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('readyForExecution')}
                      className="w-4 h-4 rounded border-surface-border bg-surface-card text-brand focus:ring-brand"
                    />
                    {t('readyForExecution')}
                  </label>
                  <p className="text-xs text-text-muted">{t('readyForExecutionHint')}</p>

                  {!watchReadyForExecution && (
                    <div>
                      <label className={fieldLabel}>{t('missingRequirements')}</label>
                      <textarea
                        {...register('missingRequirements')}
                        rows={3}
                        className="field-textarea"
                        placeholder={t('missingRequirementsHint')}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                {isEdit && activity && activity.delayDays > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{t('delayDays')}:</span>
                    <span className="text-xs font-semibold text-amber-400">{formatNumber(activity.delayDays)}</span>
                  </div>
                )}
              </Section>

              {/* Section 3: Requirements */}
              <Section title={t('sections.requirements')} defaultOpen={false}>
                <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-3">
                  <div>
                    <label className={fieldLabel}>{t('requiredLabor')}</label>
                    <Input {...register('requiredLabor')} placeholder="e.g. 2 rebar workers + 1 carpenter" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={fieldLabel}>{t('requirementStatus')}</label>
                      <select {...register('laborRequirementStatus')} className={selectClass}>
                        {REQUIREMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {t(`requirementStatuses.${status}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={fieldLabel}>{t('requirementNotes')}</label>
                      <Input {...register('laborRequirementNotes')} placeholder={t('requirementNotesHint')} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-3">
                  <div>
                    <label className={fieldLabel}>{t('requiredMaterials')}</label>
                    <Input {...register('requiredMaterials')} placeholder="e.g. rebar D16 + concrete C25" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={fieldLabel}>{t('requirementStatus')}</label>
                      <select {...register('materialsRequirementStatus')} className={selectClass}>
                        {REQUIREMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {t(`requirementStatuses.${status}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={fieldLabel}>{t('requirementNotes')}</label>
                      <Input {...register('materialsRequirementNotes')} placeholder={t('requirementNotesHint')} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-3">
                  <div>
                    <label className={fieldLabel}>{t('requiredEquipment')}</label>
                    <Input {...register('requiredEquipment')} placeholder="e.g. crane + vibrator" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={fieldLabel}>{t('requirementStatus')}</label>
                      <select {...register('equipmentRequirementStatus')} className={selectClass}>
                        {REQUIREMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {t(`requirementStatuses.${status}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={fieldLabel}>{t('requirementNotes')}</label>
                      <Input {...register('equipmentRequirementNotes')} placeholder={t('requirementNotesHint')} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>{t('expectedCost')}</label>
                    <Input
                      {...register('expectedCost', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('actualCost')}</label>
                    <Input
                      {...register('actualCost', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      dir="ltr"
                    />
                  </div>
                </div>

                {isEdit && activity && (
                  <div className="rounded-xl border border-surface-border bg-navy-900/40 px-4 py-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={COST_HEALTH_VARIANT[activity.costHealth]}>
                        {t(`costHealthStatuses.${activity.costHealth}`)}
                      </Badge>
                      <Badge variant={COST_TIMING_VARIANT[activity.costTimingStatus]}>
                        {t(`costTimingStatuses.${activity.costTimingStatus}`)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-text-muted">
                      <div>
                        <span className="block">{t('costVariance')}</span>
                        <span className="mt-1 block text-sm font-semibold text-text-primary" dir="ltr">
                          {formatCurrency(activity.costVarianceAmount ?? 0, 'SAR')}
                        </span>
                      </div>
                      <div>
                        <span className="block">{t('costVariancePercent')}</span>
                        <span className="mt-1 block text-sm font-semibold text-text-primary" dir="ltr">
                          {formatPercent(activity.costVariancePercent ?? 0, 2)}
                        </span>
                      </div>
                    </div>
                    {activity.costAffectedByProcurement && (
                      <p className="text-xs text-amber-300">
                        {t('costAffectedByProcurement')}
                      </p>
                    )}
                  </div>
                )}
              </Section>

              {/* Section 4: Management */}
              <Section title={t('sections.management')} defaultOpen={false}>
                <div>
                  <label className={fieldLabel}>{t('responsibleUser')}</label>
                  <select {...register('responsibleUserId')} className={selectClass}>
                    <option value="">—</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.nameAr} ({u.email})</option>
                    ))}
                  </select>
                </div>

                {schedules.length > 0 && (
                  <div>
                    <label className={fieldLabel}>{t('linkToSchedule')}</label>
                    <select {...register('scheduleId')} className={selectClass}>
                      <option value="">—</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {t(`months.${s.month}`)} {formatNumber(s.year)}{s.title ? ` — ${formatText(s.title)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={fieldLabel}>{t('notes')}</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="flex w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresApproval"
                    {...register('requiresApproval')}
                    className="w-4 h-4 rounded border-surface-border bg-surface-card text-brand focus:ring-brand"
                  />
                  <label htmlFor="requiresApproval" className="text-sm text-text-primary cursor-pointer">
                    {t('requiresApproval')}
                  </label>
                </div>

                {isEdit && activity && watchRequiresApproval && (
                  <div className="pt-2 border-t border-surface-border">
                    <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">
                      {t('approvalDecision')}
                    </p>
                    <ApprovalPanel
                      activity={activity}
                      projectId={projectId}
                      canApprove={canApprove}
                    />
                  </div>
                )}
              </Section>
            </div>
          </form>

          {/* Footer */}
          {canEdit && (
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-border flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {tc('cancel')}
              </Button>
              <Button type="button" onClick={onSubmit} disabled={isLoading}>
                {isLoading ? tc('loading') : tc('save')}
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
