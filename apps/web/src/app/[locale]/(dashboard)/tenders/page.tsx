'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  FileText, Plus, Search, Pencil, Trash2,
  ChevronLeft, ChevronRight, TrendingUp, CheckCircle2,
  Clock, XCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TenderFormModal } from '@/components/tenders/TenderFormModal';
import { useAuthStore } from '@/store/auth.store';
import {
  formatCompactNumber,
  formatCurrency,
  formatDateWithEnglishDigits,
  formatNumber,
  formatPercent,
  formatText,
} from '@/lib/utils';
import {
  useTenders,
  useTenderStats,
  useCreateTender,
  useUpdateTender,
  useRemoveTender,
  type TenderRecord,
  type TenderStatus,
} from '@/hooks/useTenders';

const PAGE_SIZE = 25;

type StatusMeta = {
  label: string;
  labelEn: string;
  variant: 'warning' | 'default' | 'success' | 'danger';
  color: string;
  icon: React.ElementType;
};

const STATUS_META: Record<TenderStatus, StatusMeta> = {
  PRICING_IN_PROGRESS: {
    label: 'قيد التسعير',
    labelEn: 'Pricing In Progress',
    variant: 'warning',
    color: '#f59e0b',
    icon: Clock,
  },
  PRICED_SUBMITTED: {
    label: 'تم التقديم',
    labelEn: 'Priced & Submitted',
    variant: 'default',
    color: '#1e6fba',
    icon: TrendingUp,
  },
  CONTRACTED: {
    label: 'محل عقد',
    labelEn: 'Contracted / Awarded',
    variant: 'success',
    color: '#10b981',
    icon: CheckCircle2,
  },
  LOST: {
    label: 'لم تُرسَ',
    labelEn: 'Lost',
    variant: 'danger',
    color: '#ef4444',
    icon: XCircle,
  },
};

export default function TendersPage() {
  const t = useTranslations('tenders');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { hasPermission } = useAuthStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenderStatus | ''>('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<TenderRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading, isError } = useTenders({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    location: locationFilter || undefined,
    projectType: typeFilter || undefined,
  });

  const { data: stats } = useTenderStats();
  const createMutation = useCreateTender();
  const updateMutation = useUpdateTender();
  const removeMutation = useRemoveTender();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const val = e.target.value;
    const t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, []);

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

  const canCreate = hasPermission('tenders:create');
  const canEdit = hasPermission('tenders:update');
  const canDelete = hasPermission('tenders:delete');

  const tenders = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const statusLabels = Object.fromEntries(
    Object.entries(STATUS_META).map(([k, v]) => [k, v.label]),
  ) as Record<TenderStatus, string>;

  // Pie chart data
  const pieData = stats
    ? Object.entries(STATUS_META).map(([key, meta]) => ({
        name: meta.label,
        value: stats.byStatus[key as TenderStatus] ?? 0,
        color: meta.color,
      })).filter((d) => d.value > 0)
    : [];

  const statCards = [
    {
      key: 'PRICING_IN_PROGRESS' as TenderStatus,
      label: STATUS_META.PRICING_IN_PROGRESS.label,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      key: 'PRICED_SUBMITTED' as TenderStatus,
      label: STATUS_META.PRICED_SUBMITTED.label,
      icon: TrendingUp,
      color: 'text-brand',
      bg: 'bg-brand/10 border-brand/20',
    },
    {
      key: 'CONTRACTED' as TenderStatus,
      label: STATUS_META.CONTRACTED.label,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      key: 'LOST' as TenderStatus,
      label: STATUS_META.LOST.label,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setSelected(null); setModalOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('newTender')}
          </Button>
        )}
      </div>

      {/* Summary cards + chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Total card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col justify-between">
          <p className="text-xs text-text-muted">{t('totalTenders')}</p>
          <p className="text-3xl font-bold text-text-primary mt-2">
            {stats ? formatCompactNumber(stats.total) : '—'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {t('estimatedTotal')}: {formatCurrency(stats?.totalEstimatedValue ?? null)}
          </p>
        </div>

        {/* Status cards */}
        {statCards.map((card) => {
          const Icon = card.icon;
          const count = stats?.byStatus[card.key] ?? 0;
          return (
            <button
              key={card.key}
              onClick={() => { setStatusFilter(statusFilter === card.key ? '' : card.key); setPage(1); }}
              className={`bg-surface-card border rounded-xl p-4 text-start transition-colors hover:border-opacity-60 ${
                statusFilter === card.key ? card.bg : 'border-surface-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-muted">{card.label}</p>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{formatCompactNumber(count)}</p>
              {stats && stats.total > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  {formatPercent(Math.round((count / stats.total) * 100))}
                </p>
              )}
            </button>
          );
        })}

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col items-center justify-center lg:col-span-1">
            <p className="text-xs text-text-muted mb-2">{t('distribution')}</p>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={44}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f2442', border: '1px solid #1e3f6e', borderRadius: 8, fontSize: 12 }}
                  formatter={(val, name) => [formatNumber(Number(val)), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder={t('searchPlaceholder')}
            className="ps-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as TenderStatus | ''); setPage(1); }}
          className="h-9 rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="">{t('allStatuses')}</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <Input
          value={locationFilter}
          onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
          placeholder={t('filterLocation')}
          className="w-36"
        />
        <Input
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          placeholder={t('filterType')}
          className="w-36"
        />
        {(statusFilter || locationFilter || typeFilter || debouncedSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter(''); setLocationFilter(''); setTypeFilter('');
              setSearch(''); setDebouncedSearch(''); setPage(1);
            }}
          >
            {tc('reset')}
          </Button>
        )}
      </div>

      {/* Table */}
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
        ) : tenders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <FileText className="w-16 h-16 opacity-20" />
            <p className="text-sm">{tc('noData')}</p>
            {canCreate && (
              <Button variant="outline" size="sm" onClick={() => { setSelected(null); setModalOpen(true); }} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                {t('newTender')}
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
                      t('code'), t('nameAr'), t('client'),
                      t('location'), t('estimatedValue'),
                      t('dueDate'), t('status'), t('assignedEngineer'),
                      ...(canEdit || canDelete ? [tc('actions')] : []),
                    ].map((h) => (
                      <th key={h} className="px-3 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {tenders.map((tender) => {
                    const meta = STATUS_META[tender.status];
                    return (
                      <tr key={tender.id} className="hover:bg-surface-hover transition-colors group">
                        <td className="px-3 py-3 font-mono text-xs text-brand whitespace-nowrap">
                          <Link href={`/${locale}/tenders/${tender.id}`} className="hover:underline">
                            {tender.code}
                          </Link>
                        </td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <div className="font-medium text-text-primary truncate">{formatText(tender.nameAr)}</div>
                          {tender.nameEn && <div className="text-xs text-text-muted truncate">{formatText(tender.nameEn)}</div>}
                        </td>
                        <td className="px-3 py-3 text-text-secondary whitespace-nowrap">
                          {formatText(tender.client.nameAr)}
                        </td>
                        <td className="px-3 py-3 text-text-secondary">
                          {formatText(tender.location)}
                        </td>
                        <td className="px-3 py-3 text-text-secondary whitespace-nowrap" dir="ltr">
                          {formatCurrency(tender.estimatedValue, tender.currency)}
                        </td>
                        <td className="px-3 py-3 text-text-secondary whitespace-nowrap">
                          {formatDateWithEnglishDigits(tender.dueDate, locale, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-3 py-3 text-text-secondary">
                          {formatText(tender.assignedEngineer)}
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEdit && (
                                <button
                                  onClick={() => { setSelected(tender); setModalOpen(true); }}
                                  className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-surface-hover transition-colors"
                                  title={tc('edit')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => setDeleteConfirm(tender.id)}
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

            {/* Pagination */}
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

      {/* Form Modal */}
      <TenderFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tender={selected}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        statusLabels={statusLabels}
      />

      {/* Delete Confirm */}
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
