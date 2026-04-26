'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, Calculator, DollarSign, FileText, Receipt, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProjects } from '@/hooks/useProjects';
import { useCostOverview } from '@/hooks/useCost';
import { formatCurrency, formatCompactNumber, formatPercent, formatText } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const STATUS_VARIANT = {
  PLANNING:  'warning',
  ACTIVE:    'success',
  ON_HOLD:   'default',
  COMPLETED: 'muted',
  CANCELLED: 'danger',
} as const;

function ProjectCostCard({ projectId, projectCode, projectNameAr, status, currency }: {
  projectId: string;
  projectCode: string;
  projectNameAr: string;
  status: keyof typeof STATUS_VARIANT;
  currency: string;
}) {
  const t  = useTranslations('costControl');
  const tp = useTranslations('projects');
  const locale = useLocale();
  const { hasPermission } = useAuthStore();
  const canView = hasPermission('cost:view');

  const { data } = useCostOverview(canView ? projectId : '');
  const stats = data?.stats;

  const utilPct   = stats?.budgetUtilization ?? 0;
  const utilColor =
    utilPct > 100 ? 'bg-red-400' :
    utilPct > 80  ? 'bg-amber-400' : 'bg-brand';
  const utilText  =
    utilPct > 100 ? 'text-red-400' :
    utilPct > 80  ? 'text-amber-400' : 'text-emerald-400';

  return (
    <Link
      href={`/${locale}/cost-control/${projectId}`}
      className="group rounded-xl border border-surface-border bg-surface-card overflow-hidden transition-all hover:border-brand/30 hover:shadow-card-md flex flex-col"
    >
      {/* Card header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-text-muted">{projectCode}</span>
            <Badge variant={STATUS_VARIANT[status]}>{tp(`statuses.${status}`)}</Badge>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-text-primary leading-snug">
            {formatText(projectNameAr)}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-text-muted group-hover:text-brand transition-colors mt-0.5" />
      </div>

      {/* Stats grid */}
      {stats ? (
        <>
          <div className="grid grid-cols-3 gap-px bg-surface-border border-t border-surface-border">
            <div className="bg-surface-card px-3 py-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">{t('overview.budget')}</p>
              <p className="text-xs font-semibold text-text-primary" dir="ltr">
                {formatCompactNumber(stats.budgetTotal)}
                <span className="text-text-muted font-normal ms-0.5">{currency}</span>
              </p>
            </div>
            <div className="bg-surface-card px-3 py-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">{t('overview.invoiceTotal')}</p>
              <p className="text-xs font-semibold text-text-primary" dir="ltr">
                {formatCompactNumber(stats.invoiceTotal)}
                <span className="text-text-muted font-normal ms-0.5">{currency}</span>
              </p>
            </div>
            <div className="bg-surface-card px-3 py-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">{t('overview.extractTotal')}</p>
              <p className="text-xs font-semibold text-text-primary" dir="ltr">
                {formatCompactNumber(stats.extractTotal)}
                <span className="text-text-muted font-normal ms-0.5">{currency}</span>
              </p>
            </div>
          </div>

          {/* Utilization bar footer */}
          <div className="px-4 py-3 border-t border-surface-border bg-surface-hover/40 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-surface-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${utilColor}`}
                style={{ width: `${Math.min(utilPct, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${utilText}`} dir="ltr">
              {formatPercent(utilPct, 0)}
            </span>
            <span className="text-[10px] text-text-muted flex-shrink-0">
              {stats.invoiceCount} {t('overview.invoiceCount')} · {stats.extractCount} {t('overview.extractCount')}
            </span>
          </div>
        </>
      ) : (
        <div className="border-t border-surface-border px-4 py-3 space-y-2">
          <div className="h-2.5 w-3/4 rounded-full bg-surface-hover animate-pulse" />
          <div className="h-2 w-1/2 rounded-full bg-surface-hover animate-pulse" />
        </div>
      )}
    </Link>
  );
}

export default function CostControlPage() {
  const t = useTranslations('costControl');
  const { data, isLoading, isError } = useProjects({ page: 1, limit: 50 });
  const projects = data?.items ?? [];

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE');
  const otherProjects  = projects.filter((p) => p.status !== 'ACTIVE');
  const totalValue     = projects.reduce((s, p) => s + Number(p.contractValue ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-1">
          <Calculator className="h-4 w-4" />
          <span className="section-title">{t('title')}</span>
        </div>
        <h1 className="page-header-title">{t('portfolioSubtitle')}</h1>
        <p className="page-header-subtitle mt-0.5">{t('hint')}</p>
      </div>

      {/* Portfolio KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-brand/10 p-2 flex-shrink-0">
            <DollarSign className="h-5 w-5 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-text-muted">{t('portfolioStats.totalProjects')}</p>
            <p className="text-xl font-bold text-text-primary">{projects.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 flex-shrink-0">
            <FileText className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-text-muted">{t('portfolioStats.activeProjects')}</p>
            <p className="text-xl font-bold text-emerald-400">{activeProjects.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-brand/10 p-2 flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-text-muted">{t('portfolioStats.totalValue')}</p>
            <p className="text-sm font-bold text-text-primary truncate" dir="ltr">
              {formatCurrency(totalValue, 'SAR')}
            </p>
          </div>
        </div>
      </div>

      {/* Project cards */}
      {isLoading ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
          <p>{t('loadingProjects')}</p>
        </div>
      ) : isError ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <Calculator className="h-5 w-5 text-red-300" />
          </div>
          <p>{t('loadError')}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <Receipt className="h-6 w-6 text-text-muted" />
          </div>
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="success">{t('portfolioStats.activeProjects')}</Badge>
                <span className="text-xs text-text-muted">{activeProjects.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {activeProjects.map((project) => (
                  <ProjectCostCard
                    key={project.id}
                    projectId={project.id}
                    projectCode={project.code}
                    projectNameAr={project.nameAr}
                    status={project.status as keyof typeof STATUS_VARIANT}
                    currency={project.currency}
                  />
                ))}
              </div>
            </div>
          )}
          {otherProjects.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted mb-3">{t('portfolioStats.otherProjects')}</p>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {otherProjects.map((project) => (
                  <ProjectCostCard
                    key={project.id}
                    projectId={project.id}
                    projectCode={project.code}
                    projectNameAr={project.nameAr}
                    status={project.status as keyof typeof STATUS_VARIANT}
                    currency={project.currency}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
