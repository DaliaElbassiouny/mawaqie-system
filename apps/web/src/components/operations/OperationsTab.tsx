'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOperationsStats } from '@/hooks/useOperations';
import { formatCompactNumber, formatNumber } from '@/lib/utils';
import { ListView } from './ListView';
import { WeekView } from './WeekView';
import { DailyLogView } from './DailyLogView';
import { ApprovalsView } from './ApprovalsView';

type ViewTab = 'list' | 'week' | 'dailyLog' | 'approvals';

interface StatChipProps {
  count: number;
  label: string;
  dotColor: string;
  textColor: string;
}

function StatChip({ count, label, dotColor, textColor }: StatChipProps) {
  if (count === 0) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className={`font-semibold ${textColor}`} dir="ltr">{formatNumber(count)}</span>
      <span className="text-text-muted hidden sm:inline">{label}</span>
    </span>
  );
}

interface StatDetailProps {
  label: string;
  value: number;
  accent?: string;
}

function StatDetail({ label, value, accent }: StatDetailProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <p className="text-[11px] text-text-muted leading-none">{label}</p>
      <p className={`text-xl font-bold leading-none ${accent ?? 'text-text-primary'}`} dir="ltr">
        {formatCompactNumber(value)}
      </p>
    </div>
  );
}

function CompactStatsSummary({ projectId }: { projectId: string }) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const [expanded, setExpanded] = useState(false);

  const { data: stats, isLoading } = useOperationsStats(projectId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-xs text-text-muted">{tc('loading')}</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-text-primary" dir="ltr">
            {formatCompactNumber(stats.total)}
          </span>
          <span className="text-xs text-text-muted">{t('stats.total')}</span>
        </div>

        <div className="h-4 w-px bg-surface-border hidden sm:block" />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatChip count={stats.inProgress} label={t('stats.inProgress')} dotColor="bg-brand" textColor="text-brand" />
          <StatChip count={stats.completed} label={t('stats.completed')} dotColor="bg-emerald-400" textColor="text-emerald-400" />
          <StatChip count={stats.delayed} label={t('stats.delayed')} dotColor="bg-amber-400" textColor="text-amber-400" />
          <StatChip count={stats.blocked} label={t('stats.blocked')} dotColor="bg-red-400" textColor="text-red-400" />
          <StatChip count={stats.notStarted} label={t('stats.notStarted')} dotColor="bg-surface-active" textColor="text-text-muted" />
          <StatChip count={stats.pendingApproval} label={t('stats.pendingApproval')} dotColor="bg-amber-300" textColor="text-amber-300" />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ms-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-surface-border grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-surface-border rtl:divide-x-reverse">
          <StatDetail label={t('stats.total')} value={stats.total} />
          <StatDetail label={t('stats.inProgress')} value={stats.inProgress} accent="text-brand" />
          <StatDetail label={t('stats.completed')} value={stats.completed} accent="text-emerald-400" />
          <StatDetail label={t('stats.notStarted')} value={stats.notStarted} accent="text-text-muted" />
          <StatDetail label={t('stats.delayed')} value={stats.delayed} accent="text-amber-400" />
          <StatDetail label={t('stats.blocked')} value={stats.blocked} accent="text-red-400" />
          <StatDetail label={t('stats.pendingApproval')} value={stats.pendingApproval} accent="text-amber-300" />
        </div>
      )}
    </div>
  );
}

function ViewTabs({
  active,
  onChange,
}: {
  active: ViewTab;
  onChange: (v: ViewTab) => void;
}) {
  const t = useTranslations('operations');
  const TABS: { key: ViewTab; label: string }[] = [
    { key: 'list', label: t('views.list') },
    { key: 'week', label: t('views.week') },
    { key: 'dailyLog', label: t('views.dailyLog') },
    { key: 'approvals', label: t('views.approvals') },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-surface-card border border-surface-border w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === tab.key
              ? 'bg-brand text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface OperationsTabProps {
  projectId: string;
}

export function OperationsTab({ projectId }: OperationsTabProps) {
  const [activeView, setActiveView] = useState<ViewTab>('list');

  return (
    <div className="space-y-5">
      <CompactStatsSummary projectId={projectId} />
      <ViewTabs active={activeView} onChange={setActiveView} />
      {activeView === 'list' && <ListView projectId={projectId} />}
      {activeView === 'week' && <WeekView projectId={projectId} />}
      {activeView === 'dailyLog' && <DailyLogView projectId={projectId} />}
      {activeView === 'approvals' && <ApprovalsView projectId={projectId} />}
    </div>
  );
}
