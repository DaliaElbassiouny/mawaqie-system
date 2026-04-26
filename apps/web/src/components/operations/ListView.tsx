'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import {
  formatCurrency,
  formatDateWithEnglishDigits,
  formatNumber,
  formatPercent,
  formatText,
} from '@/lib/utils';
import {
  useActivities,
  type ActivityRecord,
  type ActivityCostHealth,
  type ActivityStatus,
  type ApprovalStatus,
  type ActivityFilters,
  type CostTimingStatus,
  type RequirementReadinessStatus,
} from '@/hooks/useOperations';
import { ActivityDrawer } from './ActivityDrawer';

const PAGE_SIZE = 12;

const CATEGORIES = [
  'CIVIL',
  'MECHANICAL',
  'ELECTRICAL',
  'FINISHING',
  'PROCUREMENT',
  'ADMIN',
  'HSE',
  'OTHER',
] as const;

const STATUSES: ActivityStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'DELAYED',
  'BLOCKED',
];

const STATUS_VARIANT: Record<
  ActivityStatus,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  NOT_STARTED: 'muted',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  DELAYED: 'warning',
  BLOCKED: 'danger',
};

const APPROVAL_VARIANT: Record<
  ApprovalStatus,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  NOT_REQUIRED: 'muted',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

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

function formatCost(value: number | null) {
  return formatCurrency(value, 'SAR');
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full bg-brand transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ReadinessCell({ activity }: { activity: ActivityRecord }) {
  const t = useTranslations('operations');
  const readiness =
    activity.procurementReadinessStatus ??
    activity.requirementReadinessStatus ??
    (activity.readyForExecution ? 'AVAILABLE' : 'PENDING');
  const procurementRequirements = activity.requirements.filter(
    (requirement) => requirement.procurementLinked,
  );

  return (
    <div className="space-y-1">
      <Badge variant={REQUIREMENT_VARIANT[readiness]}>
        {t(`requirementStatuses.${readiness}`)}
      </Badge>
      {activity.procurementBlocked && (
        <p className="text-[11px] text-red-400">{t('procurementBlocked')}</p>
      )}
      {procurementRequirements.length > 0 && (
        <p className="text-[11px] text-text-muted">
          {procurementRequirements.map((requirement) => t(`requirementTypes.${requirement.type}`)).join(' / ')}
        </p>
      )}
    </div>
  );
}

function CostCell({ activity }: { activity: ActivityRecord }) {
  const t = useTranslations('operations');

  return (
    <div className="space-y-1">
      <div className="text-xs text-text-primary" dir="ltr">
        {formatCost(activity.expectedCost)}
        <span className="mx-1 text-text-muted">/</span>
        {formatCost(activity.actualCost)}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant={COST_HEALTH_VARIANT[activity.costHealth]}>
          {t(`costHealthStatuses.${activity.costHealth}`)}
        </Badge>
        {activity.costTimingStatus !== 'NONE' && (
          <Badge variant={COST_TIMING_VARIANT[activity.costTimingStatus]}>
            {t(`costTimingStatuses.${activity.costTimingStatus}`)}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  onClick,
}: {
  activity: ActivityRecord;
  onClick: () => void;
}) {
  const t = useTranslations('operations');
  const locale = useLocale();

  return (
    <tr
      onClick={onClick}
      className="border-b border-surface-border hover:bg-surface-hover cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-mono text-text-muted">{activity.code}</span>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-text-primary">{formatText(activity.nameAr)}</p>
        {activity.nameEn && (
          <p className="text-xs text-text-secondary">{formatText(activity.nameEn)}</p>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant={STATUS_VARIANT[activity.status]}>
          {t(`statuses.${activity.status}`)}
        </Badge>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <ReadinessCell activity={activity} />
      </td>
      <td className="px-4 py-3 w-32">
        <div className="space-y-1">
          <span className="text-xs text-text-muted">{formatPercent(activity.progressPercent)}</span>
          <ProgressBar value={activity.progressPercent} />
        </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <CostCell activity={activity} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-xs text-text-muted">
        {formatDateWithEnglishDigits(activity.plannedStart, locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-text-secondary">
          {formatText(activity.responsibleUser?.nameAr)}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {activity.approvalStatus !== 'NOT_REQUIRED' && (
          <Badge variant={APPROVAL_VARIANT[activity.approvalStatus]}>
            {t(`approvalStatuses.${activity.approvalStatus}`)}
          </Badge>
        )}
        {activity.delayDays > 0 && (
          <span className="ms-2 text-xs text-amber-400">
            +{formatNumber(activity.delayDays)} {t('delayDaysShort')}
          </span>
        )}
      </td>
    </tr>
  );
}

interface ListViewProps {
  projectId: string;
}

export function ListView({ projectId }: ListViewProps) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('operations:create');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityRecord | null>(null);

  const query: ActivityFilters = {
    ...filters,
    search: search.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError } = useActivities(projectId, query);
  const activities = data?.items ?? [];

  const openNew = () => {
    setSelected(null);
    setDrawerOpen(true);
  };

  const openEdit = (activity: ActivityRecord) => {
    setSelected(activity);
    setDrawerOpen(true);
  };

  const setFilter = (next: Partial<ActivityFilters>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...next }));
  };

  const selectClass =
    'flex h-9 rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={tc('search')}
          className="w-56"
        />
        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilter({ status: (e.target.value as ActivityStatus) || undefined })
          }
          className={selectClass}
        >
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.category ?? ''}
          onChange={(e) => setFilter({ category: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">{t('allCategories')}</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </select>
        <div className="ms-auto">
          {canCreate && (
            <Button type="button" size="sm" className="gap-2" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" />
              {t('newActivity')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <span className="text-sm text-text-muted">{tc('loading')}</span>
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-sm text-red-400">{tc('error')}</div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
          <p className="text-sm text-text-muted">{t('noActivities')}</p>
          {canCreate && (
            <Button type="button" size="sm" className="mt-4 gap-2" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" />
              {t('newActivity')}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-surface-border bg-surface-card">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('code')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('nameAr')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('procurementReadiness')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('progressPercent')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('costColumn')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('plannedStart')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {t('responsibleUser')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {activities.map((activity) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      onClick={() => openEdit(activity)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
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

      <ActivityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projectId={projectId}
        activity={selected}
      />
    </div>
  );
}
