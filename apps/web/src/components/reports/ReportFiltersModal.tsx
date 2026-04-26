'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { type ReportFilters } from '@/hooks/useReports';
import type { ProjectRecord } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import {
  type FilterLayout,
  type TranslateFn,
  cleanFilters,
  getStatusOptions,
  supportsField,
} from './report-config';
import { FilterField, ToggleRow } from './ReportsShared';

function selectClassName() {
  return cn(
    'flex h-9 w-full rounded-lg px-3 py-1 text-sm',
    'bg-surface-card border border-surface-border text-text-primary',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-brand/50 focus-visible:border-brand/60 transition-colors duration-150',
  );
}

export function ReportFiltersModal({
  open,
  onOpenChange,
  report,
  filters,
  setFilters,
  onApply,
  projects,
  labels,
  t,
  tc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: FilterLayout;
  filters: ReportFilters;
  setFilters: (filters: ReportFilters) => void;
  onApply?: (filters: ReportFilters) => void;
  projects: ProjectRecord[];
  labels: Record<string, string>;
  t: TranslateFn;
  tc: TranslateFn;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('filters.title')}
      description={t('filters.description')}
      size="lg"
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FilterField label={t('filters.project')}>
            <select
              className={selectClassName()}
              value={filters.projectId ?? ''}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  projectId: event.target.value || undefined,
                })
              }
            >
              <option value="">{t('filters.allProjects')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.nameAr}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label={t('filters.client')}>
            <Input
              value={filters.client ?? ''}
              onChange={(event) => setFilters({ ...filters, client: event.target.value || undefined })}
              placeholder={t('filters.clientPlaceholder')}
            />
          </FilterField>

          <FilterField label={t('filters.search')}>
            <Input
              value={filters.search ?? ''}
              onChange={(event) => setFilters({ ...filters, search: event.target.value || undefined })}
              placeholder={t('filters.searchPlaceholder')}
            />
          </FilterField>

          {supportsField(report, 'status') ? (
            <FilterField label={t('filters.status')}>
              <select
                className={selectClassName()}
                value={filters.status ?? ''}
                onChange={(event) => setFilters({ ...filters, status: event.target.value || undefined })}
              >
                <option value="">{t('filters.allStatuses')}</option>
                {getStatusOptions(report, labels).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>
          ) : null}

          {supportsField(report, 'category') ? (
            <FilterField label={t('filters.category')}>
              <Input
                value={filters.category ?? ''}
                onChange={(event) => setFilters({ ...filters, category: event.target.value || undefined })}
                placeholder={t('filters.categoryPlaceholder')}
              />
            </FilterField>
          ) : null}

          {supportsField(report, 'assignee') ? (
            <FilterField label={t('filters.assignee')}>
              <Input
                value={filters.assignee ?? ''}
                onChange={(event) => setFilters({ ...filters, assignee: event.target.value || undefined })}
                placeholder={t('filters.assigneePlaceholder')}
              />
            </FilterField>
          ) : null}

          {supportsField(report, 'vendor') ? (
            <FilterField label={t('filters.vendor')}>
              <Input
                value={filters.vendor ?? ''}
                onChange={(event) => setFilters({ ...filters, vendor: event.target.value || undefined })}
                placeholder={t('filters.vendorPlaceholder')}
              />
            </FilterField>
          ) : null}

          {supportsField(report, 'costCode') ? (
            <FilterField label={t('filters.costCode')}>
              <Input
                value={filters.costCode ?? ''}
                onChange={(event) => setFilters({ ...filters, costCode: event.target.value || undefined })}
                placeholder={t('filters.costCodePlaceholder')}
              />
            </FilterField>
          ) : null}

          {supportsField(report, 'requirementType') ? (
            <FilterField label={t('filters.requirementType')}>
              <select
                className={selectClassName()}
                value={filters.requirementType ?? ''}
                onChange={(event) => setFilters({ ...filters, requirementType: event.target.value || undefined })}
              >
                <option value="">{t('filters.allTypes')}</option>
                <option value="MATERIALS">{labels.MATERIALS}</option>
                <option value="EQUIPMENT">{labels.EQUIPMENT}</option>
              </select>
            </FilterField>
          ) : null}

          {supportsField(report, 'requirementStatus') ? (
            <FilterField label={t('filters.requirementStatus')}>
              <select
                className={selectClassName()}
                value={filters.requirementStatus ?? ''}
                onChange={(event) => setFilters({ ...filters, requirementStatus: event.target.value || undefined })}
              >
                <option value="">{t('filters.allRequirements')}</option>
                {['PENDING', 'REQUESTED', 'PARTIALLY_AVAILABLE', 'AVAILABLE', 'BLOCKED'].map((value) => (
                  <option key={value} value={value}>
                    {labels[value]}
                  </option>
                ))}
              </select>
            </FilterField>
          ) : null}

          {supportsField(report, 'startDate') ? (
            <FilterField label={t('filters.startDate')}>
              <Input
                type="date"
                value={filters.startDate ?? ''}
                onChange={(event) => setFilters({ ...filters, startDate: event.target.value || undefined })}
              />
            </FilterField>
          ) : null}

          {supportsField(report, 'endDate') ? (
            <FilterField label={t('filters.endDate')}>
              <Input
                type="date"
                value={filters.endDate ?? ''}
                onChange={(event) => setFilters({ ...filters, endDate: event.target.value || undefined })}
              />
            </FilterField>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {supportsField(report, 'blockedOnly') ? (
            <ToggleRow
              label={t('filters.blockedOnly')}
              checked={Boolean(filters.blockedOnly)}
              onChange={(checked) => setFilters({ ...filters, blockedOnly: checked || undefined })}
            />
          ) : null}
          {supportsField(report, 'delayedOnly') ? (
            <ToggleRow
              label={t('filters.delayedOnly')}
              checked={Boolean(filters.delayedOnly)}
              onChange={(checked) => setFilters({ ...filters, delayedOnly: checked || undefined })}
            />
          ) : null}
          {supportsField(report, 'blockersOnly') ? (
            <ToggleRow
              label={t('filters.blockersOnly')}
              checked={Boolean(filters.blockersOnly)}
              onChange={(checked) => setFilters({ ...filters, blockersOnly: checked || undefined })}
            />
          ) : null}
          {supportsField(report, 'procurementRiskOnly') ? (
            <ToggleRow
              label={t('filters.procurementRiskOnly')}
              checked={Boolean(filters.procurementRiskOnly)}
              onChange={(checked) => setFilters({ ...filters, procurementRiskOnly: checked || undefined })}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={() => setFilters({})}>
            {t('actions.resetFilters')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => {
                const normalized = cleanFilters(filters);
                if (onApply) onApply(normalized);
                else setFilters(normalized);
                onOpenChange(false);
              }}
            >
              {t('actions.applyFilters')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
