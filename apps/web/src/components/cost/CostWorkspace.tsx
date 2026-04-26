'use client';

import React, { useState } from 'react';
import { DollarSign, LayoutGrid, FileText, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { useCostOverview } from '@/hooks/useCost';
import { CostOverviewTab } from './CostOverviewTab';
import { CostSheetTab } from './CostSheetTab';
import { InvoiceRegisterTab } from './InvoiceRegisterTab';
import { ExtractsTab } from './ExtractsTab';

type CostTab = 'overview' | 'costSheet' | 'invoices' | 'extracts';

const TABS: { key: CostTab; icon: React.ElementType }[] = [
  { key: 'overview', icon: LayoutGrid },
  { key: 'costSheet', icon: DollarSign },
  { key: 'invoices', icon: FileText },
  { key: 'extracts', icon: Receipt },
];

interface CostWorkspaceProps {
  projectId: string;
}

export function CostWorkspace({ projectId }: CostWorkspaceProps) {
  const t = useTranslations('costControl');
  const tc = useTranslations('common');
  const { hasPermission } = useAuthStore();
  const canView = hasPermission('cost:view');
  const canEdit = hasPermission('cost:create') || hasPermission('cost:update');

  const [activeTab, setActiveTab] = useState<CostTab>('overview');
  const { data, isLoading, isError } = useCostOverview(canView ? projectId : '');

  if (!canView) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
        <DollarSign className="mx-auto h-8 w-8 text-text-muted mb-3" />
        <p className="text-sm text-text-muted">{t('noAccess')}</p>
      </div>
    );
  }

  const TAB_LABELS: Record<CostTab, string> = {
    overview: t('tabs.overview'),
    costSheet: t('tabs.costSheet'),
    invoices: t('tabs.invoices'),
    extracts: t('tabs.extracts'),
  };

  return (
    <div className="space-y-0">
      {/* Tab bar — underline style, seamless with card below */}
      <div className="flex border-b border-surface-border overflow-x-auto">
        {TABS.map(({ key, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-surface-active'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="pt-5">
        {activeTab === 'overview' && (
          isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-6 w-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-sm text-text-muted">{tc('loading')}</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <DollarSign className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">{tc('error')}</p>
            </div>
          ) : (
            <CostOverviewTab data={data} />
          )
        )}
        {activeTab === 'costSheet' && <CostSheetTab projectId={projectId} canEdit={canEdit} />}
        {activeTab === 'invoices' && <InvoiceRegisterTab projectId={projectId} canEdit={canEdit} />}
        {activeTab === 'extracts' && <ExtractsTab projectId={projectId} canEdit={canEdit} />}
      </div>
    </div>
  );
}
