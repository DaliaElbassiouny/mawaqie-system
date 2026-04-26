'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Calculator, ExternalLink } from 'lucide-react';
import { CostWorkspace } from '@/components/cost/CostWorkspace';
import { useProject } from '@/hooks/useProjects';
import { Badge } from '@/components/ui/badge';
import { formatText } from '@/lib/utils';

const STATUS_VARIANT = {
  PLANNING: 'warning',
  ACTIVE:   'success',
  ON_HOLD:  'default',
  COMPLETED:'muted',
  CANCELLED:'danger',
} as const;

export default function StandaloneCostPage() {
  const t  = useTranslations('costControl');
  const tp = useTranslations('projects');
  const locale  = useLocale();
  const isRtl   = locale === 'ar';
  const params  = useParams();
  const projectId = params.projectId as string;

  const { data: project, isLoading } = useProject(projectId);
  const BackIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-text-muted">
        <Link href={`/${locale}/cost-control`} className="flex items-center gap-1.5 hover:text-text-primary transition-colors">
          <Calculator className="h-3.5 w-3.5" />
          {t('title')}
        </Link>
        <span className="opacity-40">/</span>
        {isLoading ? (
          <span className="h-4 w-32 rounded-full bg-surface-hover animate-pulse inline-block" />
        ) : (
          <span className="text-text-primary font-medium">
            {project ? formatText(project.nameAr) : projectId}
          </span>
        )}
      </nav>

      {/* ── Hero header ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-brand/40 via-brand to-brand/30" />
        <div className="p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href={`/${locale}/cost-control`}
              className="mt-0.5 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors flex-shrink-0"
            >
              <BackIcon className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <Calculator className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{t('title')}</span>
              </div>
              <h1 className="text-xl font-bold text-text-primary">{t('workspace')}</h1>
              {project && (
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono text-text-muted">{project.code}</span>
                  <Badge variant={STATUS_VARIANT[project.status as keyof typeof STATUS_VARIANT]}>
                    {tp(`statuses.${project.status}`)}
                  </Badge>
                  <span className="text-sm text-text-secondary">{formatText(project.nameAr)}</span>
                </div>
              )}
            </div>
          </div>

          <Link
            href={`/${locale}/projects/${projectId}`}
            className="flex items-center gap-1.5 text-sm text-brand hover:underline underline-offset-2 transition-colors mt-1"
          >
            {t('backToProject')}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Cost workspace ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
        <div className="p-5">
          <CostWorkspace projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
