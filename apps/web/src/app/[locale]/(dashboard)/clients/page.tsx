'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { useAuthStore } from '@/store/auth.store';
import { formatNumber, formatText, toEnglishDigits } from '@/lib/utils';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useRemoveClient,
  type ClientRecord,
} from '@/hooks/useClients';

const PAGE_SIZE = 25;

export default function ClientsPage() {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const { hasPermission } = useAuthStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading, isError } = useClients({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const removeMutation = useRemoveClient();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const val = e.target.value;
    const timer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const openCreate = () => {
    setSelectedClient(null);
    setModalOpen(true);
  };

  const openEdit = (client: ClientRecord) => {
    setSelectedClient(client);
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

  const canCreate = hasPermission('clients:create');
  const canEdit = hasPermission('clients:update');
  const canDelete = hasPermission('clients:delete');

  const clients = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="text-text-muted text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('newClient')}
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder={t('searchPlaceholder')}
            className="ps-9"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            <p className="text-sm text-text-muted">{tc('loading')}</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-sm text-red-400">{tc('error')}</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <Building2 className="w-16 h-16 opacity-20" />
            <p className="text-sm">{tc('noData')}</p>
            {canCreate && (
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                {t('newClient')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-hover">
                    <th className="px-4 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider">
                      {t('code')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider">
                      {t('nameAr')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                      {t('phone')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                      {t('email')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider">
                      {tc('status')}
                    </th>
                    {(canEdit || canDelete) && (
                      <th className="px-4 py-3 text-start text-xs font-medium text-text-muted uppercase tracking-wider">
                        {tc('actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-surface-hover transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-brand">
                        {toEnglishDigits(client.code)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{formatText(client.nameAr)}</div>
                        {client.nameEn && (
                          <div className="text-xs text-text-muted">{formatText(client.nameEn)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden md:table-cell" dir="ltr">
                        {toEnglishDigits(formatText(client.phone))}
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden lg:table-cell" dir="ltr">
                        {formatText(client.email)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={client.isActive ? 'success' : 'muted'}>
                          {client.isActive ? t('active') : t('inactive')}
                        </Badge>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && (
                              <button
                                onClick={() => openEdit(client)}
                                className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-surface-hover transition-colors"
                                title={tc('edit')}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteConfirm(client.id)}
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border text-sm text-text-muted">
                <span>
                  {tc('total')}: {formatNumber(total)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                  <span>
                    {tc('page')} {formatNumber(page)} {tc('of')} {formatNumber(totalPages)}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      <ClientFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        client={selectedClient}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 bg-surface-card border border-surface-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-text-primary mb-2">
              {t('confirmDelete')}
            </h3>
            <p className="text-sm text-text-muted mb-6">{t('confirmDeleteDesc')}</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
                disabled={removeMutation.isPending}
              >
                {tc('cancel')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? tc('loading') : tc('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
