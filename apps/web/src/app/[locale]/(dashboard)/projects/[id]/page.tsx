'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  DollarSign,
  FileText,
  FolderOpen,
  MapPin,
  Pencil,
  Shield,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ProjectTeamModal } from '@/components/projects/ProjectTeamModal';
import { CostWorkspace } from '@/components/cost/CostWorkspace';
import { OperationsTab } from '@/components/operations/OperationsTab';
import { ProjectProcurementTab } from '@/components/procurement/ProjectProcurementTab';
import { useAuthStore } from '@/store/auth.store';
import {
  MISSING_VALUE,
  formatCurrency,
  formatDateWithEnglishDigits,
  formatNumber,
  formatText,
} from '@/lib/utils';
import {
  useAssignProjectTeam,
  useProject,
  useUpdateProject,
  type ProjectRecord,
  type ProjectStatus,
  type ProjectTeamPayload,
} from '@/hooks/useProjects';

type StatusMeta = {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'muted';
};

const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  PLANNING: { variant: 'warning' },
  ACTIVE: { variant: 'success' },
  ON_HOLD: { variant: 'default' },
  COMPLETED: { variant: 'muted' },
  CANCELLED: { variant: 'danger' },
};

type WorkspaceTab = 'operations' | 'procurement' | 'costControl' | 'documents';

const WORKSPACE_TABS: { key: WorkspaceTab; icon: React.ElementType }[] = [
  { key: 'operations', icon: Shield },
  { key: 'procurement', icon: Briefcase },
  { key: 'costControl', icon: DollarSign },
  { key: 'documents', icon: FileText },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue = typeof value === 'string' ? formatText(value) : value ?? MISSING_VALUE;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm text-text-primary font-medium">{displayValue}</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const params = useParams();
  const id = params.id as string;
  const { hasPermission } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('operations');

  const { data: project, isLoading, isError } = useProject(id);
  const updateMutation = useUpdateProject();
  const assignTeamMutation = useAssignProjectTeam();

  const BackIcon = isRtl ? ArrowLeft : ArrowRight;
  const canEdit = hasPermission('projects:update');

  const handleUpdate = async (payload: unknown, projectId?: string) => {
    if (!projectId) return;
    await updateMutation.mutateAsync({ id: projectId, data: payload });
    setEditOpen(false);
  };

  const handleTeamSubmit = async (payload: ProjectTeamPayload) => {
    await assignTeamMutation.mutateAsync({ id, data: payload });
    setTeamOpen(false);
  };

  if (!hasPermission('projects:view')) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-red-400">{tc('error')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <p className="text-sm text-text-muted">{tc('loading')}</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-red-400">{tc('error')}</p>
        <Link href={`/${locale}/projects`}>
          <Button variant="outline" size="sm">{tc('back')}</Button>
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[project.status];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/projects`}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <BackIcon className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{project.nameAr}</h1>
              <Badge variant={statusMeta.variant}>{t(`statuses.${project.status}`)}</Badge>
            </div>
            <p className="text-text-muted text-sm mt-0.5 font-mono">{project.code}</p>
            {project.nameEn && <p className="text-text-secondary text-sm">{project.nameEn}</p>}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={() => setTeamOpen(true)} variant="outline" size="sm" className="gap-2">
              <Users className="w-3.5 h-3.5" />
              {t('editTeam')}
            </Button>
            <Button onClick={() => setEditOpen(true)} variant="outline" size="sm" className="gap-2">
              <Pencil className="w-3.5 h-3.5" />
              {tc('edit')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <p className="text-xs text-text-muted">{t('contractValue')}</p>
          <p className="text-lg font-bold text-text-primary mt-2" dir="ltr">
            {formatCurrency(project.contractValue, project.currency)}
          </p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <p className="text-xs text-text-muted">{t('timeline')}</p>
          <p className="text-sm font-semibold text-text-primary mt-2">
            {formatDateWithEnglishDigits(project.startDate, locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {formatDateWithEnglishDigits(project.endDate, locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <p className="text-xs text-text-muted">{t('team')}</p>
          <p className="text-3xl font-bold text-brand mt-2">{formatNumber(project._count.userRoles)}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <p className="text-xs text-text-muted">{t('workspaceStatus')}</p>
          <Badge className="mt-3" variant={statusMeta.variant}>
            {t(`statuses.${project.status}`)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-text-muted">
            <FolderOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('sectionBasic')}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow label={t('client')} value={project.tender?.client.nameAr} />
            <InfoRow
              label={t('tender')}
              value={
                project.tender ? (
                  <Link href={`/${locale}/tenders/${project.tender.id}`} className="text-brand hover:underline">
                    {project.tender.code}
                  </Link>
                ) : MISSING_VALUE
              }
            />
            <InfoRow label={t('companyCode')} value={project.companyCode} />
            <InfoRow label={t('currency')} value={project.currency} />
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('sectionClassification')}</span>
          </div>
          <InfoRow label={t('location')} value={project.location} />
          <InfoRow label={t('projectType')} value={project.projectType} />
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('assignedTeam')}</span>
          </div>
          {canEdit && (
            <Button onClick={() => setTeamOpen(true)} variant="ghost" size="sm">
              {t('editTeam')}
            </Button>
          )}
        </div>

        {project.userRoles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-text-muted">
            {t('noTeam')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {project.userRoles.map((member) => (
              <div key={member.id} className="rounded-lg border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-semibold text-text-primary">{formatText(member.user.nameAr)}</p>
                {member.user.nameEn && (
                  <p className="text-xs text-text-muted">{formatText(member.user.nameEn)}</p>
                )}
                <p className="text-xs text-text-muted mt-2" dir="ltr">{member.user.email}</p>
                <Badge variant="default" className="mt-3">{formatText(member.role.nameAr)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="flex border-b border-surface-border overflow-x-auto">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-brand text-brand bg-surface-card'
                    : 'border-transparent text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(`tabs.${tab.key}.title`)}
                {tab.key === 'documents' && (
                  <Badge variant="muted" className="text-[10px] px-1.5 py-0">{t('foundationOnly')}</Badge>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {activeTab === 'operations' && <OperationsTab projectId={id} />}
          {activeTab === 'procurement' && <ProjectProcurementTab projectId={id} />}
          {activeTab === 'costControl' && <CostWorkspace projectId={id} />}
          {activeTab === 'documents' && (
            <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-text-muted">
              {t(`tabs.${activeTab}.description`)}
            </div>
          )}
        </div>
      </div>

      {project.notes && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-muted mb-3">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('notes')}</span>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">{formatText(project.notes)}</p>
        </div>
      )}

      <ProjectFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project as ProjectRecord}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />

      <ProjectTeamModal
        open={teamOpen}
        onOpenChange={setTeamOpen}
        project={project}
        onSubmit={handleTeamSubmit}
        isLoading={assignTeamMutation.isPending}
      />
    </div>
  );
}
