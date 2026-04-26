'use client';

import { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  PanelsTopLeft,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/auth.store';
import {
  MISSING_VALUE,
  formatCompactNumber,
  formatCurrency,
  formatDateWithEnglishDigits,
  formatNumber,
  formatText,
} from '@/lib/utils';
import {
  useUpdateActivity,
  useWeeklyLookahead,
  type ActivityRecord,
  type LookaheadPriority,
  type LookaheadStatus,
  type WeeklyLookaheadFilters,
} from '@/hooks/useOperations';
import { ActivityDrawer } from './ActivityDrawer';

type ViewMode = 'board' | 'list';

const LOOKAHEAD_COLUMNS: LookaheadStatus[] = [
  'PLANNED',
  'READY',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
];

const STATUS_BADGE: Record<
  LookaheadStatus,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  PLANNED: 'muted',
  READY: 'success',
  IN_PROGRESS: 'default',
  BLOCKED: 'danger',
  DONE: 'warning',
};

const PRIORITY_BADGE: Record<
  LookaheadPriority,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  LOW: 'muted',
  MEDIUM: 'default',
  HIGH: 'warning',
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatRange(start: string | null, end: string | null, locale: string) {
  const format = (value: string) =>
    formatDateWithEnglishDigits(value, locale, {
      month: 'short',
      day: 'numeric',
    });

  if (!start && !end) return MISSING_VALUE;
  if (start && end) {
    return `${format(start)} - ${format(end)}`;
  }
  return format(start ?? end!);
}

function formatCost(value: number | null) {
  return formatCurrency(value, 'SAR');
}

function shiftDateValue(value: string | null, delta: number) {
  if (!value) return null;
  const shifted = parseDateValue(value);
  shifted.setDate(shifted.getDate() + delta);
  return toYMD(shifted);
}

function LookaheadCard({
  activity,
  locale,
  canUpdate,
  onOpen,
  onQuickStatus,
  onShiftDate,
  disabled,
}: {
  activity: ActivityRecord;
  locale: string;
  canUpdate: boolean;
  onOpen: () => void;
  onQuickStatus: (activity: ActivityRecord, status: LookaheadStatus) => void;
  onShiftDate: (activity: ActivityRecord, delta: number) => void;
  disabled: boolean;
}) {
  const t = useTranslations('operations');

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-text-muted">{activity.code}</span>
            <Badge variant={PRIORITY_BADGE[activity.priority]}>
              {t(`priorities.${activity.priority}`)}
            </Badge>
            {activity.delayDays > 0 && (
              <span className="text-[11px] text-amber-400">
                +{formatNumber(activity.delayDays)} {t('delayDaysShort')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="mt-1 text-start text-sm font-semibold text-text-primary hover:text-brand transition-colors"
          >
            {formatText(activity.nameAr)}
          </button>
          {activity.nameEn && (
            <p className="text-[11px] text-text-muted mt-0.5">{formatText(activity.nameEn)}</p>
          )}
        </div>
        <Badge variant={STATUS_BADGE[activity.lookaheadStatus]}>
          {t(`lookaheadStatuses.${activity.lookaheadStatus}`)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-text-muted">
        <div>{t(`categories.${activity.category}`)}</div>
        <div className="text-end">{formatText(activity.location)}</div>
        <div>{activity.responsibleUser?.nameAr ? formatText(activity.responsibleUser.nameAr) : t('unassigned')}</div>
        <div className="text-end" dir="ltr">
          {formatRange(activity.plannedStart, activity.plannedEnd, locale)}
        </div>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-text-muted">{t('costColumn')}</span>
          <span className="font-semibold text-text-primary" dir="ltr">
            {formatCost(activity.expectedCost)} / {formatCost(activity.actualCost)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={activity.costHealth === 'OVER' ? 'danger' : activity.costHealth === 'ON_TRACK' ? 'success' : activity.costHealth === 'AT_RISK' ? 'warning' : 'muted'}>
            {t(`costHealthStatuses.${activity.costHealth}`)}
          </Badge>
          {activity.costTimingStatus !== 'NONE' && (
            <Badge variant={activity.costTimingStatus === 'BLOCKED' ? 'danger' : 'warning'}>
              {t(`costTimingStatuses.${activity.costTimingStatus}`)}
            </Badge>
          )}
        </div>
      </div>

      {activity.readyForExecution ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
          {t('readyState.ready')}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <p className="font-medium">{t('readyState.missing')}</p>
          {activity.missingRequirements && (
            <p className="mt-1 whitespace-pre-wrap">{formatText(activity.missingRequirements)}</p>
          )}
        </div>
      )}

      {activity.lookaheadStatus === 'BLOCKED' && activity.blockerReason && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300 whitespace-pre-wrap">
          {formatText(activity.blockerReason)}
        </div>
      )}

      {activity.notes && (
        <p className="text-[11px] text-text-secondary line-clamp-2 whitespace-pre-wrap">
          {formatText(activity.notes)}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="px-2" onClick={onOpen}>
          {t('details')}
        </Button>

        {canUpdate && (
          <>
            <select
              value={activity.lookaheadStatus}
              onChange={(event) =>
                onQuickStatus(activity, event.target.value as LookaheadStatus)
              }
              className="field-select h-8 text-xs"
              disabled={disabled}
            >
              {LOOKAHEAD_COLUMNS.map((status) => (
                <option key={status} value={status}>
                  {t(`lookaheadStatuses.${status}`)}
                </option>
              ))}
            </select>
            <div className="ms-auto flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => onShiftDate(activity, -1)}
                disabled={disabled || (!activity.plannedStart && !activity.plannedEnd)}
              >
                -1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => onShiftDate(activity, 1)}
                disabled={disabled || (!activity.plannedStart && !activity.plannedEnd)}
              >
                +1
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface WeekViewProps {
  projectId: string;
}

export function WeekView({ projectId }: WeekViewProps) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('operations:update');

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [windowStart, setWindowStart] = useState(() => startOfDay(new Date()));
  const [filters, setFilters] = useState<{
    responsibleUserId: string;
    category: string;
    location: string;
    lookaheadStatus: '' | LookaheadStatus;
  }>({
    responsibleUserId: '',
    category: '',
    location: '',
    lookaheadStatus: '',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityRecord | null>(null);

  const activeFilterCount = [
    filters.responsibleUserId,
    filters.category,
    filters.location,
    filters.lookaheadStatus,
  ].filter(Boolean).length;

  function openFilterModal() {
    setPendingFilters(filters);
    setFilterOpen(true);
  }

  function applyFilters() {
    setFilters(pendingFilters);
    setFilterOpen(false);
  }

  function resetFilters() {
    const empty = { responsibleUserId: '', category: '', location: '', lookaheadStatus: '' as const };
    setPendingFilters(empty);
    setFilters(empty);
    setFilterOpen(false);
  }

  const query: WeeklyLookaheadFilters = {
    windowStart: toYMD(windowStart),
    days: 7,
    responsibleUserId: filters.responsibleUserId || undefined,
    category: filters.category || undefined,
    location: filters.location || undefined,
    lookaheadStatus: filters.lookaheadStatus || undefined,
  };

  const { data, isLoading, isError } = useWeeklyLookahead(projectId, query);
  const updateMutation = useUpdateActivity(projectId);

  const activities = data?.items ?? [];
  const assigneeOptions = Array.from(
    new Map(
      activities
        .filter((item) => item.responsibleUser)
        .map((item) => [item.responsibleUser!.id, item.responsibleUser!.nameAr]),
    ).entries(),
  ).map(([id, name]) => ({ id, name }));
  const categoryOptions = Array.from(new Set(activities.map((item) => item.category)));
  const locationOptions = Array.from(
    new Set(activities.map((item) => item.location).filter(Boolean) as string[]),
  );

  const handleQuickStatus = async (
    activity: ActivityRecord,
    lookaheadStatus: LookaheadStatus,
  ) => {
    await updateMutation.mutateAsync({
      activityId: activity.id,
      data: { lookaheadStatus },
    });
  };

  const handleShiftDate = async (activity: ActivityRecord, delta: number) => {
    await updateMutation.mutateAsync({
      activityId: activity.id,
      data: {
        plannedStart: shiftDateValue(activity.plannedStart, delta),
        plannedEnd: shiftDateValue(activity.plannedEnd, delta),
      },
    });
  };

  const openDrawer = (activity: ActivityRecord) => {
    setSelected(activity);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-text-muted">
            <CalendarDays className="w-4 h-4" />
            <span className="section-title">{t('lookaheadTitle')}</span>
          </div>
          <h3 className="page-header-title mt-2">{t('lookaheadSubtitle')}</h3>
          <p className="page-header-subtitle">
            {data
              ? `${formatRange(data.windowStart, data.windowEnd, locale)}`
              : t('lookaheadWindowHint')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWindowStart((value) => addDays(value, -7))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWindowStart(startOfDay(new Date()))}
          >
            {t('today')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWindowStart((value) => addDays(value, 7))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative gap-2"
            onClick={openFilterModal}
          >
            <Filter className="w-3.5 h-3.5" />
            {tc('filter')}
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <div className="ms-2 flex rounded-lg border border-surface-border bg-surface-card p-1">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'board'
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <PanelsTopLeft className="w-3.5 h-3.5" />
                {t('viewModes.board')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <List className="w-3.5 h-3.5" />
                {t('viewModes.list')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-text-muted">{t('lookaheadStats.ready')}</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {formatCompactNumber(data?.counts.ready ?? 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">{t('lookaheadStats.blocked')}</p>
          <p className="mt-2 text-2xl font-bold text-red-300">
            {formatCompactNumber(data?.counts.blocked ?? 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">{t('lookaheadStats.missingRequirements')}</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">
            {formatCompactNumber(data?.counts.missingRequirements ?? 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">{t('lookaheadStats.highPriority')}</p>
          <p className="mt-2 text-2xl font-bold text-brand-300">
            {formatCompactNumber(data?.counts.highPriority ?? 0)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
          <p>{tc('loading')}</p>
        </div>
      ) : isError ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CalendarDays className="w-5 h-5 text-red-300" />
          </div>
          <p>{t('errors.lookahead')}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <CalendarDays className="w-5 h-5 text-text-muted" />
          </div>
          <p>{t('emptyLookahead')}</p>
        </div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {LOOKAHEAD_COLUMNS.map((status) => {
            const columnItems = activities.filter((item) => item.lookaheadStatus === status);
            return (
              <div
                key={status}
                className={`rounded-2xl border p-3 ${
                  status === 'BLOCKED'
                    ? 'border-red-500/25 bg-red-500/5'
                    : 'border-surface-border bg-surface-card'
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge variant={STATUS_BADGE[status]}>
                    {t(`lookaheadStatuses.${status}`)}
                  </Badge>
                  <span className="text-xs text-text-muted">{formatNumber(columnItems.length)}</span>
                </div>

                <div className="space-y-3">
                  {columnItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-surface-border px-3 py-5 text-center text-xs text-text-muted">
                      {t('emptyColumn')}
                    </div>
                  ) : (
                    columnItems.map((activity) => (
                      <LookaheadCard
                        key={activity.id}
                        activity={activity}
                        locale={locale}
                        canUpdate={canUpdate}
                        onOpen={() => openDrawer(activity)}
                        onQuickStatus={handleQuickStatus}
                        onShiftDate={handleShiftDate}
                        disabled={updateMutation.isPending}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <LookaheadCard
              key={activity.id}
              activity={activity}
              locale={locale}
              canUpdate={canUpdate}
              onOpen={() => openDrawer(activity)}
              onQuickStatus={handleQuickStatus}
              onShiftDate={handleShiftDate}
              disabled={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      <ActivityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projectId={projectId}
        activity={selected}
      />

      <Modal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title={t('filtersTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="field-label">{t('filters.assignee')}</label>
            <select
              value={pendingFilters.responsibleUserId}
              onChange={(e) => setPendingFilters((f) => ({ ...f, responsibleUserId: e.target.value }))}
              className="field-select"
            >
              <option value="">{t('filters.assignee')}</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('filters.category')}</label>
            <select
              value={pendingFilters.category}
              onChange={(e) => setPendingFilters((f) => ({ ...f, category: e.target.value }))}
              className="field-select"
            >
              <option value="">{t('filters.category')}</option>
              {categoryOptions.map((value) => (
                <option key={value} value={value}>{t(`categories.${value}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('filters.location')}</label>
            <select
              value={pendingFilters.location}
              onChange={(e) => setPendingFilters((f) => ({ ...f, location: e.target.value }))}
              className="field-select"
            >
              <option value="">{t('filters.location')}</option>
              {locationOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('filters.status')}</label>
            <select
              value={pendingFilters.lookaheadStatus}
              onChange={(e) => setPendingFilters((f) => ({ ...f, lookaheadStatus: e.target.value as '' | LookaheadStatus }))}
              className="field-select"
            >
              <option value="">{t('filters.status')}</option>
              {LOOKAHEAD_COLUMNS.map((status) => (
                <option key={status} value={status}>{t(`lookaheadStatuses.${status}`)}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              {tc('reset')}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setFilterOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button type="button" onClick={applyFilters}>
                {tc('apply')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
