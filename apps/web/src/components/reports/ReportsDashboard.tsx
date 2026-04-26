'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Filter,
  FolderKanban,
  Printer,
  Receipt,
  RefreshCcw,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';
import { type ReportFilters, useExecutiveSummaryReport } from '@/hooks/useReports';
import {
  countActiveFilters,
  getEnumLabels,
  getReportMeta,
  renderFilterChips,
} from './report-config';
import { ReportFiltersModal } from './ReportFiltersModal';
import {
  BarChartCard,
  DonutChartCard,
  EmptyPanel,
  ErrorPanel,
  KpiCard,
  LineChartCard,
  LoadingPanel,
  MiniInsightList,
  ProgressList,
  SectionCard,
} from './ReportsShared';
import {
  MISSING_VALUE,
  formatCurrencySAR,
  formatDateWithEnglishDigits,
  formatNumber,
  formatPercent,
} from '@/lib/utils';

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDefaultFilters(): ReportFilters {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 29);

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  };
}

export function ReportsDashboard() {
  const t = useTranslations('reportsWorkspace');
  const tc = useTranslations('common');
  const locale = useLocale();
  const labels = getEnumLabels(locale);
  const reportMeta = getReportMeta(t);

  const [filters, setFilters] = useState<ReportFilters>(() => buildDefaultFilters());
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(() => buildDefaultFilters());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = countActiveFilters(filters);
  const { data: projectsData } = useProjects({ page: 1, limit: 100 });
  const dashboardQuery = useExecutiveSummaryReport(filters);

  const chips = useMemo(
    () => renderFilterChips(filters, projectsData?.items ?? [], labels),
    [filters, labels, projectsData?.items],
  );

  const categoryCards = useMemo(() => {
    if (!dashboardQuery.data) return [];

    return [
      {
        report: 'projectStatus' as const,
        metric: formatNumber(dashboardQuery.data.summary.totalProjects),
        note: t('dashboard.cardNotes.projectStatus', {
          count: formatNumber(dashboardQuery.data.summary.delayedProjects),
        }),
      },
      {
        report: 'operations' as const,
        metric: formatNumber(dashboardQuery.data.summary.blockedActivities),
        note: t('dashboard.cardNotes.operations', {
          count: formatNumber(dashboardQuery.data.summary.delayedActivities),
        }),
      },
      {
        report: 'procurement' as const,
        metric:
          dashboardQuery.data.summary.procurementReadiness == null
            ? MISSING_VALUE
            : formatPercent(dashboardQuery.data.summary.procurementReadiness, 0),
        note: t('dashboard.cardNotes.procurement', {
          count: formatNumber(dashboardQuery.data.summary.blockedRequirements),
        }),
      },
      {
        report: 'dailyHistory' as const,
        metric: formatNumber(dashboardQuery.data.summary.dailyReportsCount),
        note: filters.startDate && filters.endDate
          ? `${formatDateWithEnglishDigits(filters.startDate)} - ${formatDateWithEnglishDigits(filters.endDate)}`
          : t('dashboard.defaultPeriod'),
      },
      {
        report: 'costSummary' as const,
        metric: formatCurrencySAR(dashboardQuery.data.summary.totalActualCost),
        note: t('dashboard.cardNotes.costSummary', {
          count: formatCurrencySAR(dashboardQuery.data.summary.totalVariance),
        }),
      },
      {
        report: 'invoices' as const,
        metric: formatNumber(dashboardQuery.data.summary.totalInvoices),
        note: t('dashboard.cardNotes.invoices', {
          count: formatCurrencySAR(dashboardQuery.data.summary.totalInvoicesGross),
        }),
      },
      {
        report: 'extracts' as const,
        metric: formatNumber(dashboardQuery.data.summary.totalExtracts),
        note: t('dashboard.cardNotes.extracts', {
          count: formatCurrencySAR(dashboardQuery.data.summary.totalExtractsAmount),
        }),
      },
    ];
  }, [dashboardQuery.data, filters.endDate, filters.startDate, t]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-surface-border bg-surface-card shadow-card-lg">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-text-muted">
              <BarChart3 className="h-4 w-4" />
              <span className="section-title">{t('dashboard.heroEyebrow')}</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-text-primary">{t('dashboard.heroTitle')}</h1>
              <p className="max-w-3xl text-sm leading-7 text-text-secondary">{t('dashboard.heroSubtitle')}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setDraftFilters(filters); setIsFilterOpen(true); }}>
                <Filter className="h-4 w-4" />
                {t('actions.filters')}
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
                    {formatNumber(activeFilterCount)}
                  </span>
                ) : null}
              </Button>
              <Button variant="outline" onClick={() => setFilters(buildDefaultFilters())}>
                <RefreshCcw className="h-4 w-4" />
                {t('dashboard.restoreDefault')}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {t('actions.print')}
              </Button>
            </div>

            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-surface-border bg-surface-hover px-3 py-1 text-xs text-text-secondary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard
              label={t('dashboard.kpis.totalProjects')}
              value={formatNumber(dashboardQuery.data?.summary.totalProjects)}
              hint={t('dashboard.kpis.totalProjectsHint')}
              accent="brand"
              icon={FolderKanban}
            />
            <KpiCard
              label={t('dashboard.kpis.executionCompletion')}
              value={formatPercent(dashboardQuery.data?.summary.executionCompletion, 0)}
              hint={t('dashboard.kpis.executionCompletionHint')}
              accent="blue"
              icon={Activity}
            />
            <KpiCard
              label={t('dashboard.kpis.procurementReadiness')}
              value={formatPercent(dashboardQuery.data?.summary.procurementReadiness, 0)}
              hint={t('dashboard.kpis.procurementReadinessHint')}
              accent="green"
              icon={ShoppingCart}
            />
            <KpiCard
              label={t('dashboard.kpis.budgetConsumption')}
              value={formatPercent(dashboardQuery.data?.summary.budgetConsumption, 0)}
              hint={t('dashboard.kpis.budgetConsumptionHint')}
              accent="amber"
              icon={Wallet}
            />
          </div>
        </div>
      </div>

      {dashboardQuery.isLoading ? (
        <LoadingPanel label={tc('loading')} />
      ) : dashboardQuery.isError ? (
        <ErrorPanel label={tc('error')} />
      ) : !dashboardQuery.data ? (
        <EmptyPanel title={tc('noData')} description={t('dashboard.empty')} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t('dashboard.kpis.activeProjects')}
              value={formatNumber(dashboardQuery.data.summary.activeProjects)}
              hint={t('dashboard.kpis.activeProjectsHint')}
              accent="green"
              icon={FolderKanban}
            />
            <KpiCard
              label={t('dashboard.kpis.delayedProjects')}
              value={formatNumber(dashboardQuery.data.summary.delayedProjects)}
              hint={t('dashboard.kpis.delayedProjectsHint')}
              accent="amber"
              icon={CalendarDays}
            />
            <KpiCard
              label={t('dashboard.kpis.blockedActivities')}
              value={formatNumber(dashboardQuery.data.summary.blockedActivities)}
              hint={t('dashboard.kpis.blockedActivitiesHint')}
              accent="red"
              icon={ClipboardList}
            />
            <KpiCard
              label={t('dashboard.kpis.dailyReports')}
              value={formatNumber(dashboardQuery.data.summary.dailyReportsCount)}
              hint={t('dashboard.kpis.dailyReportsHint')}
              accent="blue"
              icon={CalendarDays}
            />
            <KpiCard
              label={t('dashboard.kpis.estimatedCost')}
              value={formatCurrencySAR(dashboardQuery.data.summary.totalEstimatedCost)}
              accent="slate"
              icon={Wallet}
            />
            <KpiCard
              label={t('dashboard.kpis.actualCost')}
              value={formatCurrencySAR(dashboardQuery.data.summary.totalActualCost)}
              accent="brand"
              icon={Wallet}
            />
            <KpiCard
              label={t('dashboard.kpis.invoiceGross')}
              value={formatCurrencySAR(dashboardQuery.data.summary.totalInvoicesGross)}
              accent="blue"
              icon={Receipt}
            />
            <KpiCard
              label={t('dashboard.kpis.extractTotal')}
              value={formatCurrencySAR(dashboardQuery.data.summary.totalExtractsAmount)}
              accent="green"
              icon={Receipt}
            />
          </div>

          <SectionCard
            title={t('dashboard.quickAccess')}
            subtitle={t('dashboard.quickAccessSubtitle')}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {categoryCards.map((card) => {
                const meta = reportMeta[card.report];
                const Icon = meta.icon;

                return (
                  <Link
                    key={card.report}
                    href={`/${locale}${meta.href}`}
                    className="group rounded-2xl border border-surface-border bg-surface-hover/25 p-4 transition-all hover:border-brand/30 hover:bg-surface-hover/50 hover:shadow-card-md"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="rounded-xl bg-brand/10 p-2 text-brand">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowLeft className="h-4 w-4 text-text-muted transition-transform group-hover:-translate-x-1" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-text-primary">{meta.title}</p>
                      <p className="text-2xl font-semibold text-text-primary" dir="ltr">
                        {card.metric}
                      </p>
                      <p className="text-xs leading-5 text-text-secondary">{card.note}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <DonutChartCard
              title={t('dashboard.charts.projectsByStatus')}
              subtitle={t('dashboard.charts.projectsByStatusSubtitle')}
              data={dashboardQuery.data.charts.projectsByStatus}
            />
            <DonutChartCard
              title={t('dashboard.charts.procurementByStatus')}
              subtitle={t('dashboard.charts.procurementByStatusSubtitle')}
              data={dashboardQuery.data.charts.procurementByStatus}
            />
            <BarChartCard
              title={t('dashboard.charts.activitiesByStatus')}
              subtitle={t('dashboard.charts.activitiesByStatusSubtitle')}
              data={dashboardQuery.data.charts.activitiesByStatus.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              series={[{ key: 'value', label: t('dashboard.series.activities') }]}
            />
            <BarChartCard
              title={t('dashboard.charts.costByProject')}
              subtitle={t('dashboard.charts.costByProjectSubtitle')}
              data={dashboardQuery.data.charts.costByProject.map((item) => ({
                label: item.projectCode,
                estimated: item.estimated,
                actual: item.actual,
              }))}
              series={[
                { key: 'estimated', label: t('dashboard.series.estimated') },
                { key: 'actual', label: t('dashboard.series.actual'), color: '#2563eb' },
              ]}
            />
            <LineChartCard
              title={t('dashboard.charts.dailyLogsTrend')}
              subtitle={t('dashboard.charts.dailyLogsTrendSubtitle')}
              data={dashboardQuery.data.charts.dailyLogsTrend.map((item) => ({
                label: formatDateWithEnglishDigits(item.date, locale, { month: 'short', day: 'numeric' }),
                count: item.count,
              }))}
              dataKey="count"
            />
            <BarChartCard
              title={t('dashboard.charts.topCostCategories')}
              subtitle={t('dashboard.charts.topCostCategoriesSubtitle')}
              data={dashboardQuery.data.charts.topCostCategories.map((item) => ({
                label: item.category,
                estimated: item.estimated,
                actual: item.actual,
              }))}
              series={[
                { key: 'estimated', label: t('dashboard.series.estimated') },
                { key: 'actual', label: t('dashboard.series.actual'), color: '#10b981' },
              ]}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <ProgressList
              title={t('dashboard.charts.delayedProjects')}
              subtitle={t('dashboard.charts.delayedProjectsSubtitle')}
              items={dashboardQuery.data.charts.delayedProjects.map((item) => ({
                label: `${item.projectCode} - ${item.projectName}`,
                value: item.delayed,
                secondary: item.blocked,
              }))}
              color="bg-amber-500"
            />
            <div className="grid gap-4">
              <DonutChartCard
                title={t('dashboard.charts.invoicesByStatus')}
                data={dashboardQuery.data.charts.invoicesByStatus}
                height={220}
              />
              <DonutChartCard
                title={t('dashboard.charts.extractsByStatus')}
                data={dashboardQuery.data.charts.extractsByStatus}
                height={220}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title={t('dashboard.topProjects')}
              subtitle={t('dashboard.topProjectsSubtitle')}
              action={<Badge variant="outline">{formatNumber(dashboardQuery.data.highlights.topProjects.length)}</Badge>}
            >
              <MiniInsightList
                items={dashboardQuery.data.highlights.topProjects.map((item) => ({
                  label: `${item.projectCode} - ${item.projectName}`,
                  value: item.progress == null ? MISSING_VALUE : formatPercent(item.progress, 0),
                  meta: `${labels[item.status] ?? item.status} | ${t('dashboard.labels.actualCost')}: ${formatCurrencySAR(item.actualCost)}`,
                }))}
              />
            </SectionCard>

            <SectionCard
              title={t('dashboard.riskProjects')}
              subtitle={t('dashboard.riskProjectsSubtitle')}
              action={<Badge variant="danger">{formatNumber(dashboardQuery.data.highlights.riskProjects.length)}</Badge>}
            >
              <MiniInsightList
                accent="red"
                items={dashboardQuery.data.highlights.riskProjects.map((item) => ({
                  label: `${item.projectCode} - ${item.projectName}`,
                  value: `${formatNumber(item.blockedActivities)} / ${formatNumber(item.delayedActivities)}`,
                  meta: `${labels[item.status] ?? item.status} | ${t('dashboard.labels.procurementItems')}: ${formatNumber(item.openProcurementItems)}`,
                }))}
              />
            </SectionCard>
          </div>
        </>
      )}

      <ReportFiltersModal
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        report="dashboard"
        filters={draftFilters}
        setFilters={setDraftFilters}
        onApply={setFilters}
        projects={projectsData?.items ?? []}
        labels={labels}
        t={t}
        tc={tc}
      />
    </div>
  );
}
