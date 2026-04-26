'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { CalendarRange, CheckCircle2, ClipboardList, FolderKanban, Receipt, ShoppingCart, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  type CostSummaryItem,
  type DailyHistoryItem,
  type ExtractReportItem,
  type InvoiceReportItem,
  type OperationsReportItem,
  type ProcurementReportItem,
  type ProjectStatusReportItem,
  type ReportFilters,
} from '@/hooks/useReports';
import {
  MISSING_VALUE,
  formatCurrency,
  formatDateWithEnglishDigits,
  formatNumber,
  formatPercent,
  formatText,
} from '@/lib/utils';
import {
  type FilterLayout,
  type ReportKind,
  type ReportSlug,
  type TableColumn,
  type TranslateFn,
  REPORT_ORDER,
  REPORT_SLUGS,
  getReportKindFromSlug,
} from './report-utils';

export type { FilterLayout, ReportKind, ReportSlug, TableColumn, TranslateFn };
export { REPORT_ORDER, REPORT_SLUGS, getReportKindFromSlug };

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info'> = {
  ACTIVE: 'success',
  PLANNING: 'warning',
  ON_HOLD: 'warning',
  COMPLETED: 'muted',
  CANCELLED: 'danger',
  NOT_STARTED: 'muted',
  IN_PROGRESS: 'info',
  DELAYED: 'warning',
  BLOCKED: 'danger',
  DRAFT: 'muted',
  SUBMITTED: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  PENDING: 'warning',
  REQUESTED: 'warning',
  PARTIALLY_AVAILABLE: 'info',
  AVAILABLE: 'success',
  MATERIALS: 'default',
  EQUIPMENT: 'muted',
};

export function getReportMeta(t: TranslateFn) {
  return {
    projectStatus: {
      title: t('reports.projectStatus.title'),
      description: t('reports.projectStatus.description'),
      empty: t('reports.projectStatus.empty'),
      icon: FolderKanban,
      href: `/reports/${REPORT_SLUGS.projectStatus}`,
    },
    operations: {
      title: t('reports.operations.title'),
      description: t('reports.operations.description'),
      empty: t('reports.operations.empty'),
      icon: ClipboardList,
      href: `/reports/${REPORT_SLUGS.operations}`,
    },
    procurement: {
      title: t('reports.procurement.title'),
      description: t('reports.procurement.description'),
      empty: t('reports.procurement.empty'),
      icon: ShoppingCart,
      href: `/reports/${REPORT_SLUGS.procurement}`,
    },
    dailyHistory: {
      title: t('reports.dailyHistory.title'),
      description: t('reports.dailyHistory.description'),
      empty: t('reports.dailyHistory.empty'),
      icon: CalendarRange,
      href: `/reports/${REPORT_SLUGS.dailyHistory}`,
    },
    costSummary: {
      title: t('reports.costSummary.title'),
      description: t('reports.costSummary.description'),
      empty: t('reports.costSummary.empty'),
      icon: Wallet,
      href: `/reports/${REPORT_SLUGS.costSummary}`,
    },
    invoices: {
      title: t('reports.invoices.title'),
      description: t('reports.invoices.description'),
      empty: t('reports.invoices.empty'),
      icon: Receipt,
      href: `/reports/${REPORT_SLUGS.invoices}`,
    },
    extracts: {
      title: t('reports.extracts.title'),
      description: t('reports.extracts.description'),
      empty: t('reports.extracts.empty'),
      icon: CheckCircle2,
      href: `/reports/${REPORT_SLUGS.extracts}`,
    },
  } satisfies Record<
    ReportKind,
    { title: string; description: string; empty: string; icon: React.ElementType; href: string }
  >;
}

export function getEnumLabels(locale: string) {
  const isArabic = locale === 'ar';
  return {
    ACTIVE: isArabic ? 'نشط' : 'Active',
    PLANNING: isArabic ? 'تخطيط' : 'Planning',
    ON_HOLD: isArabic ? 'متوقف' : 'On Hold',
    COMPLETED: isArabic ? 'مكتمل' : 'Completed',
    CANCELLED: isArabic ? 'ملغي' : 'Cancelled',
    NOT_STARTED: isArabic ? 'لم يبدأ' : 'Not Started',
    IN_PROGRESS: isArabic ? 'قيد التنفيذ' : 'In Progress',
    DELAYED: isArabic ? 'متأخر' : 'Delayed',
    BLOCKED: isArabic ? 'متعطل' : 'Blocked',
    DRAFT: isArabic ? 'مسودة' : 'Draft',
    SUBMITTED: isArabic ? 'مقدم' : 'Submitted',
    APPROVED: isArabic ? 'معتمد' : 'Approved',
    PAID: isArabic ? 'مدفوع' : 'Paid',
    PENDING: isArabic ? 'معلق' : 'Pending',
    REQUESTED: isArabic ? 'مطلوب' : 'Requested',
    PARTIALLY_AVAILABLE: isArabic ? 'متوفر جزئيًا' : 'Partially Available',
    AVAILABLE: isArabic ? 'متوفر' : 'Available',
    MATERIALS: isArabic ? 'مواد' : 'Materials',
    EQUIPMENT: isArabic ? 'معدات' : 'Equipment',
    UNSPECIFIED: isArabic ? 'غير محدد' : 'Unspecified',
    UNASSIGNED: isArabic ? 'غير مسند' : 'Unassigned',
  } as Record<string, string>;
}

function renderStatusBadge(status: string, labels: Record<string, string>) {
  return <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>{labels[status] ?? status}</Badge>;
}

function renderNullable(value: string | null | undefined) {
  return <span>{formatText(value)}</span>;
}

export function getColumns(
  report: ReportKind,
  t: TranslateFn,
  labels: Record<string, string>,
) {
  switch (report) {
    case 'projectStatus':
      return [
        {
          key: 'project',
          label: t('table.project'),
          render: (row: ProjectStatusReportItem) => (
            <div className="space-y-1">
              <p className="font-semibold text-text-primary">{formatText(row.projectName)}</p>
              <p className="text-xs text-text-muted">{formatText(row.projectCode)}</p>
            </div>
          ),
        },
        { key: 'client', label: t('table.client'), render: (row: ProjectStatusReportItem) => renderNullable(row.clientName) },
        { key: 'status', label: t('table.status'), render: (row: ProjectStatusReportItem) => renderStatusBadge(row.status, labels) },
        {
          key: 'progress',
          label: t('table.progress'),
          render: (row: ProjectStatusReportItem) =>
            row.progress == null ? MISSING_VALUE : formatPercent(row.progress, 0),
        },
        {
          key: 'activities',
          label: t('table.activities'),
          render: (row: ProjectStatusReportItem) => (
            <div className="space-y-1 text-xs text-text-secondary">
              <p>{t('table.total')}: {formatNumber(row.activities.total)}</p>
              <p>{t('table.blocked')}: {formatNumber(row.activities.blocked)}</p>
              <p>{t('table.delayed')}: {formatNumber(row.activities.delayed)}</p>
            </div>
          ),
        },
        {
          key: 'cost',
          label: t('table.costPosition'),
          render: (row: ProjectStatusReportItem) => (
            <div className="space-y-1 text-xs text-text-secondary">
              <p>{formatCurrency(row.cost.estimated, row.currency)}</p>
              <p>{formatCurrency(row.cost.actual, row.currency)}</p>
              <p>{row.cost.spendingRatio == null ? MISSING_VALUE : formatPercent(row.cost.spendingRatio, 0)}</p>
            </div>
          ),
        },
      ] satisfies TableColumn<ProjectStatusReportItem>[];
    case 'operations':
      return [
        {
          key: 'activity',
          label: t('table.activity'),
          render: (row: OperationsReportItem) => (
            <div className="space-y-1">
              <p className="font-semibold text-text-primary">{formatText(row.activityName)}</p>
              <p className="text-xs text-text-muted">{formatText(row.activityCode)}</p>
            </div>
          ),
        },
        { key: 'project', label: t('table.project'), render: (row: OperationsReportItem) => <span>{formatText(row.projectName)}</span> },
        { key: 'status', label: t('table.status'), render: (row: OperationsReportItem) => renderStatusBadge(row.status, labels) },
        {
          key: 'assignee',
          label: t('table.assignee'),
          render: (row: OperationsReportItem) => <span>{labels[row.assignee] ?? formatText(row.assignee)}</span>,
        },
        { key: 'category', label: t('table.category'), render: (row: OperationsReportItem) => <span>{formatText(row.category)}</span> },
        {
          key: 'location',
          label: t('table.location'),
          render: (row: OperationsReportItem) => <span>{labels[row.location ?? 'UNSPECIFIED'] ?? formatText(row.location)}</span>,
        },
        { key: 'progress', label: t('table.progress'), render: (row: OperationsReportItem) => formatPercent(row.progress, 0) },
        {
          key: 'risk',
          label: t('table.risk'),
          render: (row: OperationsReportItem) => renderNullable(row.blockerReason || (row.delayed ? labels.DELAYED : null)),
        },
      ] satisfies TableColumn<OperationsReportItem>[];
    case 'procurement':
      return [
        { key: 'project', label: t('table.project'), render: (row: ProcurementReportItem) => <span>{formatText(row.projectName)}</span> },
        { key: 'activity', label: t('table.activity'), render: (row: ProcurementReportItem) => <span>{formatText(row.activityName)}</span> },
        { key: 'type', label: t('table.requirementType'), render: (row: ProcurementReportItem) => renderStatusBadge(row.requirementType, labels) },
        { key: 'item', label: t('table.requirementItem'), render: (row: ProcurementReportItem) => <span>{formatText(row.requirementItem)}</span> },
        { key: 'status', label: t('table.status'), render: (row: ProcurementReportItem) => renderStatusBadge(row.status, labels) },
        { key: 'assignee', label: t('table.assignee'), render: (row: ProcurementReportItem) => renderNullable(row.assignee) },
        { key: 'notes', label: t('table.notes'), render: (row: ProcurementReportItem) => renderNullable(row.notes ?? row.missingRequirements) },
      ] satisfies TableColumn<ProcurementReportItem>[];
    case 'dailyHistory':
      return [
        { key: 'project', label: t('table.project'), render: (row: DailyHistoryItem) => <span>{formatText(row.projectName)}</span> },
        { key: 'date', label: t('table.date'), render: (row: DailyHistoryItem) => formatDateWithEnglishDigits(row.date) },
        { key: 'summary', label: t('table.summary'), render: (row: DailyHistoryItem) => renderNullable(row.summary) },
        { key: 'blockers', label: t('table.blockers'), render: (row: DailyHistoryItem) => renderNullable(row.blockers) },
        { key: 'tomorrowPlan', label: t('table.tomorrowPlan'), render: (row: DailyHistoryItem) => renderNullable(row.tomorrowPlan) },
        {
          key: 'linkedActivities',
          label: t('table.linkedActivities'),
          render: (row: DailyHistoryItem) =>
            row.linkedActivities.length > 0
              ? row.linkedActivities
                  .slice(0, 2)
                  .map((activity) => `${activity.code} - ${activity.nameAr}`)
                  .join(' | ')
              : MISSING_VALUE,
        },
      ] satisfies TableColumn<DailyHistoryItem>[];
    case 'costSummary':
      return [
        { key: 'project', label: t('table.project'), render: (row: CostSummaryItem) => <span>{formatText(row.projectName)}</span> },
        { key: 'client', label: t('table.client'), render: (row: CostSummaryItem) => renderNullable(row.clientName) },
        { key: 'estimated', label: t('table.estimated'), render: (row: CostSummaryItem) => formatCurrency(row.estimated, row.currency) },
        { key: 'actual', label: t('table.actual'), render: (row: CostSummaryItem) => formatCurrency(row.actual, row.currency) },
        { key: 'variance', label: t('table.variance'), render: (row: CostSummaryItem) => formatCurrency(row.variance, row.currency) },
        {
          key: 'spendingRatio',
          label: t('table.spendingRatio'),
          render: (row: CostSummaryItem) =>
            row.spendingRatio == null ? MISSING_VALUE : formatPercent(row.spendingRatio, 0),
        },
        { key: 'topCategory', label: t('table.topCategory'), render: (row: CostSummaryItem) => renderNullable(row.topCostCategory) },
      ] satisfies TableColumn<CostSummaryItem>[];
    case 'invoices':
      return [
        { key: 'project', label: t('table.project'), render: (row: InvoiceReportItem) => <span>{formatText(row.projectName)}</span> },
        { key: 'invoiceNumber', label: t('table.invoiceNumber'), render: (row: InvoiceReportItem) => <span>{formatText(row.invoiceNumber)}</span> },
        { key: 'date', label: t('table.date'), render: (row: InvoiceReportItem) => formatDateWithEnglishDigits(row.date) },
        { key: 'vendor', label: t('table.vendor'), render: (row: InvoiceReportItem) => <span>{formatText(row.vendor)}</span> },
        { key: 'costCode', label: t('table.costCode'), render: (row: InvoiceReportItem) => renderNullable(row.costCode) },
        { key: 'beforeTax', label: t('table.beforeTax'), render: (row: InvoiceReportItem) => formatCurrency(row.amountBeforeTax, row.currency) },
        { key: 'tax', label: t('table.tax'), render: (row: InvoiceReportItem) => formatCurrency(row.tax, row.currency) },
        { key: 'gross', label: t('table.total'), render: (row: InvoiceReportItem) => formatCurrency(row.gross, row.currency) },
        { key: 'status', label: t('table.status'), render: (row: InvoiceReportItem) => renderStatusBadge(row.status, labels) },
      ] satisfies TableColumn<InvoiceReportItem>[];
    case 'extracts':
      return [
        { key: 'project', label: t('table.project'), render: (row: ExtractReportItem) => <span>{formatText(row.projectName)}</span> },
        { key: 'extractNumber', label: t('table.extractNumber'), render: (row: ExtractReportItem) => <span>{formatText(row.extractNumber)}</span> },
        { key: 'date', label: t('table.date'), render: (row: ExtractReportItem) => formatDateWithEnglishDigits(row.date) },
        { key: 'description', label: t('table.description'), render: (row: ExtractReportItem) => renderNullable(row.description) },
        { key: 'beforeTax', label: t('table.beforeTax'), render: (row: ExtractReportItem) => formatCurrency(row.amountBeforeTax, row.currency) },
        { key: 'tax', label: t('table.tax'), render: (row: ExtractReportItem) => formatCurrency(row.tax, row.currency) },
        { key: 'afterTax', label: t('table.afterTax'), render: (row: ExtractReportItem) => formatCurrency(row.total, row.currency) },
        { key: 'status', label: t('table.status'), render: (row: ExtractReportItem) => renderStatusBadge(row.status, labels) },
      ] satisfies TableColumn<ExtractReportItem>[];
    default:
      return [];
  }
}

export function cleanFilters(filters: ReportFilters): ReportFilters {
  const result: ReportFilters = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value == null || value === false) return;
    result[key as keyof ReportFilters] = value as never;
  });
  return result;
}

export function countActiveFilters(filters: ReportFilters) {
  return Object.values(cleanFilters(filters)).length;
}

export function supportsField(report: FilterLayout, field: keyof ReportFilters) {
  const map: Record<FilterLayout, Array<keyof ReportFilters>> = {
    dashboard: ['projectId', 'client', 'search', 'status', 'startDate', 'endDate'],
    projectStatus: ['projectId', 'client', 'search', 'status', 'procurementRiskOnly'],
    operations: ['projectId', 'client', 'search', 'status', 'category', 'assignee', 'startDate', 'endDate', 'blockedOnly', 'delayedOnly'],
    procurement: ['projectId', 'client', 'search', 'category', 'assignee', 'requirementType', 'requirementStatus', 'blockedOnly'],
    dailyHistory: ['projectId', 'client', 'search', 'startDate', 'endDate', 'blockersOnly'],
    costSummary: ['projectId', 'client', 'search', 'category'],
    invoices: ['projectId', 'client', 'search', 'status', 'vendor', 'costCode', 'startDate', 'endDate'],
    extracts: ['projectId', 'client', 'search', 'status', 'startDate', 'endDate'],
  };

  return map[report].includes(field);
}

export function getStatusOptions(report: FilterLayout, labels: Record<string, string>) {
  const values: Record<FilterLayout, string[]> = {
    dashboard: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    projectStatus: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    operations: ['NOT_STARTED', 'IN_PROGRESS', 'DELAYED', 'BLOCKED', 'COMPLETED'],
    procurement: [],
    dailyHistory: [],
    costSummary: [],
    invoices: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'],
    extracts: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'],
  };

  return values[report].map((value) => ({ value, label: labels[value] ?? value }));
}

export function renderFilterChips(
  filters: ReportFilters,
  projects: Array<{ id: string; code: string; nameAr: string }>,
  labels: Record<string, string>,
) {
  const chips: string[] = [];
  const project = projects.find((item) => item.id === filters.projectId);
  if (project) chips.push(`${project.code} - ${project.nameAr}`);
  if (filters.client) chips.push(filters.client);
  if (filters.search) chips.push(filters.search);
  if (filters.status) chips.push(labels[filters.status] ?? filters.status);
  if (filters.category) chips.push(filters.category);
  if (filters.assignee) chips.push(filters.assignee);
  if (filters.vendor) chips.push(filters.vendor);
  if (filters.costCode) chips.push(filters.costCode);
  if (filters.requirementType) chips.push(labels[filters.requirementType] ?? filters.requirementType);
  if (filters.requirementStatus) chips.push(labels[filters.requirementStatus] ?? filters.requirementStatus);
  if (filters.startDate) chips.push(formatDateWithEnglishDigits(filters.startDate));
  if (filters.endDate) chips.push(formatDateWithEnglishDigits(filters.endDate));
  if (filters.blockersOnly) chips.push(labels.BLOCKED);
  if (filters.blockedOnly) chips.push(labels.BLOCKED);
  if (filters.delayedOnly) chips.push(labels.DELAYED);
  if (filters.procurementRiskOnly) chips.push(labels.PENDING);
  return chips;
}

export function buildCsvPayload(report: ReportKind, items: any[], labels: Record<string, string>) {
  switch (report) {
    case 'projectStatus':
      return {
        headers: ['Project', 'Code', 'Client', 'Status', 'Progress', 'Delayed', 'Blocked', 'Estimated', 'Actual', 'Spending Ratio'],
        rows: items.map((row) => [
          row.projectName,
          row.projectCode,
          row.clientName,
          labels[row.status] ?? row.status,
          row.progress,
          row.activities.delayed,
          row.activities.blocked,
          row.cost.estimated,
          row.cost.actual,
          row.cost.spendingRatio,
        ]),
      };
    case 'operations':
      return {
        headers: ['Project', 'Activity', 'Status', 'Assignee', 'Category', 'Location', 'Progress', 'Delay Days', 'Blocked Reason'],
        rows: items.map((row) => [
          row.projectName,
          row.activityName,
          labels[row.status] ?? row.status,
          row.assignee,
          row.category,
          row.location,
          row.progress,
          row.delayDays,
          row.blockerReason,
        ]),
      };
    case 'procurement':
      return {
        headers: ['Project', 'Activity', 'Type', 'Item', 'Status', 'Assignee', 'Notes'],
        rows: items.map((row) => [
          row.projectName,
          row.activityName,
          labels[row.requirementType] ?? row.requirementType,
          row.requirementItem,
          labels[row.status] ?? row.status,
          row.assignee,
          row.notes ?? row.missingRequirements,
        ]),
      };
    case 'dailyHistory':
      return {
        headers: ['Project', 'Date', 'Summary', 'Blockers', 'Tomorrow Plan', 'Linked Activities'],
        rows: items.map((row) => [
          row.projectName,
          row.date,
          row.summary,
          row.blockers,
          row.tomorrowPlan,
          row.linkedActivities.map((item: any) => `${item.code} - ${item.nameAr}`).join(' | '),
        ]),
      };
    case 'costSummary':
      return {
        headers: ['Project', 'Client', 'Estimated', 'Actual', 'Variance', 'Spending Ratio', 'Top Category'],
        rows: items.map((row) => [
          row.projectName,
          row.clientName,
          row.estimated,
          row.actual,
          row.variance,
          row.spendingRatio,
          row.topCostCategory,
        ]),
      };
    case 'invoices':
      return {
        headers: ['Project', 'Invoice Number', 'Date', 'Vendor', 'Cost Code', 'Before Tax', 'Tax', 'Gross', 'Status'],
        rows: items.map((row) => [
          row.projectName,
          row.invoiceNumber,
          row.date,
          row.vendor,
          row.costCode,
          row.amountBeforeTax,
          row.tax,
          row.gross,
          labels[row.status] ?? row.status,
        ]),
      };
    case 'extracts':
      return {
        headers: ['Project', 'Extract Number', 'Date', 'Description', 'Before Tax', 'Tax', 'After Tax', 'Status'],
        rows: items.map((row) => [
          row.projectName,
          row.extractNumber,
          row.date,
          row.description,
          row.amountBeforeTax,
          row.tax,
          row.total,
          labels[row.status] ?? row.status,
        ]),
      };
    default:
      return { headers: [], rows: [] };
  }
}
