'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { useActivities, useApproveActivity, type ActivityRecord } from '@/hooks/useOperations';
import { formatDateWithEnglishDigits, formatNumber, formatText } from '@/lib/utils';
import { ActivityDrawer } from './ActivityDrawer';

function ApprovalCard({
  activity,
  projectId,
  canApprove,
  onViewDetail,
}: {
  activity: ActivityRecord;
  projectId: string;
  canApprove: boolean;
  onViewDetail: () => void;
}) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [note, setNote] = useState('');
  const approveMutation = useApproveActivity(projectId);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-text-muted">{activity.code}</span>
            <Badge variant="warning">{t('approvalStatuses.PENDING')}</Badge>
            <span className="text-xs text-text-muted">{t(`categories.${activity.category}`)}</span>
          </div>
          <p className="text-sm font-semibold text-text-primary mt-1">{formatText(activity.nameAr)}</p>
          {activity.nameEn && (
            <p className="text-xs text-text-secondary">{formatText(activity.nameEn)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onViewDetail}
          className="text-xs text-brand hover:underline flex-shrink-0"
        >
          {tc('edit')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
        {activity.plannedStart && (
          <span>
            {t('plannedStart')}: {formatDateWithEnglishDigits(activity.plannedStart, locale, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </span>
        )}
        {activity.plannedEnd && (
          <span>
            {t('plannedEnd')}: {formatDateWithEnglishDigits(activity.plannedEnd, locale, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </span>
        )}
        {activity.responsibleUser && (
          <span className="col-span-2">{t('responsibleUser')}: {formatText(activity.responsibleUser.nameAr)}</span>
        )}
      </div>

      {canApprove && (
        <div className="pt-3 border-t border-surface-border space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('approvalNote')}
            rows={2}
            className="flex w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                approveMutation.mutate({ activityId: activity.id, decision: 'APPROVED', note })
              }
              disabled={approveMutation.isPending}
            >
              {t('approve')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() =>
                approveMutation.mutate({ activityId: activity.id, decision: 'REJECTED', note })
              }
              disabled={approveMutation.isPending}
            >
              {t('reject')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ApprovalsViewProps {
  projectId: string;
}

export function ApprovalsView({ projectId }: ApprovalsViewProps) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const { hasPermission } = useAuthStore();
  const canApprove = hasPermission('operations:approve');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityRecord | null>(null);

  const { data, isLoading } = useActivities(projectId, {
    approvalStatus: 'PENDING',
    limit: 100,
  });
  const pending = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-sm text-text-muted">{tc('loading')}</span>
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
        <p className="text-sm text-text-muted">{t('noPendingApprovals')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-text-primary">
        {t('pendingApprovals')} ({formatNumber(pending.length)})
      </h3>
      <div className="space-y-3">
        {pending.map((activity) => (
          <ApprovalCard
            key={activity.id}
            activity={activity}
            projectId={projectId}
            canApprove={canApprove}
            onViewDetail={() => {
              setSelected(activity);
              setDrawerOpen(true);
            }}
          />
        ))}
      </div>

      <ActivityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projectId={projectId}
        activity={selected}
      />
    </div>
  );
}
