// No 'use client' — intentionally server-safe. Only pure types + functions.

export type ReportKind =
  | 'projectStatus'
  | 'operations'
  | 'procurement'
  | 'dailyHistory'
  | 'costSummary'
  | 'invoices'
  | 'extracts';

export type ReportSlug =
  | 'project-status'
  | 'operations'
  | 'procurement-readiness'
  | 'daily-history'
  | 'cost-summary'
  | 'invoices'
  | 'extracts';

export type FilterLayout = ReportKind | 'dashboard';

export type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export type TableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export const REPORT_ORDER: ReportKind[] = [
  'projectStatus',
  'operations',
  'procurement',
  'dailyHistory',
  'costSummary',
  'invoices',
  'extracts',
];

export const REPORT_SLUGS: Record<ReportKind, ReportSlug> = {
  projectStatus:  'project-status',
  operations:     'operations',
  procurement:    'procurement-readiness',
  dailyHistory:   'daily-history',
  costSummary:    'cost-summary',
  invoices:       'invoices',
  extracts:       'extracts',
};

const SLUG_TO_REPORT: Record<ReportSlug, ReportKind> = {
  'project-status':       'projectStatus',
  operations:             'operations',
  'procurement-readiness':'procurement',
  'daily-history':        'dailyHistory',
  'cost-summary':         'costSummary',
  invoices:               'invoices',
  extracts:               'extracts',
};

export function getReportKindFromSlug(slug: string): ReportKind | null {
  return (SLUG_TO_REPORT as Record<string, ReportKind | undefined>)[slug] ?? null;
}
