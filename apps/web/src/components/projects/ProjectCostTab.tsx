'use client';

import { BarChart3, Clock3, TrendingDown, TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { useProjectCostSummary } from '@/hooks/useOperations';
import { useAuthStore } from '@/store/auth.store';
import {
  formatCurrency,
  formatDateWithEnglishDigits,
  formatNumber,
} from '@/lib/utils';

function formatNullableCurrency(value: number | null, currency: string) {
  return formatCurrency(value, currency);
}

function SummaryCard({
  label,
  value,
  accent = 'text-text-primary',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`} dir="ltr">
        {value}
      </p>
    </div>
  );
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary" dir="ltr">
        {value}
      </p>
    </div>
  );
}

function BarList({
  title,
  items,
  formatValue,
}: {
  title: string;
  items: Array<{ key: string; label: string; value: number; count: number }>;
  formatValue: (value: number) => string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-center gap-2 text-text-muted">
        <BarChart3 className="h-4 w-4" />
        <p className="text-sm font-semibold text-text-primary">{title}</p>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-primary">{item.label}</span>
              <span className="text-xs text-text-muted" dir="ltr">
                {formatValue(item.value)} · {formatNumber(item.count)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProjectCostTabProps {
  projectId: string;
}

export function ProjectCostTab({ projectId }: ProjectCostTabProps) {
  const t = useTranslations('costControl');
  const tp = useTranslations('projects');
  const to = useTranslations('operations');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { hasPermission } = useAuthStore();
  const canView = hasPermission('cost:view');
  const { data, isLoading, isError } = useProjectCostSummary(canView ? projectId : null);

  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-sm text-text-muted">
        {t('noAccess')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="empty-state card">
        <div className="empty-state-icon">
          <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
        <p>{tc('loading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="empty-state card">
        <div className="empty-state-icon">
          <TrendingUp className="h-5 w-5 text-red-300" />
        </div>
        <p>{tc('error')}</p>
      </div>
    );
  }

  const statusItems = data.byStatus.map((item) => ({
    key: item.key,
    label: to(`statuses.${item.key}`),
    value: item.expectedCost,
    count: item.count,
  }));
  const categoryItems = data.byCategory.map((item) => ({
    key: item.key,
    label: to(`categories.${item.key}`),
    value: item.expectedCost,
    count: item.count,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-text-muted">
            <TrendingUp className="h-4 w-4" />
            <span className="section-title">{tp('tabs.costControl.title')}</span>
          </div>
          <h3 className="page-header-title mt-2">{t('subtitle')}</h3>
          <p className="page-header-subtitle">{t('hint')}</p>
        </div>
        <Badge variant="muted">
          {t('trackedActivities', { count: formatNumber(data.counts.withExpectedCost) })}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <SummaryCard
          label={t('cards.expectedCost')}
          value={formatCurrency(data.totals.expectedCost, data.currency)}
        />
        <SummaryCard
          label={t('cards.actualCost')}
          value={formatCurrency(data.totals.actualCost, data.currency)}
          accent="text-emerald-400"
        />
        <SummaryCard
          label={t('cards.variance')}
          value={formatCurrency(data.totals.varianceAmount, data.currency)}
          accent={data.totals.varianceAmount > 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <SummaryCard
          label={t('cards.blockedExposure')}
          value={formatCurrency(data.totals.blockedExposure, data.currency)}
          accent="text-amber-400"
        />
        <SummaryCard
          label={t('cards.upcomingWeek')}
          value={formatCurrency(data.totals.upcomingWeekExpectedCost, data.currency)}
          accent="text-brand"
        />
        <SummaryCard
          label={t('cards.upcomingMonth')}
          value={formatCurrency(data.totals.upcomingMonthExpectedCost, data.currency)}
          accent="text-brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricPill
          label={t('metrics.inProgressExpected')}
          value={formatCurrency(data.totals.inProgressExpectedCost, data.currency)}
        />
        <MetricPill
          label={t('metrics.procurementAffected')}
          value={formatCurrency(data.totals.procurementAffectedExposure, data.currency)}
        />
        <MetricPill
          label={t('metrics.withActualCost')}
          value={formatNumber(data.counts.withActualCost)}
        />
        <MetricPill
          label={t('metrics.withoutExpectedCost')}
          value={formatNumber(data.counts.withoutExpectedCost)}
        />
        <MetricPill
          label={t('metrics.blockedByProcurement')}
          value={formatNumber(data.counts.blockedByProcurement)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BarList
          title={t('sections.byStatus')}
          items={statusItems}
          formatValue={(value) => formatCurrency(value, data.currency)}
        />
        <BarList
          title={t('sections.byCategory')}
          items={categoryItems}
          formatValue={(value) => formatCurrency(value, data.currency)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Clock3 className="h-4 w-4" />
            <p className="text-sm font-semibold text-text-primary">{t('sections.weeklyForecast')}</p>
          </div>
          <div className="mt-4 space-y-3">
            {data.forecast.weekly.map((bucket) => (
              <div key={bucket.index} className="rounded-lg border border-surface-border px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-primary">
                    {formatDateWithEnglishDigits(bucket.startDate, locale, {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    -{' '}
                    {formatDateWithEnglishDigits(bucket.endDate, locale, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-text-muted" dir="ltr">
                    {formatCurrency(bucket.expectedCost, data.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {t('activityCount', { count: formatNumber(bucket.activityCount) })}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Clock3 className="h-4 w-4" />
            <p className="text-sm font-semibold text-text-primary">{t('sections.monthlyForecast')}</p>
          </div>
          <div className="mt-4 space-y-3">
            {data.forecast.monthly.map((bucket) => (
              <div key={bucket.index} className="rounded-lg border border-surface-border px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-primary">
                    {formatDateWithEnglishDigits(bucket.startDate, locale, {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                  <span className="text-xs text-text-muted" dir="ltr">
                    {formatCurrency(bucket.expectedCost, data.currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {t('activityCount', { count: formatNumber(bucket.activityCount) })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-4">
        <div className="flex items-center gap-2 text-text-muted">
          <TrendingDown className="h-4 w-4" />
          <p className="text-sm font-semibold text-text-primary">{t('sections.topRisks')}</p>
        </div>

        {data.topRiskActivities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-text-muted mt-4">
            {t('noRisks')}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topRiskActivities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-surface-border bg-navy-900/30 px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-text-muted">{activity.code}</span>
                      <Badge variant={activity.costTimingStatus === 'BLOCKED' ? 'danger' : activity.costHealth === 'OVER' ? 'danger' : 'warning'}>
                        {activity.costTimingStatus === 'BLOCKED'
                          ? to(`costTimingStatuses.${activity.costTimingStatus}`)
                          : to(`costHealthStatuses.${activity.costHealth}`)}
                      </Badge>
                      <Badge variant="muted">{to(`statuses.${activity.status}`)}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{activity.nameAr}</p>
                    {activity.procurementBlockedItems.length > 0 && (
                      <p className="mt-1 text-xs text-amber-300">
                        {activity.procurementBlockedItems.join(' | ')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs lg:min-w-[220px]">
                    <div>
                      <p className="text-text-muted">{to('expectedCost')}</p>
                      <p className="mt-1 font-semibold text-text-primary" dir="ltr">
                        {formatNullableCurrency(activity.expectedCost, data.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">{to('actualCost')}</p>
                      <p className="mt-1 font-semibold text-text-primary" dir="ltr">
                        {formatNullableCurrency(activity.actualCost, data.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
