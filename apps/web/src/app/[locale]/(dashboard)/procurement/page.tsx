'use client';

import { useState, useDeferredValue } from 'react';
import { useLocale } from 'next-intl';
import {
  Plus, Search, ShoppingCart, Clock, CheckCircle2,
  PackageCheck, ChevronLeft, ChevronRight, SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatDateWithEnglishDigits, formatNumber } from '@/lib/utils';
import {
  useProcurementDashboard,
  usePurchaseRequests,
  type PurchaseRequest,
  type PRStatus,
  type PRPriority,
  type PRRequirementType,
} from '@/hooks/useProcurement';
import { useProjects } from '@/hooks/useProjects';
import { PurchaseRequestDrawer } from '@/components/procurement/PurchaseRequestDrawer';

// ─── Config maps ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PRStatus, { ar: string; en: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info' }> = {
  DRAFT:               { ar: 'مسودة',         en: 'Draft',               variant: 'muted' },
  SUBMITTED:           { ar: 'مقدم',          en: 'Submitted',           variant: 'info' },
  UNDER_REVIEW:        { ar: 'قيد المراجعة',  en: 'Under Review',        variant: 'warning' },
  APPROVED:            { ar: 'معتمد',         en: 'Approved',            variant: 'success' },
  REJECTED:            { ar: 'مرفوض',         en: 'Rejected',            variant: 'danger' },
  CANCELLED:           { ar: 'ملغي',          en: 'Cancelled',           variant: 'muted' },
  PARTIALLY_FULFILLED: { ar: 'منفذ جزئياً',   en: 'Partially Fulfilled', variant: 'warning' },
  FULFILLED:           { ar: 'منفذ',          en: 'Fulfilled',           variant: 'success' },
  RECEIVED:            { ar: 'مستلم',         en: 'Received',            variant: 'success' },
};

const PRIORITY_CONFIG: Record<PRPriority, { ar: string; en: string; color: string }> = {
  LOW:    { ar: 'منخفضة', en: 'Low',    color: 'text-text-muted' },
  MEDIUM: { ar: 'متوسطة', en: 'Medium', color: 'text-amber-400' },
  HIGH:   { ar: 'عالية',  en: 'High',   color: 'text-red-400' },
};

const TYPE_CONFIG: Record<PRRequirementType, { ar: string; en: string }> = {
  MATERIALS: { ar: 'مواد',  en: 'Materials' },
  EQUIPMENT: { ar: 'معدات', en: 'Equipment' },
  SERVICES:  { ar: 'خدمات', en: 'Services' },
  OTHER:     { ar: 'أخرى',  en: 'Other' },
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
  accent: string;
}) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-start gap-3">
      <div className={cn('rounded-lg p-2 flex-shrink-0', accent)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-surface-hover rounded mt-1 animate-pulse" />
        ) : (
          <p className="text-xl font-bold text-text-primary tabular-nums">{formatNumber(value)}</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProcurementPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  // Filters
  const [rawSearch, setRawSearch] = useState('');
  const search = useDeferredValue(rawSearch);
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [reqType, setReqType] = useState('');
  const [page, setPage] = useState(1);

  // Drawer
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // Data
  const { data: dashboard, isLoading: dashLoading } = useProcurementDashboard();
  const { data: projectsData } = useProjects({ page: 1, limit: 100 });
  const projects = projectsData?.items ?? [];

  const filterParams: Record<string, unknown> = { page, limit: 15 };
  if (search) filterParams.search = search;
  if (projectId) filterParams.projectId = projectId;
  if (status) filterParams.status = status;
  if (priority) filterParams.priority = priority;
  if (reqType) filterParams.requirementType = reqType;

  const { data: requestsPage, isLoading: listLoading } = usePurchaseRequests(filterParams);
  const requests = requestsPage?.items ?? [];
  const totalCount = requestsPage?.total ?? 0;
  const totalPages = requestsPage?.totalPages ?? 1;

  const openCreate = () => { setSelectedRequest(null); setDrawerMode('create'); };
  const openView = (req: PurchaseRequest) => { setSelectedRequest(req); setDrawerMode('view'); };
  const closeDrawer = () => { setDrawerMode(null); setSelectedRequest(null); };

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isAr ? 'المشتريات' : 'Procurement'}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {isAr ? 'إنشاء ومتابعة طلبات الشراء' : 'Create and track purchase requests'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isAr ? 'طلب جديد' : 'New Request'}
        </button>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={ShoppingCart}
          label={isAr ? 'إجمالي الطلبات' : 'Total Requests'}
          value={dashboard?.summary.total ?? 0}
          loading={dashLoading}
          accent="bg-blue-500/10 text-blue-400"
        />
        <KpiCard
          icon={Clock}
          label={isAr ? 'بانتظار الموافقة' : 'Pending Approval'}
          value={(dashboard?.summary.submitted ?? 0) + (dashboard?.summary.underReview ?? 0)}
          loading={dashLoading}
          accent="bg-amber-500/10 text-amber-400"
        />
        <KpiCard
          icon={CheckCircle2}
          label={isAr ? 'معتمد' : 'Approved'}
          value={dashboard?.summary.approved ?? 0}
          loading={dashLoading}
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <KpiCard
          icon={PackageCheck}
          label={isAr ? 'منفذ / مستلم' : 'Fulfilled / Received'}
          value={(dashboard?.summary.fulfilled ?? 0) + (requestsPage?.items.filter(r => r.status === 'RECEIVED').length ?? 0)}
          loading={dashLoading}
          accent="bg-purple-500/10 text-purple-400"
        />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <SlidersHorizontal className="w-4 h-4 text-text-muted flex-shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={rawSearch}
              onChange={(e) => { setRawSearch(e.target.value); resetPage(); }}
              placeholder={isAr ? 'بحث برقم PR أو الاسم أو المورد...' : 'Search by PR#, name, or vendor...'}
              className="field-input h-8 text-xs ps-8 w-full"
            />
          </div>

          {/* Project */}
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); resetPage(); }}
            className="field-select h-8 text-xs w-44"
          >
            <option value="">{isAr ? 'جميع المشاريع' : 'All Projects'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{isAr ? p.nameAr : (p.nameEn ?? p.nameAr)}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); resetPage(); }}
            className="field-select h-8 text-xs w-36"
          >
            <option value="">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
            {(Object.keys(STATUS_CONFIG) as PRStatus[]).map((s) => (
              <option key={s} value={s}>{isAr ? STATUS_CONFIG[s].ar : STATUS_CONFIG[s].en}</option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); resetPage(); }}
            className="field-select h-8 text-xs w-32"
          >
            <option value="">{isAr ? 'كل الأولويات' : 'All Priorities'}</option>
            {(Object.keys(PRIORITY_CONFIG) as PRPriority[]).map((p) => (
              <option key={p} value={p}>{isAr ? PRIORITY_CONFIG[p].ar : PRIORITY_CONFIG[p].en}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={reqType}
            onChange={(e) => { setReqType(e.target.value); resetPage(); }}
            className="field-select h-8 text-xs w-32"
          >
            <option value="">{isAr ? 'كل الأنواع' : 'All Types'}</option>
            {(Object.keys(TYPE_CONFIG) as PRRequirementType[]).map((t) => (
              <option key={t} value={t}>{isAr ? TYPE_CONFIG[t].ar : TYPE_CONFIG[t].en}</option>
            ))}
          </select>

          {/* Clear */}
          {(search || projectId || status || priority || reqType) && (
            <button
              onClick={() => { setRawSearch(''); setProjectId(''); setStatus(''); setPriority(''); setReqType(''); resetPage(); }}
              className="h-8 px-3 rounded-lg text-xs text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
            >
              {isAr ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {listLoading ? (
          <div className="flex items-center justify-center py-16 text-text-muted text-sm gap-2">
            <div className="h-5 w-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            {isAr ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <ShoppingCart className="w-10 h-10 opacity-20" />
            <p className="text-sm">{isAr ? 'لا توجد طلبات شراء مطابقة' : 'No purchase requests match the filters'}</p>
            <button onClick={openCreate} className="text-xs text-brand hover:underline">
              {isAr ? 'إنشاء طلب جديد' : 'Create a new request'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-hover/40">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'رقم PR' : 'PR #'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'المشروع' : 'Project'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'النوع' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'الأولوية' : 'Priority'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'التسليم المتوقع' : 'Expected Delivery'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap">
                    {isAr ? 'مقدم من' : 'Requested By'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {requests.map((req) => {
                  const statusCfg = STATUS_CONFIG[req.status];
                  const priorityCfg = PRIORITY_CONFIG[req.priority];
                  const typeCfg = TYPE_CONFIG[req.requirementType];
                  return (
                    <tr
                      key={req.id}
                      onClick={() => openView(req)}
                      className="hover:bg-surface-hover/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary whitespace-nowrap">
                        {req.prNumber}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-text-primary truncate">{req.nameAr}</p>
                        {req.nameEn && (
                          <p className="text-xs text-text-muted truncate">{req.nameEn}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono text-text-secondary">{req.project.code}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">
                        {isAr ? typeCfg.ar : typeCfg.en}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn('text-xs font-semibold', priorityCfg.color)}>
                          {isAr ? priorityCfg.ar : priorityCfg.en}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusCfg.variant}>
                          {isAr ? statusCfg.ar : statusCfg.en}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary tabular-nums">
                        {req.totalAmount
                          ? `${formatNumber(Number(req.totalAmount))} ${req.currency}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-muted">
                        {req.expectedDeliveryDate
                          ? formatDateWithEnglishDigits(req.expectedDeliveryDate, locale, { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-muted">
                        {req.requester?.nameAr ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {!listLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <p className="text-xs text-text-muted">
              {isAr
                ? `${totalCount} طلب — صفحة ${page} من ${totalPages}`
                : `${totalCount} requests — page ${page} of ${totalPages}`}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Drawer ────────────────────────────────────────────────────────── */}
      {drawerMode && (
        <PurchaseRequestDrawer
          mode={drawerMode}
          request={selectedRequest ?? undefined}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
