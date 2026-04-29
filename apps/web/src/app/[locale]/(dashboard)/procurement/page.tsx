'use client';

import { useDeferredValue, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PurchaseRequestDrawer } from '@/components/procurement/PurchaseRequestDrawer';
import {
  useProcurementDashboard,
  usePurchaseRequests,
  type PRPriority,
  type PRRequirementType,
  type PRStatus,
  type PurchaseRequest,
} from '@/hooks/useProcurement';
import { useProjects } from '@/hooks/useProjects';
import { cn, formatDateWithEnglishDigits, formatNumber } from '@/lib/utils';

const EMPTY_VALUE = '—';

const STATUS_CONFIG: Record<
  PRStatus,
  {
    ar: string;
    en: string;
    variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info';
  }
> = {
  DRAFT: { ar: 'مسودة', en: 'Draft', variant: 'muted' },
  SUBMITTED: { ar: 'مقدم', en: 'Submitted', variant: 'info' },
  PENDING_APPROVAL: { ar: 'بانتظار الاعتماد', en: 'Pending Approval', variant: 'warning' },
  UNDER_REVIEW: { ar: 'قيد المراجعة', en: 'Under Review', variant: 'warning' },
  APPROVED: { ar: 'معتمد', en: 'Approved', variant: 'success' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected', variant: 'danger' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled', variant: 'muted' },
  PARTIALLY_FULFILLED: { ar: 'منفذ جزئيًا', en: 'Partially Fulfilled', variant: 'warning' },
  FULFILLED: { ar: 'منفذ', en: 'Fulfilled', variant: 'success' },
  RECEIVED: { ar: 'مستلم', en: 'Received', variant: 'success' },
  ORDERED: { ar: 'مطلوب', en: 'Ordered', variant: 'info' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed', variant: 'success' },
};

const PRIORITY_CONFIG: Record<PRPriority, { ar: string; en: string; color: string }> = {
  LOW: { ar: 'منخفضة', en: 'Low', color: 'text-text-muted' },
  MEDIUM: { ar: 'متوسطة', en: 'Medium', color: 'text-amber-400' },
  HIGH: { ar: 'عالية', en: 'High', color: 'text-red-400' },
};

const TYPE_CONFIG: Record<PRRequirementType, { ar: string; en: string }> = {
  MATERIALS: { ar: 'مواد', en: 'Materials' },
  EQUIPMENT: { ar: 'معدات', en: 'Equipment' },
  SERVICES: { ar: 'خدمات', en: 'Services' },
  OTHER: { ar: 'أخرى', en: 'Other' },
};

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
    <div className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-card p-4">
      <div className={cn('rounded-lg p-2', accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-text-muted">{label}</p>
        {loading ? (
          <div className="mt-1 h-6 w-12 animate-pulse rounded bg-surface-hover" />
        ) : (
          <p className="text-xl font-bold text-text-primary">{formatNumber(value)}</p>
        )}
      </div>
    </div>
  );
}

export default function ProcurementPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const label = <T extends { ar: string; en: string }>(value: T) => (isAr ? value.ar : value.en);

  const [rawSearch, setRawSearch] = useState('');
  const search = useDeferredValue(rawSearch);
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [requirementType, setRequirementType] = useState('');
  const [page, setPage] = useState(1);
  const [flashMessage, setFlashMessage] = useState('');

  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  const { data: dashboard, isLoading: dashboardLoading } = useProcurementDashboard();
  const { data: projectsData } = useProjects({ page: 1, limit: 100 });
  const projects = projectsData?.items ?? [];

  const params: Record<string, unknown> = { page, limit: 15 };
  if (search) params.search = search;
  if (projectId) params.projectId = projectId;
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (requirementType) params.requirementType = requirementType;

  const {
    data: requestsPage,
    isLoading: requestsLoading,
    isError: requestsError,
  } = usePurchaseRequests(params);
  const requests = Array.isArray(requestsPage?.items) ? requestsPage.items : [];
  const totalCount = requestsPage?.total ?? 0;
  const totalPages = requestsPage?.totalPages ?? 1;

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setRawSearch('');
    setProjectId('');
    setStatus('');
    setPriority('');
    setRequirementType('');
    setPage(1);
  };

  const openCreate = () => {
    setSelectedRequest(null);
    setDrawerMode('create');
  };

  const openView = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setDrawerMode('view');
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedRequest(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isAr ? 'طلبات الشراء' : 'Purchase Requests'}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {isAr
              ? 'عرض ومتابعة طلبات الشراء التي تم إنشاؤها واعتمادها.'
              : 'View and track purchase requests that have been created and approved.'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          {isAr ? 'طلب جديد' : 'New Request'}
        </button>
      </div>

      {flashMessage && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <div className="flex items-center justify-between gap-3">
            <span>{flashMessage}</span>
            <button
              type="button"
              onClick={() => setFlashMessage('')}
              className="text-xs text-emerald-400 transition-colors hover:text-emerald-300"
            >
              {isAr ? 'إخفاء' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={ShoppingCart}
          label={isAr ? 'إجمالي الطلبات' : 'Total Requests'}
          value={dashboard?.summary.total ?? 0}
          loading={dashboardLoading}
          accent="bg-blue-500/10 text-blue-400"
        />
        <KpiCard
          icon={Clock}
          label={isAr ? 'بانتظار المراجعة' : 'Pending Review'}
          value={dashboard?.summary.pendingApproval ?? 0}
          loading={dashboardLoading}
          accent="bg-amber-500/10 text-amber-400"
        />
        <KpiCard
          icon={CheckCircle2}
          label={isAr ? 'معتمد' : 'Approved'}
          value={dashboard?.summary.approved ?? 0}
          loading={dashboardLoading}
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <KpiCard
          icon={PackageCheck}
          label={isAr ? 'منفذ / مستلم' : 'Fulfilled / Received'}
          value={dashboard?.summary.fulfilled ?? 0}
          loading={dashboardLoading}
          accent="bg-purple-500/10 text-purple-400"
        />
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-text-muted" />

          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={rawSearch}
              onChange={(event) => {
                setRawSearch(event.target.value);
                resetPage();
              }}
              placeholder={
                isAr
                  ? 'بحث برقم الطلب أو الاسم أو المورد...'
                  : 'Search by request number, name, or vendor...'
              }
              className="field-input h-8 w-full ps-8 text-xs"
            />
          </div>

          <select
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              resetPage();
            }}
            className="field-select h-8 w-44 text-xs"
          >
            <option value="">{isAr ? 'جميع المشاريع' : 'All Projects'}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {isAr ? project.nameAr : project.nameEn ?? project.nameAr}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
            className="field-select h-8 w-36 text-xs"
          >
            <option value="">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
            {(Object.keys(STATUS_CONFIG) as PRStatus[]).map((entry) => (
              <option key={entry} value={entry}>
                {label(STATUS_CONFIG[entry])}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              resetPage();
            }}
            className="field-select h-8 w-32 text-xs"
          >
            <option value="">{isAr ? 'كل الأولويات' : 'All Priorities'}</option>
            {(Object.keys(PRIORITY_CONFIG) as PRPriority[]).map((entry) => (
              <option key={entry} value={entry}>
                {label(PRIORITY_CONFIG[entry])}
              </option>
            ))}
          </select>

          <select
            value={requirementType}
            onChange={(event) => {
              setRequirementType(event.target.value);
              resetPage();
            }}
            className="field-select h-8 w-32 text-xs"
          >
            <option value="">{isAr ? 'كل الأنواع' : 'All Types'}</option>
            {(Object.keys(TYPE_CONFIG) as PRRequirementType[]).map((entry) => (
              <option key={entry} value={entry}>
                {label(TYPE_CONFIG[entry])}
              </option>
            ))}
          </select>

          {(search || projectId || status || priority || requirementType) && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-8 rounded-lg px-3 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              {isAr ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        {requestsLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            {isAr ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : requestsError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
            <ShoppingCart className="h-10 w-10 opacity-20" />
            <p className="text-sm text-red-400">
              {isAr ? 'حدث خطأ أثناء تحميل الطلبات. حاول مجدداً.' : 'Failed to load requests. Please try again.'}
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
            <ShoppingCart className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              {search || projectId || status || priority || requirementType
                ? isAr
                  ? 'لا توجد طلبات شراء مطابقة للفلاتر'
                  : 'No purchase requests match the filters'
                : isAr
                  ? 'لا توجد طلبات شراء حاليًا'
                  : 'No purchase requests yet'}
            </p>
            <button type="button" onClick={openCreate} className="text-xs text-brand hover:underline">
              {isAr ? 'إنشاء طلب جديد' : 'Create a new request'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-hover/40">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'رقم الطلب' : 'Request #'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'المشروع' : 'Project'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'النوع' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'الأولوية' : 'Priority'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'القيمة' : 'Amount'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'التسليم المتوقع' : 'Expected Delivery'}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-text-secondary">
                    {isAr ? 'مقدم الطلب' : 'Requested By'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    onClick={() => openView(request)}
                    className="cursor-pointer transition-colors hover:bg-surface-hover/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
                      {request.prNumber}
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate font-medium text-text-primary">{request.nameAr}</p>
                      {request.nameEn && (
                        <p className="truncate text-xs text-text-muted">{request.nameEn}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                      <div>{request.project.code}</div>
                      <div className="text-text-muted">{request.project.nameAr}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                      {label(TYPE_CONFIG[request.requirementType])}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn('text-xs font-semibold', PRIORITY_CONFIG[request.priority].color)}>
                        {label(PRIORITY_CONFIG[request.priority])}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={STATUS_CONFIG[request.status].variant}>
                        {label(STATUS_CONFIG[request.status])}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                      {request.totalAmount
                        ? `${formatNumber(Number(request.totalAmount))} ${request.currency}`
                        : EMPTY_VALUE}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                      {request.expectedDeliveryDate
                        ? formatDateWithEnglishDigits(request.expectedDeliveryDate, locale, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : EMPTY_VALUE}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                      {request.requester?.nameAr ?? EMPTY_VALUE}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!requestsLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-3">
            <p className="text-xs text-text-muted">
              {isAr
                ? `${formatNumber(totalCount)} طلب - صفحة ${formatNumber(page)} من ${formatNumber(totalPages)}`
                : `${formatNumber(totalCount)} requests - page ${formatNumber(page)} of ${formatNumber(totalPages)}`}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {drawerMode && (
        <PurchaseRequestDrawer
          mode={drawerMode}
          request={selectedRequest ?? undefined}
          onClose={closeDrawer}
          onSuccess={(message) => setFlashMessage(message)}
        />
      )}
    </div>
  );
}
