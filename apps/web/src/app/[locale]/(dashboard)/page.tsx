'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Activity,
  ArrowUpRight,
  Building2,
  Calculator,
  FileText,
  FolderOpen,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useTenderStats } from '@/hooks/useTenders';
import { useAuthStore } from '@/store/auth.store';
import {
  formatCompactNumber,
  formatDateWithEnglishDigits,
  formatNumber,
  formatText,
} from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
  trend?: string;
}

function StatCard({ title, value, icon: Icon, accent = 'text-text-primary', trend }: StatCardProps) {
  const displayValue = typeof value === 'number' ? formatCompactNumber(value) : value;

  return (
    <div className="card p-5 hover:border-brand/25 hover:shadow-card-md transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.1em]">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${accent}`} dir="ltr">{displayValue}</p>
          {trend && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/15 bg-brand/10 transition-colors group-hover:bg-brand/16">
          <Icon className="text-brand" style={{ width: '18px', height: '18px' }} />
        </div>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  soon?: boolean;
  locale: string;
}

function ModuleCard({ label, desc, href, icon: Icon, soon, locale }: ModuleCardProps) {
  const inner = (
    <div
      className={`card flex items-center gap-3.5 p-4 transition-all duration-200 group ${
        soon
          ? 'cursor-not-allowed opacity-45'
          : 'cursor-pointer hover:border-brand/25 hover:shadow-card-md'
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
          soon ? 'bg-surface-hover' : 'border border-brand/15 bg-brand/10 group-hover:bg-brand/16'
        }`}
      >
        <Icon
          style={{
            width: '16px',
            height: '16px',
            color: soon ? 'hsl(var(--text-muted))' : 'hsl(var(--brand))',
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{label}</p>
        <p className="mt-0.5 truncate text-xs text-text-muted">{desc}</p>
      </div>
      {!soon && (
        <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-text-muted transition-colors group-hover:text-brand" />
      )}
    </div>
  );

  if (soon) return <div>{inner}</div>;
  return <Link href={`/${locale}/${href}`}>{inner}</Link>;
}

const PROJECT_STATUS_VARIANT = {
  PLANNING: 'warning',
  ACTIVE: 'success',
  ON_HOLD: 'default',
  COMPLETED: 'muted',
  CANCELLED: 'danger',
} as const;

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const { user } = useAuthStore();
  const { data: projectsData } = useProjects({ page: 1, limit: 50 });
  const { data: clientsData } = useClients({ page: 1, limit: 50 });
  const { data: tenderStats } = useTenderStats();

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? locale === 'ar'
        ? 'صباح الخير'
        : 'Good morning'
      : hour < 17
        ? locale === 'ar'
          ? 'مساء الخير'
          : 'Good afternoon'
        : locale === 'ar'
          ? 'مساء الخير'
          : 'Good evening';

  const projects = projectsData?.items ?? [];
  const activeProjects = projects.filter((project) => project.status === 'ACTIVE').length;
  const purchaseRequests = projects.reduce(
    (total, project) => total + (project._count.purchaseRequests ?? 0),
    0,
  );

  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {greeting}
            {locale === 'ar' ? '، ' : ', '}
            <span className="text-brand">{user?.nameAr || user?.nameEn}</span>
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {locale === 'ar'
              ? 'نظرة سريعة على المشاريع والمناقصات والطلبات الجارية.'
              : 'A live snapshot of projects, tenders, and active requests.'}
          </p>
        </div>
        <p className="hidden text-xs text-text-muted sm:block">
          {formatDateWithEnglishDigits(new Date(), locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div>
        <p className="section-title mb-3">{locale === 'ar' ? 'نظرة عامة' : 'Overview'}</p>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            title={t('totalProjects')}
            value={projectsData?.total ?? 0}
            icon={FolderOpen}
            trend={locale === 'ar' ? 'بيانات مباشرة من النظام' : 'Live system data'}
          />
          <StatCard
            title={t('activeProjects')}
            value={activeProjects}
            icon={Activity}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            title={t('totalClients')}
            value={clientsData?.total ?? 0}
            icon={Building2}
          />
          <StatCard
            title={t('purchaseRequests')}
            value={purchaseRequests}
            icon={ShoppingCart}
            accent="text-amber-600 dark:text-amber-400"
          />
        </div>
      </div>

      <div>
        <p className="section-title mb-3">{locale === 'ar' ? 'الوحدات الرئيسية' : 'Modules'}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            locale={locale}
            label={tn('clients')}
            desc={locale === 'ar' ? 'إدارة العملاء والجهات المتعاقدة' : 'Manage clients and contracting parties'}
            href="clients"
            icon={Building2}
          />
          <ModuleCard
            locale={locale}
            label={tn('tenders')}
            desc={locale === 'ar' ? 'متابعة العطاءات والمناقصات' : 'Track bids and tenders'}
            href="tenders"
            icon={FileText}
          />
          <ModuleCard
            locale={locale}
            label={tn('projects')}
            desc={locale === 'ar' ? 'المشاريع النشطة وعرض مساحات العمل' : 'Active projects and workspaces'}
            href="projects"
            icon={FolderOpen}
          />
          <ModuleCard
            locale={locale}
            label={tn('costControl')}
            desc={locale === 'ar' ? 'ملخصات التكلفة داخل مساحة المشروع' : 'Project workspace cost summaries'}
            href="cost-control"
            icon={Calculator}
          />
          <ModuleCard
            locale={locale}
            label={tn('procurement')}
            desc={locale === 'ar' ? 'رؤية الاحتياجات من داخل المشروع' : 'Project-linked procurement visibility'}
            href="procurement"
            icon={ShoppingCart}
            soon
          />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-primary">{t('recentProjects')}</p>
          <span className="text-xs text-text-muted">
            {t('tendersTotal', { count: formatNumber(tenderStats?.total ?? 0) })}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state py-10">
            <div className="empty-state-icon">
              <Activity className="h-6 w-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">{t('emptyState')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                href={`/${locale}/projects/${project.id}`}
                className="rounded-xl border border-surface-border bg-surface-card p-4 transition-all hover:border-brand/25 hover:shadow-card-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-text-muted">{project.code}</span>
                      <Badge variant={PROJECT_STATUS_VARIANT[project.status]}>
                        {t(`projectStatuses.${project.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{formatText(project.nameAr)}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {project.tender?.client.nameAr ? formatText(project.tender.client.nameAr) : t('directProject')}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {formatText(project.location)} · {formatNumber(project._count.userRoles)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-text-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
