'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PackageCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { formatCompactNumber, formatCurrency, formatNumber, formatText } from '@/lib/utils';
import {
  useProcurementReadiness,
  useUpdateProcurementRequirement,
  type ActivityRecord,
  type ProcurementReadinessFilters,
  type ProcurementRequirementType,
  type RequirementReadinessStatus,
} from '@/hooks/useOperations';

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
const REQUIREMENT_STATUSES: RequirementReadinessStatus[] = [
  'PENDING',
  'REQUESTED',
  'PARTIALLY_AVAILABLE',
  'AVAILABLE',
  'BLOCKED',
];

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

function RequirementRow({
  projectId,
  activity,
  requirementType,
  canUpdate,
}: {
  projectId: string;
  activity: ActivityRecord;
  requirementType: ProcurementRequirementType;
  canUpdate: boolean;
}) {
  const to = useTranslations('operations');
  const mutation = useUpdateProcurementRequirement(projectId);
  const requirement = activity.requirements.find(
    (item) => item.procurementLinked && item.type === requirementType,
  );

  if (!requirement) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="muted">{to(`requirementTypes.${requirement.type}`)}</Badge>
            <Badge variant={REQUIREMENT_VARIANT[requirement.status]}>
              {to(`requirementStatuses.${requirement.status}`)}
            </Badge>
          </div>
          <p className="mt-2 text-sm font-medium text-text-primary">{formatText(requirement.value)}</p>
          {requirement.notes && (
            <p className="mt-1 text-xs text-text-muted whitespace-pre-wrap">{formatText(requirement.notes)}</p>
          )}
        </div>
        {canUpdate && (
          <select
            value={requirement.status}
            onChange={(event) =>
              mutation.mutate({
                activityId: activity.id,
                requirementType,
                status: event.target.value as RequirementReadinessStatus,
                notes: requirement.notes ?? undefined,
              })
            }
            className="field-select min-w-[180px]"
            disabled={mutation.isPending}
          >
            {REQUIREMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {to(`requirementStatuses.${status}`)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function ActivityCard({
  projectId,
  activity,
  canUpdate,
}: {
  projectId: string;
  activity: ActivityRecord;
  canUpdate: boolean;
}) {
  const t = useTranslations('procurement');
  const to = useTranslations('operations');

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-text-muted">{activity.code}</span>
            <Badge variant={REQUIREMENT_VARIANT[activity.procurementReadinessStatus ?? 'PENDING']}>
              {to(
                `requirementStatuses.${activity.procurementReadinessStatus ?? 'PENDING'}`,
              )}
            </Badge>
            {activity.procurementBlocked && (
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
          <p className="mt-1">{activity.responsibleUser?.nameAr ? formatText(activity.responsibleUser.nameAr) : to('unassigned')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {REQUIREMENT_TYPES.map((type) => (
          <RequirementRow
            key={type}
            projectId={projectId}
            activity={activity}
            requirementType={type}
            canUpdate={canUpdate}
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

      {activity.procurementBlockedItems.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <p className="font-medium">{t('blockedHint')}</p>
          <p className="mt-1">{activity.procurementBlockedItems.map((item) => formatText(item)).join(' | ')}</p>
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
  const canUpdate = hasPermission('procurement:update');

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProcurementReadinessFilters>({
    page: 1,
    limit: PAGE_SIZE,
  });

  const query: ProcurementReadinessFilters = {
    ...filters,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError } = useProcurementReadiness(
    canView ? projectId : null,
    query,
  );

  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-text-muted">
        {t('noAccess')}
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
            {REQUIREMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {to(`requirementStatuses.${status}`)}
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
                canUpdate={canUpdate}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3">
            <p className="text-xs text-text-muted">
              {tc('page')} {formatNumber(data?.page ?? 1)} {tc('of')} {formatNumber(data?.totalPages ?? 1)}
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
