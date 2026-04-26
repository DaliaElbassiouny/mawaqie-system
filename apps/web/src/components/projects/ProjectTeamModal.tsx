'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { rbacApi, usersApi } from '@/lib/api';
import type { ProjectRecord, ProjectTeamPayload } from '@/hooks/useProjects';

interface UserOption {
  id: string;
  email: string;
  nameAr: string;
  nameEn: string | null;
}

interface RoleOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

interface TeamRow {
  userId: string;
  roleId: string;
}

interface ProjectTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRecord | null;
  onSubmit: (data: ProjectTeamPayload) => Promise<void>;
  isLoading: boolean;
}

export function ProjectTeamModal({
  open,
  onOpenChange,
  project,
  onSubmit,
  isLoading,
}: ProjectTeamModalProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const [rows, setRows] = useState<TeamRow[]>([]);

  const { data: users = [] } = useQuery({
    queryKey: ['project-team-users'],
    enabled: open,
    queryFn: async () => {
      const { data } = await usersApi.list({ limit: 200 });
      return (data as { data: { items: UserOption[] } }).data.items;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['project-team-roles'],
    enabled: open,
    queryFn: async () => {
      const { data } = await rbacApi.listRoles();
      return (data as { data: RoleOption[] }).data;
    },
  });

  useEffect(() => {
    if (!open) return;
    setRows(
      project?.userRoles.map((member) => ({
        userId: member.userId,
        roleId: member.roleId,
      })) ?? [],
    );
  }, [open, project]);

  const updateRow = (index: number, patch: Partial<TeamRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const submit = async () => {
    await onSubmit({
      members: rows.filter((row) => row.userId && row.roleId),
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('editTeam')}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-muted">{t('teamScopeHint')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setRows((current) => [...current, { userId: '', roleId: '' }])}
          >
            <Plus className="w-3.5 h-3.5" />
            {t('addMember')}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-hover p-6 text-center text-sm text-text-muted">
            {t('noTeam')}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={`${row.userId}-${row.roleId}-${index}`} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  value={row.userId}
                  onChange={(e) => updateRow(index, { userId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="">— {t('teamMember')} —</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nameAr} ({user.email})
                    </option>
                  ))}
                </select>

                <select
                  value={row.roleId}
                  onChange={(e) => updateRow(index, { roleId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-surface-border bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="">— {t('role')} —</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nameAr} ({role.code})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  className="h-9 px-3 rounded-md text-text-muted hover:text-red-400 hover:bg-surface-hover transition-colors"
                  title={tc('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4 justify-end border-t border-surface-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tc('cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={isLoading}>
            {isLoading ? tc('loading') : tc('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
