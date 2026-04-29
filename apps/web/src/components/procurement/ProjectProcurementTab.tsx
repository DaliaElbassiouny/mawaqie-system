'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowUpRight, PackageCheck, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { formatCompactNumber, formatCurrency, formatNumber, formatText } from '@/lib/utils';
import {
  useProcurementReadiness,
  type ActivityRecord,
  type LinkedPRSummary,
  type ProcurementReadinessFilters,
  type ProcurementRequirementType,
  type RequirementReadinessStatus,
} from '@/hooks/useOperations';
import { ConvertToPRModal } from './ConvertToPRModal';

const PAGE_SIZE = 10;

const REQUIREMENT_VARIANT: Record<
  RequirementReadinessStatus,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  PENDING: 'muted',
  REQUESTED: 'default',
  PARTIALLY_AVAILABLE: 'warning',
  AVAILABLE: 'success',
  BLOCKED: 'danger',
};

const REQUIREMENT_TYPES: ProcurementRequirementType[] = ['MATERIALS', 'EQUIPMENT'];
const FILTER_STATUSES: RequirementReadinessStatus[] = [
  'PENDING',
  'REQUESTED',
  'PARTIALLY_AVAILABLE',
  'AVAILABLE',
  'BLOCKED',
];

const STATUS_AR: Record<RequirementReadinessStatus, string> = {
  PENDING: 'يحتاج طلب شراء',
  REQUESTED: 'تم تحويله لطلب شراء',
  PARTIALLY_AVAILABLE: 'متوفر جزئيًا',
  AVAILABLE: 'متاح',
  BLOCKED: 'يحتاج طلب شراء',
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? 'text-text-primary'}`} dir="ltr">
        {formatCompactNumber(value)}
      </p>
    </div>
  );
}

interface ConvertTarget {
  activity: ActivityRecord;
  requirementType: ProcurementRequirementType;
  requirementValue: string;
}

function RequirementRow({
  activity,
  requirementType,
  linkedPRs,
  canCreate,
  onConvert,
}: {
  activity: ActivityRecord;
  requirementType: ProcurementRequirementType;
  linkedPRs: LinkedPRSummary[];
  canCreate: boolean;
  onConvert: (target: ConvertTarget) => void;
}) {
  const locale = useLocale();
  const to = useTranslations('operations');

  const requirement = activity.requirements.find(
    (item) => item.procurementLinked && item.type === requirementType,
  );

  if (!requirement) return null;

  // PRs linked to this specific requirement type (or type-agnostic ones)
  const typeLinkedPRs = linkedPRs.filter(
    (pr) => !pr.requirementType || pr.requirementType === requirementType,
  );
  const hasLinkedPR = typeLinkedPRs.length > 0;

  // Displayed status overrides the DB readiness status when a PR is already linked
  const displayStatus = hasLinkedPR ? 'تم تحويله لطلب شراء' : STATUS_AR[requirement.status];
  const displayVariant: 'default' | 'success' | 'warning' | 'danger' | 'muted' = hasLinkedPR
    ? 'success'
    : REQUIREMENT_VARIANT[requirement.status];

  const canConvert =
    canCreate &&
    !hasLinkedPR &&
    (requirement.status === 'PENDING' ||
      requirement.status === 'BLOCKED' ||
      requirement.status === 'PARTIALLY_AVAILABLE');

  const convertLabel =
    requirement.status === 'PARTIALLY_AVAILABLE'
      ? 'تحويل المتبقي إلى طلب شراء'
      : 'تحويل إلى طلب شراء';

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-3 space-y-2">
      {/* Header row: type badge + status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="muted">{to(`requirementTypes.${requirement.type}`)}</Badge>
        <Badge variant={displayVariant}>{displayStatus}</Badge>
      </div>

      {/* Requirement description */}
      <p className="text-sm font-medium text-text-primary">{formatText(requirement.value)}</p>

      {/* Notes — only when no linked PR */}
      {requirement.notes && !hasLinkedPR && (
        <p className="text-xs text-text-muted whitespace-pre-wrap">{formatText(requirement.notes)}</p>
      )}

      {/* Linked PR section */}
      {hasLinkedPR && (
        <div className="space-y-1.5 pt-0.5">
          {typeLinkedPRs.map((pr) => (
            <div key={pr.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">
                طلب الشراء:{' '}
                <span className="font-mono font-semibold text-brand">{pr.prNumber}</span>
              </span>
              <Link
                href={`/${locale}/procurement?requestId=${pr.id}`}
                className="inline-flex items-center gap-1 rounded-md border border-surface-border bg-surface-card px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                عرض طلب الشراء
                <ArrowUpRight className="h-3 w-3 opacity-60" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* AVAILABLE with no linked PR */}
      {!hasLinkedPR && requirement.status === 'AVAILABLE' && (
        <p className="text-xs text-text-muted">لا يحتاج طلب شراء</p>
      )}

      {/* Convert button */}
      {canConvert && (
        <div className="pt-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() =>
              onConvert({ activity, requirementType, requirementValue: requirement.value })
            }
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {convertLabel}
          </Button>
        </div>
      )}

      {/* No-permission hint */}
      {!canCreate && !hasLinkedPR && requirement.status !== 'AVAILABLE' && (
        <p className="text-xs text-text-muted">ليس لديك صلاحية إنشاء طلب شراء</p>
      )}
    </div>
  );
}

function ActivityCard({
  projectId,
  activity,
  canCreate,
  onConvert,
}: {
  projectId: string;
  activity: ActivityRecord;
  canCreate: boolean;
  onConvert: (target: ConvertTarget) => void;
}) {
  const t = useTranslations('procurement');
  const to = useTranslations('operations');
  const linkedPRs = activity.linkedPRs ?? [];

  // Activity-level badge also overrides if any requirement has a linked PR
  const hasAnyLinkedPR = linkedPRs.length > 0;
  const activityStatus = activity.procurementReadinessStatus ?? 'PENDING';
  const activityDisplayVariant = hasAnyLinkedPR
    ? 'success'
    : REQUIREMENT_VARIANT[activityStatus];
  const activityDisplayLabel = hasAnyLinkedPR
    ? 'تم تحويله لطلب شراء'
    : STATUS_AR[activityStatus];

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-text-muted">{activity.code}</span>
            <Badge variant={activityDisplayVariant}>{activityDisplayLabel}</Badge>
            {activity.procurementBlocked && !hasAnyLinkedPR && (
              <Badge variant="danger">{to('procurementBlocked')}</Badge>
            )}
          </div>
          <p className="mt-2 text-base font-semibold text-text-primary">{formatText(activity.nameAr)}</p>
          {activity.nameEn && (
            <p className="text-xs text-text-secondary">{formatText(activity.nameEn)}</p>
          )}
        </div>
        <div className="text-end text-xs text-text-muted">
          <p>{to(`statuses.${activity.status}`)}</p>
          <p className="mt-1">
            {activity.responsibleUser?.nameAr
              ? formatText(activity.responsibleUser.nameAr)
              : to('unassigned')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {REQUIREMENT_TYPES.map((type) => (
          <RequirementRow
            key={type}
            activity={activity}
            requirementType={type}
            linkedPRs={linkedPRs}
            canCreate={canCreate}
            onConvert={onConvert}
          />
        ))}
      </div>

      {(activity.expectedCost !== null || activity.actualCost !== null) && (
        <div className="rounded-lg border border-surface-border bg-navy-900/40 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-muted">{to('costColumn')}</span>
            <span className="font-semibold text-text-primary" dir="ltr">
              {formatCurrency(activity.expectedCost, 'SAR')}
              <span className="mx-1 text-text-muted">/</span>
              {formatCurrency(activity.actualCost, 'SAR')}
            </span>
          </div>
          {activity.costAffectedByProcurement && (
            <p className="mt-2 text-amber-300">{to('costAffectedByProcurement')}</p>
          )}
        </div>
      )}

      {activity.procurementBlockedItems.length > 0 && !hasAnyLinkedPR && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <p className="font-medium">{t('blockedHint')}</p>
          <p className="mt-1">
            {activity.procurementBlockedItems.map((item) => formatText(item)).join(' | ')}
          </p>
        </div>
      )}
    </div>
  );
}

interface ProjectProcurementTabProps {
  projectId: string;
}

export function ProjectProcurementTab({ projectId }: ProjectProcurementTabProps) {
  const t = useTranslations('procurement');
  const to = useTranslations('operations');
  const tc = useTranslations('common');
  const { hasPermission } = useAuthStore();
  const canView = hasPermission('procurement:view');
  const canCreate = hasPermission('procurement:create');

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProcurementReadinessFilters>({
    page: 1,
    limit: PAGE_SIZE,
  });
  const [convertTarget, setConvertTarget] = useState<ConvertTarget | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const query: ProcurementReadinessFilters = {
    ...filters,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch } = useProcurementReadiness(
    canView ? projectId : null,
    query,
  );

  const handleConvertSuccess = async (prNumber: string) => {
    setConvertTarget(null);
    setSuccessMessage(`تم إنشاء طلب الشراء ${prNumber} بنجاح.`);
    await refetch();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-text-muted">
        {t('noAccess')}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {convertTarget && (
        <ConvertToPRModal
          projectId={projectId}
          activity={convertTarget.activity}
          requirementType={convertTarget.requirementType}
          requirementValue={convertTarget.requirementValue}
          onClose={() => setConvertTarget(null)}
          onSuccess={(prNumber) => void handleConvertSuccess(prNumber)}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-text-muted">
            <PackageCheck className="w-4 h-4" />
            <span className="section-title">{t('title')}</span>
          </div>
          <h3 className="page-header-title mt-2">{t('subtitle')}</h3>
          <p className="page-header-subtitle">{t('hint')}</p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t('stats.totalNeeds')} value={data?.summary.totalNeeds ?? 0} />
        <StatCard label={t('stats.pending')} value={data?.summary.pending ?? 0} accent="text-text-muted" />
        <StatCard label={t('stats.requested')} value={data?.summary.requested ?? 0} accent="text-brand" />
        <StatCard label={t('stats.available')} value={data?.summary.available ?? 0} accent="text-emerald-400" />
        <StatCard label={t('stats.blocked')} value={data?.summary.blocked ?? 0} accent="text-red-400" />
      </div>

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            value={filters.search ?? ''}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({
                ...current,
                search: event.target.value || undefined,
              }));
            }}
            placeholder={tc('search')}
          />

          <select
            value={filters.requirementType ?? ''}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({
                ...current,
                requirementType: (event.target.value as ProcurementRequirementType) || undefined,
              }));
            }}
            className="field-select"
          >
            <option value="">{t('allTypes')}</option>
            {REQUIREMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {to(`requirementTypes.${type}`)}
              </option>
            ))}
          </select>

          <select
            value={filters.requirementStatus ?? ''}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({
                ...current,
                requirementStatus:
                  (event.target.value as RequirementReadinessStatus) || undefined,
              }));
            }}
            className="field-select"
          >
            <option value="">{t('allStatuses')}</option>
            {FILTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_AR[status]}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={!!filters.blockedOnly}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({
                  ...current,
                  blockedOnly: event.target.checked || undefined,
                }));
              }}
              className="h-4 w-4 rounded border-surface-border"
            />
            {t('blockedOnly')}
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
          <p>{tc('loading')}</p>
        </div>
      ) : isError ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <PackageCheck className="w-5 h-5 text-red-300" />
          </div>
          <p>{tc('error')}</p>
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-text-muted">
          {t('empty')}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data?.items.map((activity) => (
              <ActivityCard
                key={activity.id}
                projectId={projectId}
                activity={activity}
                canCreate={canCreate}
                onConvert={(target) => setConvertTarget(target)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3">
            <p className="text-xs text-text-muted">
              {tc('page')} {formatNumber(data?.page ?? 1)} {tc('of')}{' '}
              {formatNumber(data?.totalPages ?? 1)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data || data.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {tc('back')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data || data.page >= data.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                {tc('next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
