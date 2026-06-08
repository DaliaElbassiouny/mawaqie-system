'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { useAuthStore } from '@/store/auth.store';
import {
  MISSING_VALUE,
  formatCompactNumber,
  formatCurrency,
  formatNumber,
  formatText,
} from '@/lib/utils';
import {
  useCreateProject,
  useProjects,
  useRemoveProject,
  useUpdateProject,
  type ProjectRecord,
  type ProjectStatus,
} from '@/hooks/useProjects';

const PAGE_SIZE = 25;

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

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === 'ar';
  const { hasPermission } = useAuthStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useProjects({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  });

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const removeMutation = useRemoveProject();

  const canCreate = hasPermission('projects:create');
  const canEdit = hasPermission('projects:update');
  const canDelete = hasPermission('projects:delete');

  const projects = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const activeCount = projects.filter((project) => project.status === 'ACTIVE').length;
  const planningCount = projects.filter((project) => project.status === 'PLANNING').length;
  const shownContractValue = projects.reduce((sum, project) => {
    const value = project.contractValue ? parseFloat(project.contractValue) : 0;
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  const openCreate = () => {
    setSelectedProject(null);
    setModalOpen(true);
  };

  const openEdit = (project: ProjectRecord) => {
    setSelectedProject(project);
    setModalOpen(true);
  };

  const handleFormSubmit = async (payload: unknown, id?: string) => {
    if (id) {
      await updateMutation.mutateAsync({ id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await removeMutation.mutateAsync(id);
    setDeleteConfirm(null);
  };

  if (!hasPermission('projects:view')) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-red-400">{tc('error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('newProject')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">{t('totalProjects')}</p>
            <FolderOpen className="w-4 h-4 text-brand" />
          </div>
          <p className="text-3xl font-bold text-text-primary mt-2">{formatCompactNumber(total)}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">{t('activeProjects')}</p>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{formatCompactNumber(activeCount)}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">{t('planningProjects')}</p>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-400 mt-2">{formatCompactNumber(planningCount)}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">{t('shownContractValue')}</p>
            <ClipboardList className="w-4 h-4 text-brand" />
          </div>
          <p className="text-lg font-bold text-text-primary mt-3" dir="ltr">
            {formatCurrency(shownContractValue, 'SAR')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="ps-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ProjectStatus | '');
            setPage(1);
          }}
          className="h-9 rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="">{t('allStatuses')}</option>
          {Object.keys(STATUS_META).map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </select>
        {(statusFilter || debouncedSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setSearch('');
              setDebouncedSearch('');
              setPage(1);
            }}
          >
            {tc('reset')}
          </Button>
        )}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            <p className="text-sm text-text-muted">{tc('loading')}</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-red-400">{tc('error')}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <FolderOpen className="w-16 h-16 opacity-20" />
            <p className="text-sm">{tc('noData')}</p>
            {canCreate && (
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                {t('newProject')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-card">
                    {[
                      t('code'),
                      t('nameAr'),
                      t('client'),
                      t('location'),
                      t('contractValue'),
                      t('status'),
                      t('team'),
                      ...(canEdit || canDelete ? [tc('actions')] : []),
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-3 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {projects.map((project) => {
                    const meta = STATUS_META[project.status];
                    return (
                      <tr
                        key={project.id}
                        onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                        className="hover:bg-surface-hover transition-colors group cursor-pointer"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-brand whitespace-nowrap hover:underline">
                          {project.code}
                        </td>
                        <td className="px-3 py-3 max-w-[240px]">
                          <div className="font-medium text-text-primary truncate">{project.nameAr}</div>
                          {project.nameEn && (
                            <div className="text-xs text-text-muted truncate">{project.nameEn}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-text-secondary whitespace-nowrap">
                          {formatText(project.tender?.client.nameAr)}
                        </td>
                        <td className="px-3 py-3 text-text-secondary">
                          <div>{formatText(project.location)}</div>
                          {project.projectType && formatText(project.projectType) !== MISSING_VALUE && (
                            <div className="text-xs text-text-muted">{formatText(project.projectType)}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-text-secondary whitespace-nowrap" dir="ltr">
                          {formatCurrency(project.contractValue, project.currency)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Badge variant={meta.variant}>{t(`statuses.${project.status}`)}</Badge>
                        </td>
                        <td className="px-3 py-3 text-text-secondary whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-text-muted" />
                            {formatNumber(project._count.userRoles)}
                          </span>
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEdit && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                                  className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-surface-hover transition-colors"
                                  title={tc('edit')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                                  className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-surface-hover transition-colors"
                                  title={tc('delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border text-sm text-text-muted">
                <span>{tc('total')}: {formatNumber(total)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                  <span>{tc('page')} {formatNumber(page)} {tc('of')} {formatNumber(totalPages)}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ProjectFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        project={selectedProject}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 bg-surface-card border border-surface-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-text-primary mb-2">{t('confirmDelete')}</h3>
            <p className="text-sm text-text-muted mb-6">{t('confirmDeleteDesc')}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} disabled={removeMutation.isPending}>
                {tc('cancel')}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteConfirm)} disabled={removeMutation.isPending}>
                {removeMutation.isPending ? tc('loading') : tc('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
