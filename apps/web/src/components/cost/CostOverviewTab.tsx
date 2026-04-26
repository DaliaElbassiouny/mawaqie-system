'use client';

import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatCompactNumber, formatPercent, formatNumber } from '@/lib/utils';
import type { CostOverview } from '@/hooks/useCost';

const CATEGORY_LABELS: Record<string, string> = {
  CIVIL: 'مدني',
  MEP: 'كهروميكانيك',
  MECHANICAL: 'ميكانيكي',
  ELECTRICAL: 'كهربائي',
  FINISHING: 'تشطيبات',
  PRELIMINARIES: 'تجهيزات',
  PROCUREMENT: 'مشتريات',
  ADMIN: 'إداري',
  HSE: 'السلامة',
  OTHER: 'أخرى',
};

const STATUS_DOT: Record<string, string> = {
  DRAFT:     'bg-surface-active',
  SUBMITTED: 'bg-amber-400',
  APPROVED:  'bg-brand',
  PAID:      'bg-emerald-400',
};

function KpiCard({
  label,
  value,
  sub,
  accent = 'text-text-primary',
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-card p-4">
      <p className="text-xs font-medium text-text-muted leading-none">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-xl font-bold leading-tight ${accent}`} dir="ltr">{value}</p>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-400 flex-shrink-0 mb-0.5" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-400 flex-shrink-0 mb-0.5" />}
      </div>
      {sub && <p className="text-[11px] text-text-muted leading-none">{sub}</p>}
    </div>
  );
}

interface CostOverviewTabProps {
  data: CostOverview;
}

export function CostOverviewTab({ data }: CostOverviewTabProps) {
  const t = useTranslations('costControl');
  const { stats, categoryBreakdown, invoicesByStatus } = data;
  const currency = data.project.currency;

  const categoryEntries = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(1, ...categoryEntries.map(([, v]) => v));

  const statusEntries = Object.entries(invoicesByStatus) as [string, number][];
  const totalInvoiceCount = statusEntries.reduce((sum, [, v]) => sum + v, 0);

  const STATUS_LABELS: Record<string, string> = {
    DRAFT:     t('statuses.DRAFT'),
    SUBMITTED: t('statuses.SUBMITTED'),
    APPROVED:  t('statuses.APPROVED'),
    PAID:      t('statuses.PAID'),
  };

  const grossMargin = stats.contractValue > 0
    ? ((stats.contractValue - stats.invoiceTotal) / stats.contractValue) * 100
    : null;
  const collectionRatio = stats.extractTotal > 0
    ? (stats.extractPaid / stats.extractTotal) * 100
    : null;
  const variance = stats.budgetTotal - stats.invoiceTotal;
  const budgetOverrun = stats.budgetTotal > 0 && stats.invoiceTotal > stats.budgetTotal;

  return (
    <div className="space-y-6">
      {/* ── Row 1: Core financials ─────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
          {t('overview.contractValue')} &amp; {t('overview.budget')}
        </p>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard
            label={t('overview.contractValue')}
            value={formatCurrency(stats.contractValue, currency)}
            accent="text-brand"
            sub={`${stats.costItemCount} ${t('overview.costItemCount')}`}
          />
          <KpiCard
            label={t('overview.budget')}
            value={formatCurrency(stats.budgetTotal, currency)}
            sub={`${t('overview.budgetUtil')}: ${formatPercent(stats.budgetUtilization, 1)}`}
            accent={budgetOverrun ? 'text-red-400' : 'text-text-primary'}
          />
          <KpiCard
            label={t('overview.invoiceTotal')}
            value={formatCurrency(stats.invoiceTotal, currency)}
            accent={budgetOverrun ? 'text-red-400' : 'text-text-primary'}
            sub={`${t('overview.invoicePaid')}: ${formatCurrency(stats.invoicePaid, currency)}`}
            trend={budgetOverrun ? 'down' : null}
          />
          <KpiCard
            label={t('overview.extractTotal')}
            value={formatCurrency(stats.extractTotal, currency)}
            sub={`${t('overview.extractPaid')}: ${formatCurrency(stats.extractPaid, currency)}`}
          />
        </div>
      </div>

      {/* ── Row 2: KPI ratios ──────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
          {t('overview.grossMargin')} &amp; {t('overview.collectionRatio')}
        </p>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard
            label={t('overview.recognizedRevenue')}
            value={formatCurrency(stats.extractPaid, currency)}
            accent="text-emerald-400"
            trend="up"
          />
          <KpiCard
            label={t('overview.grossMargin')}
            value={grossMargin !== null ? formatPercent(grossMargin, 1) : '—'}
            accent={
              grossMargin === null ? 'text-text-muted' :
              grossMargin < 0 ? 'text-red-400' :
              grossMargin < 15 ? 'text-amber-400' : 'text-emerald-400'
            }
            trend={grossMargin !== null && grossMargin < 0 ? 'down' : grossMargin !== null && grossMargin > 15 ? 'up' : null}
          />
          <KpiCard
            label={t('overview.collectionRatio')}
            value={collectionRatio !== null ? formatPercent(collectionRatio, 1) : '—'}
            accent={
              collectionRatio === null ? 'text-text-muted' :
              collectionRatio < 50 ? 'text-amber-400' : 'text-emerald-400'
            }
          />
          <KpiCard
            label={t('overview.variance')}
            value={formatCurrency(variance, currency)}
            accent={variance < 0 ? 'text-red-400' : 'text-emerald-400'}
            trend={variance < 0 ? 'down' : 'up'}
            sub={`${t('overview.invoiceCount')}: ${formatNumber(stats.invoiceCount)} · ${t('overview.extractCount')}: ${formatNumber(stats.extractCount)}`}
          />
        </div>
      </div>

      {/* ── Budget utilization bar ──────────────────────────────────── */}
      <div className="rounded-xl border border-surface-border bg-surface-card p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-text-primary">{t('overview.budgetUtil')}</p>
          <p
            className={`text-sm font-bold ${
              stats.budgetUtilization > 100 ? 'text-red-400' :
              stats.budgetUtilization > 80 ? 'text-amber-400' : 'text-emerald-400'
            }`}
            dir="ltr"
          >
            {formatPercent(stats.budgetUtilization, 1)}
          </p>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-hover">
          <div
            className={`h-full rounded-full transition-all ${
              stats.budgetUtilization > 100 ? 'bg-red-400' :
              stats.budgetUtilization > 80 ? 'bg-amber-400' : 'bg-brand'
            }`}
            style={{ width: `${Math.min(stats.budgetUtilization, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-text-muted mt-2">
          <span>{t('overview.invoicePending')}: <span dir="ltr">{formatCurrency(stats.invoicePending, currency)}</span></span>
          <span>{t('overview.extractPending')}: <span dir="ltr">{formatCurrency(stats.extractPending, currency)}</span></span>
        </div>
      </div>

      {/* ── Charts row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Category breakdown */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-text-muted" />
            <p className="text-sm font-semibold text-text-primary">{t('overview.categoryBreakdown')}</p>
          </div>
          {categoryEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <BarChart3 className="h-6 w-6 text-text-muted opacity-40" />
              <p className="text-xs text-text-muted">{t('costSheet.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([cat, value]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-text-primary">{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="text-xs font-medium text-text-muted tabular-nums" dir="ltr">
                      {formatCompactNumber(value)} {currency}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{ width: `${(value / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices by status */}
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-text-muted" />
            <p className="text-sm font-semibold text-text-primary">{t('overview.invoicesByStatus')}</p>
          </div>
          {totalInvoiceCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <BarChart3 className="h-6 w-6 text-text-muted opacity-40" />
              <p className="text-xs text-text-muted">{t('invoices.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => {
                const pct = totalInvoiceCount > 0 ? (count / totalInvoiceCount) * 100 : 0;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? 'bg-surface-active'}`} />
                        <span className="text-sm text-text-primary">{STATUS_LABELS[status] ?? status}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums" dir="ltr">
                        <span className="text-sm font-semibold text-text-primary">{formatNumber(count)}</span>
                        <span className="text-xs text-text-muted">{formatPercent(pct)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${STATUS_DOT[status] ?? 'bg-surface-active'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
