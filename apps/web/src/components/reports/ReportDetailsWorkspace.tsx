'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  CalendarRange,
  ClipboardList,
  Download,
  FileSpreadsheet,
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
import {
  type ReportFilters,
  useCostSummaryReport,
  useDailyHistoryReport,
  useExtractReport,
  useInvoiceReport,
  useOperationsReport,
  useProcurementReport,
  useProjectStatusReport,
} from '@/hooks/useReports';
import { downloadCsv, downloadExcel } from '@/lib/export';
import {
  formatCurrencySAR,
  formatDateWithEnglishDigits,
  formatNumber,
  formatPercent,
  formatText,
  MISSING_VALUE,
} from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  buildCsvPayload,
  countActiveFilters,
  getColumns,
  getEnumLabels,
  getReportMeta,
  renderFilterChips,
  type ReportKind,
  REPORT_ORDER,
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
  ReportTable,
  SectionCard,
} from './ReportsShared';

export function ReportDetailsWorkspace({ report }: { report: ReportKind }) {
  const t = useTranslations('reportsWorkspace');
  const tc = useTranslations('common');
  const locale = useLocale();
  const labels = getEnumLabels(locale);
  const reportMeta = getReportMeta(t);
  const ActiveIcon = reportMeta[report].icon;
  const { hasPermission } = useAuthStore();
  const canExport = hasPermission('reports:export');

  const [filters, setFilters] = useState<ReportFilters>({});
  const [draftFilters, setDraftFilters] = useState<ReportFilters>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: projectsData } = useProjects({ page: 1, limit: 100 });

  const projectStatusQuery = useProjectStatusReport(filters, report === 'projectStatus');
  const operationsQuery = useOperationsReport(filters, report === 'operations');
  const procurementQuery = useProcurementReport(filters, report === 'procurement');
  const dailyHistoryQuery = useDailyHistoryReport(filters, report === 'dailyHistory');
  const costSummaryQuery = useCostSummaryReport(filters, report === 'costSummary');
  const invoicesQuery = useInvoiceReport(filters, report === 'invoices');
  const extractsQuery = useExtractReport(filters, report === 'extracts');

  const activeQuery = {
    projectStatus: projectStatusQuery,
    operations: operationsQuery,
    procurement: procurementQuery,
    dailyHistory: dailyHistoryQuery,
    costSummary: costSummaryQuery,
    invoices: invoicesQuery,
    extracts: extractsQuery,
  }[report];

  const activeData = activeQuery.data as any;
  const activeFilterCount = countActiveFilters(filters);
  const chips = renderFilterChips(filters, projectsData?.items ?? [], labels);
  const columns = useMemo(() => getColumns(report, t, labels), [labels, report, t]);

  const summaryMetrics = useMemo(() => {
    if (!activeData) return [];

    switch (report) {
      case 'projectStatus':
        return [
          { label: t('summary.totalProjects'), value: formatNumber(activeData.summary.totalProjects), accent: 'brand', icon: FolderKanban },
          { label: t('dashboard.kpis.activeProjects'), value: formatNumber(activeData.summary.activeProjects), accent: 'green', icon: FolderKanban },
          { label: t('dashboard.kpis.delayedProjects'), value: formatNumber(activeData.summary.delayedProjects), accent: 'amber', icon: CalendarRange },
          {
            label: t('summary.spendingRatio'),
            value: activeData.summary.overallSpendingRatio == null ? MISSING_VALUE : formatPercent(activeData.summary.overallSpendingRatio, 0),
            accent: 'blue',
            icon: Wallet,
          },
        ];
      case 'operations':
        return [
          { label: t('summary.totalActivities'), value: formatNumber(activeData.summary.totalActivities), accent: 'brand', icon: ClipboardList },
          { label: t('summary.inProgressActivities'), value: formatNumber(activeData.summary.inProgressActivities), accent: 'blue', icon: ClipboardList },
          { label: t('summary.delayedActivities'), value: formatNumber(activeData.summary.delayedActivities), accent: 'amber', icon: CalendarRange },
          { label: t('summary.blockedActivities'), value: formatNumber(activeData.summary.blockedActivities), accent: 'red', icon: ClipboardList },
        ];
      case 'procurement':
        return [
          { label: t('summary.totalRequirements'), value: formatNumber(activeData.summary.totalRequirements), accent: 'brand', icon: ShoppingCart },
          { label: t('summary.blockedRequirements'), value: formatNumber(activeData.summary.blockedRequirements), accent: 'red', icon: ShoppingCart },
          { label: t('summary.affectedProjects'), value: formatNumber(activeData.summary.affectedProjects), accent: 'amber', icon: FolderKanban },
          { label: t('summary.blockedActivities'), value: formatNumber(activeData.summary.blockedActivities), accent: 'blue', icon: ClipboardList },
        ];
      case 'dailyHistory':
        return [
          { label: t('summary.totalLogs'), value: formatNumber(activeData.summary.totalLogs), accent: 'brand', icon: CalendarRange },
          { label: t('summary.projectsCovered'), value: formatNumber(activeData.summary.projectsCovered), accent: 'blue', icon: FolderKanban },
          { label: t('summary.logsWithBlockers'), value: formatNumber(activeData.summary.logsWithBlockers), accent: 'amber', icon: ClipboardList },
          { label: t('summary.linkedActivities'), value: formatNumber(activeData.summary.linkedActivityCount), accent: 'green', icon: ClipboardList },
        ];
      case 'costSummary':
        return [
          { label: t('summary.totalProjects'), value: formatNumber(activeData.summary.totalProjects), accent: 'brand', icon: FolderKanban },
          { label: t('summary.estimatedTotal'), value: formatCurrencySAR(activeData.summary.estimatedTotal), accent: 'slate', icon: Wallet },
          { label: t('summary.actualTotal'), value: formatCurrencySAR(activeData.summary.actualTotal), accent: 'blue', icon: Wallet },
          {
            label: t('summary.spendingRatio'),
            value: activeData.summary.spendingRatio == null ? MISSING_VALUE : formatPercent(activeData.summary.spendingRatio, 0),
            accent: 'amber',
            icon: Wallet,
          },
        ];
      case 'invoices':
        return [
          { label: t('summary.totalInvoices'), value: formatNumber(activeData.summary.totalInvoices), accent: 'brand', icon: Receipt },
          { label: t('summary.grossTotal'), value: formatCurrencySAR(activeData.summary.grossTotal), accent: 'blue', icon: Receipt },
          { label: t('summary.approvedCount'), value: formatNumber(activeData.summary.approvedCount), accent: 'amber', icon: Receipt },
          { label: t('summary.paidCount'), value: formatNumber(activeData.summary.paidCount), accent: 'green', icon: Receipt },
        ];
      case 'extracts':
        return [
          { label: t('summary.totalExtracts'), value: formatNumber(activeData.summary.totalExtracts), accent: 'brand', icon: FileSpreadsheet },
          { label: t('summary.totalAmount'), value: formatCurrencySAR(activeData.summary.totalAmount), accent: 'blue', icon: FileSpreadsheet },
          { label: t('summary.approvedCount'), value: formatNumber(activeData.summary.approvedCount), accent: 'amber', icon: FileSpreadsheet },
          { label: t('summary.paidCount'), value: formatNumber(activeData.summary.paidCount), accent: 'green', icon: FileSpreadsheet },
        ];
      default:
        return [];
    }
  }, [activeData, report, t]);

  const derived = useMemo(() => {
    if (!activeData) return null;

    switch (report) {
      case 'projectStatus': {
        const costByProject = activeData.items
          .slice()
          .sort((a: any, b: any) => b.cost.estimated - a.cost.estimated)
          .slice(0, 8)
          .map((item: any) => ({
            label: item.projectCode,
            estimated: item.cost.estimated,
            actual: item.cost.actual,
          }));

        const delayedProjects = activeData.items
          .filter((item: any) => item.activities.delayed > 0 || item.activities.blocked > 0)
          .sort((a: any, b: any) => b.activities.delayed - a.activities.delayed || b.activities.blocked - a.activities.blocked)
          .slice(0, 8)
          .map((item: any) => ({
            label: `${item.projectCode} - ${item.projectName}`,
            value: item.activities.delayed,
            secondary: item.activities.blocked,
          }));

        const riskProjects = activeData.items
          .filter((item: any) => item.procurement.riskActivities > 0)
          .sort((a: any, b: any) => b.procurement.riskActivities - a.procurement.riskActivities)
          .slice(0, 5)
          .map((item: any) => ({
            label: `${item.projectCode} - ${item.projectName}`,
            value: formatNumber(item.procurement.riskActivities),
            meta: `${t('dashboard.labels.procurementItems')}: ${formatNumber(item.procurement.openItems)}`,
          }));

        return { costByProject, delayedProjects, riskProjects };
      }
      case 'operations': {
        const delayedActivities = activeData.items
          .filter((item: any) => item.delayed || item.blocked)
          .sort((a: any, b: any) => b.delayDays - a.delayDays)
          .slice(0, 6)
          .map((item: any) => ({
            label: `${item.activityCode} - ${item.activityName}`,
            value: formatNumber(item.delayDays),
            meta: `${item.projectCode} | ${labels[item.status] ?? item.status}`,
          }));

        return { delayedActivities };
      }
      case 'procurement': {
        const blockedItems = activeData.items
          .filter((item: any) => item.blocked)
          .slice(0, 6)
          .map((item: any) => ({
            label: `${item.activityCode} - ${item.requirementItem}`,
            value: formatText(item.projectCode),
            meta: item.notes ?? item.missingRequirements ?? undefined,
          }));

        return { blockedItems };
      }
      case 'dailyHistory': {
        const byDate = new Map<string, number>();
        const blockerCounts = new Map<string, number>();

        activeData.items.forEach((item: any) => {
          const dateKey = item.date.slice(0, 10);
          byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
          if (item.blockers) {
            blockerCounts.set(item.projectName, (blockerCounts.get(item.projectName) ?? 0) + 1);
          }
        });

        return {
          trend: [...byDate.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({
              label: formatDateWithEnglishDigits(date, locale, { month: 'short', day: 'numeric' }),
              count,
            })),
          blockerProjects: [...blockerCounts.entries()]
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6),
        };
      }
      case 'costSummary': {
        const projectComparison = activeData.items
          .slice()
          .sort((a: any, b: any) => b.estimated - a.estimated)
          .slice(0, 8)
          .map((item: any) => ({
            label: item.projectCode,
            estimated: item.estimated,
            actual: item.actual,
          }));

        const overrunProjects = activeData.items
          .filter((item: any) => item.variance > 0)
          .sort((a: any, b: any) => b.variance - a.variance)
          .slice(0, 6)
          .map((item: any) => ({
            label: `${item.projectCode} - ${item.projectName}`,
            value: formatCurrencySAR(item.variance),
            meta: `${t('summary.spendingRatio')}: ${item.spendingRatio == null ? MISSING_VALUE : formatPercent(item.spendingRatio, 0)}`,
          }));

        return { projectComparison, overrunProjects };
      }
      case 'invoices': {
        const vendorMap = new Map<string, number>();
        activeData.items.forEach((item: any) => {
          vendorMap.set(item.vendor, (vendorMap.get(item.vendor) ?? 0) + item.gross);
        });

        return {
          topVendors: [...vendorMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([label, value]) => ({ label, value: formatCurrencySAR(value) })),
        };
      }
      case 'extracts': {
        const recentExtracts = activeData.items
          .slice(0, 6)
          .map((item: any) => ({
            label: `${item.extractNumber} - ${item.projectCode}`,
            value: formatCurrencySAR(item.total),
            meta: formatDateWithEnglishDigits(item.date),
          }));

        return { recentExtracts };
      }
      default:
        return null;
    }
  }, [activeData, labels, locale, report, t]);

  const handleExport = (mode: 'csv' | 'excel') => {
    if (!activeData?.items?.length || !canExport) return;

    const payload = buildCsvPayload(report, activeData.items, labels);
    if (mode === 'csv') {
      downloadCsv(`${report}-report.csv`, payload.headers, payload.rows);
      return;
    }

    downloadExcel(`${report}-report`, reportMeta[report].title, payload.headers, payload.rows);
  };

  const renderCharts = () => {
    if (!activeData || !derived) return null;

    switch (report) {
      case 'projectStatus':
        return (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <DonutChartCard
                title={t('dashboard.charts.projectsByStatus')}
                data={Object.entries(activeData.summary.statusBreakdown).map(([label, value]) => ({
                  label: labels[label] ?? label,
                  value: value as number,
                }))}
              />
              <BarChartCard
                title={t('dashboard.charts.costByProject')}
                data={(derived as any).costByProject}
                series={[
                  { key: 'estimated', label: t('dashboard.series.estimated') },
                  { key: 'actual', label: t('dashboard.series.actual'), color: '#2563eb' },
                ]}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <ProgressList
                title={t('dashboard.charts.delayedProjects')}
                items={(derived as any).delayedProjects}
                color="bg-amber-500"
              />
              <SectionCard title={t('detail.riskProjects')} subtitle={t('detail.riskProjectsSubtitle')}>
                <MiniInsightList items={(derived as any).riskProjects} accent="red" />
              </SectionCard>
            </div>
          </>
        );
      case 'operations':
        return (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <DonutChartCard
                title={t('breakdowns.statusDistribution')}
                data={activeData.breakdowns.byStatus.map((item: any) => ({
                  label: labels[item.label] ?? item.label,
                  value: item.value,
                }))}
              />
              <BarChartCard
                title={t('breakdowns.categoryDistribution')}
                data={activeData.breakdowns.byCategory.map((item: any) => ({ label: item.label, value: item.value }))}
                series={[{ key: 'value', label: t('dashboard.series.activities') }]}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <ProgressList
                title={t('breakdowns.assigneeDistribution')}
                items={activeData.breakdowns.byAssignee}
              />
              <SectionCard title={t('detail.delayedActivities')} subtitle={t('detail.delayedActivitiesSubtitle')}>
                <MiniInsightList items={(derived as any).delayedActivities} accent="red" />
              </SectionCard>
            </div>
          </>
        );
      case 'procurement':
        return (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <DonutChartCard
                title={t('breakdowns.readinessStatus')}
                data={Object.entries(activeData.summary.byStatus).map(([label, value]) => ({
                  label: labels[label] ?? label,
                  value: value as number,
                }))}
              />
              <BarChartCard
                title={t('breakdowns.requirementTypes')}
                data={activeData.breakdowns.byType.map((item: any) => ({ label: labels[item.label] ?? item.label, value: item.value }))}
                series={[{ key: 'value', label: t('summary.totalRequirements') }]}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <ProgressList title={t('breakdowns.projects')} items={activeData.breakdowns.byProject} />
              <SectionCard title={t('detail.blockedRequirements')} subtitle={t('detail.blockedRequirementsSubtitle')}>
                <MiniInsightList items={(derived as any).blockedItems} accent="red" />
              </SectionCard>
            </div>
          </>
        );
      case 'dailyHistory':
        return (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <LineChartCard
                title={t('dashboard.charts.dailyLogsTrend')}
                data={(derived as any).trend}
                dataKey="count"
              />
              <BarChartCard
                title={t('breakdowns.projects')}
                data={activeData.breakdowns.byProject.map((item: any) => ({ label: item.label, value: item.value }))}
                series={[{ key: 'value', label: t('summary.totalLogs') }]}
              />
            </div>
            <ProgressList
              title={t('detail.blockerProjects')}
              items={(derived as any).blockerProjects}
              color="bg-red-500"
            />
          </>
        );
      case 'costSummary':
        return (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <BarChartCard
                title={t('dashboard.charts.costByProject')}
                data={(derived as any).projectComparison}
                series={[
                  { key: 'estimated', label: t('dashboard.series.estimated') },
                  { key: 'actual', label: t('dashboard.series.actual'), color: '#2563eb' },
                ]}
              />
              <BarChartCard
                title={t('breakdowns.costCategories')}
                data={activeData.categories.slice(0, 8).map((item: any) => ({
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
            <SectionCard title={t('detail.overrunProjects')} subtitle={t('detail.overrunProjectsSubtitle')}>
              <MiniInsightList items={(derived as any).overrunProjects} accent="red" />
            </SectionCard>
          </>
        );
      case 'invoices': {
        const projectBars = activeData.breakdowns.byProject.map((item: any) => ({ label: item.label, value: item.value }));
        const statusDonut = Object.entries(activeData.summary.byStatus).map(([label, value]) => ({
          label: labels[label] ?? label,
          value: value as number,
        }));

        return (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <DonutChartCard title={t('dashboard.charts.invoicesByStatus')} data={statusDonut} />
              <BarChartCard
                title={t('breakdowns.projects')}
                data={projectBars}
                series={[{ key: 'value', label: t('summary.totalInvoices') }]}
              />
            </div>
            <SectionCard title={t('detail.topVendors')} subtitle={t('detail.topVendorsSubtitle')}>
              <MiniInsightList items={(derived as any).topVendors} />
            </SectionCard>
          </>
        );
      }
      case 'extracts': {
        const projectBars = activeData.breakdowns.byProject.map((item: any) => ({ label: item.label, value: item.value }));
        const statusDonut = Object.entries(activeData.summary.byStatus).map(([label, value]) => ({
          label: labels[label] ?? label,
          value: value as number,
        }));

        return (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <DonutChartCard title={t('dashboard.charts.extractsByStatus')} data={statusDonut} />
              <BarChartCard
                title={t('breakdowns.projects')}
                data={projectBars}
                series={[{ key: 'value', label: t('summary.totalExtracts') }]}
              />
            </div>
            <SectionCard title={t('detail.recentExtracts')} subtitle={t('detail.recentExtractsSubtitle')}>
              <MiniInsightList items={(derived as any).recentExtracts} />
            </SectionCard>
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <Link href={`/${locale}/reports`} className="inline-flex items-center gap-2 hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" />
            {t('detail.backToDashboard')}
          </Link>
          <span className="text-text-muted/60">/</span>
          <span className="text-text-secondary">{reportMeta[report].title}</span>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-text-muted">
              <ActiveIcon className="h-4 w-4" />
              <span className="section-title">{t('detail.reportWorkspace')}</span>
            </div>
            <h1 className="text-3xl font-bold text-text-primary">{reportMeta[report].title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-text-secondary">{reportMeta[report].description}</p>
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
            <Button variant="outline" onClick={() => setFilters({})} disabled={activeFilterCount === 0}>
              <RefreshCcw className="h-4 w-4" />
              {t('actions.clearFilters')}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('actions.print')}
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')} disabled={!canExport || !activeData?.items?.length}>
              <FileSpreadsheet className="h-4 w-4" />
              {t('actions.exportExcel')}
            </Button>
            <Button onClick={() => handleExport('csv')} disabled={!canExport || !activeData?.items?.length}>
              <Download className="h-4 w-4" />
              {t('actions.exportCsv')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-surface-border bg-surface-card p-2">
        {REPORT_ORDER.map((item) => {
          const meta = reportMeta[item];
          const active = item === report;

          return (
            <Link
              key={item}
              href={`/${locale}${meta.href}`}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              {meta.title}
            </Link>
          );
        })}
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

      {activeQuery.isLoading ? (
        <LoadingPanel label={tc('loading')} />
      ) : activeQuery.isError ? (
        <ErrorPanel label={tc('error')} />
      ) : !activeData?.items?.length ? (
        <EmptyPanel title={reportMeta[report].empty} description={t('detail.emptyDescription')} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map((metric) => (
              <KpiCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                accent={metric.accent as any}
                icon={metric.icon as any}
              />
            ))}
          </div>

          {renderCharts()}

          <SectionCard
            title={t('detail.managementTable')}
            subtitle={t('detail.managementTableSubtitle')}
            action={<Badge variant="outline">{formatNumber(activeData.items.length)}</Badge>}
          >
            <ReportTable columns={columns as any} rows={activeData.items} emptyText={reportMeta[report].empty} />
          </SectionCard>
        </>
      )}

      <ReportFiltersModal
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        report={report}
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
