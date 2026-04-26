import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';

export type BreakdownEntry = {
  label: string;
  value: number;
};

export type ReportFilters = {
  projectId?: string;
  client?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  category?: string;
  assignee?: string;
  requirementStatus?: string;
  requirementType?: string;
  vendor?: string;
  costCode?: string;
  blockersOnly?: boolean;
  blockedOnly?: boolean;
  delayedOnly?: boolean;
  procurementRiskOnly?: boolean;
};

export interface ProjectStatusReportItem {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  status: string;
  currency: string;
  progress: number | null;
  activities: {
    total: number;
    byState: Record<string, number>;
    delayed: number;
    blocked: number;
  };
  procurement: {
    riskActivities: number;
    blockedActivities: number;
    openItems: number;
    sampleItems: string[];
  };
  cost: {
    estimated: number;
    actual: number;
    variance: number;
    spendingRatio: number | null;
  };
  invoices: {
    count: number;
    total: number;
    paidCount: number;
  };
  extracts: {
    count: number;
    total: number;
    paidCount: number;
  };
}

export interface ProjectStatusReport {
  summary: {
    totalProjects: number;
    activeProjects: number;
    delayedProjects: number;
    procurementRiskProjects: number;
    totalEstimated: number;
    totalActual: number;
    totalVariance: number;
    overallSpendingRatio: number | null;
    statusBreakdown: Record<string, number>;
  };
  items: ProjectStatusReportItem[];
}

export interface ExecutiveSummaryReport {
  summary: {
    totalProjects: number;
    activeProjects: number;
    delayedProjects: number;
    procurementRiskProjects: number;
    blockedActivities: number;
    delayedActivities: number;
    executionCompletion: number | null;
    procurementReadiness: number | null;
    totalEstimatedCost: number;
    totalActualCost: number;
    totalVariance: number;
    budgetConsumption: number | null;
    totalContractValue: number;
    totalInvoices: number;
    totalInvoicesGross: number;
    invoicePaidRatio: number | null;
    totalExtracts: number;
    totalExtractsAmount: number;
    extractPaidRatio: number | null;
    dailyReportsCount: number;
    blockedRequirements: number;
    readyRequirements: number;
    partiallyReadyRequirements: number;
  };
  charts: {
    projectsByStatus: BreakdownEntry[];
    activitiesByStatus: BreakdownEntry[];
    procurementByStatus: BreakdownEntry[];
    invoicesByStatus: BreakdownEntry[];
    extractsByStatus: BreakdownEntry[];
    costByProject: Array<{
      projectId: string;
      projectCode: string;
      projectName: string;
      estimated: number;
      actual: number;
      variance: number;
    }>;
    topCostCategories: Array<{
      category: string;
      estimated: number;
      actual: number;
      variance: number;
      itemCount: number;
    }>;
    delayedProjects: Array<{
      projectId: string;
      projectCode: string;
      projectName: string;
      delayed: number;
      blocked: number;
    }>;
    dailyLogsTrend: Array<{
      date: string;
      count: number;
    }>;
  };
  highlights: {
    topProjects: Array<{
      projectId: string;
      projectCode: string;
      projectName: string;
      status: string;
      progress: number | null;
      spendingRatio: number | null;
      actualCost: number;
      delayedActivities: number;
      procurementRiskActivities: number;
    }>;
    riskProjects: Array<{
      projectId: string;
      projectCode: string;
      projectName: string;
      status: string;
      blockedActivities: number;
      delayedActivities: number;
      procurementBlockedActivities: number;
      openProcurementItems: number;
    }>;
  };
}

export interface OperationsReportItem {
  id: string;
  activityCode: string;
  activityName: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  status: string;
  priority: string;
  category: string;
  location: string | null;
  assignee: string;
  progress: number;
  delayed: boolean;
  delayDays: number;
  blocked: boolean;
  blockerReason: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  expectedCost: number;
  actualCost: number;
}

export interface OperationsReport {
  summary: {
    totalActivities: number;
    delayedActivities: number;
    blockedActivities: number;
    inProgressActivities: number;
    completedActivities: number;
    notStartedActivities: number;
  };
  breakdowns: {
    byStatus: BreakdownEntry[];
    byCategory: BreakdownEntry[];
    byLocation: BreakdownEntry[];
    byAssignee: BreakdownEntry[];
  };
  items: OperationsReportItem[];
}

export interface ProcurementReportItem {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  activityId: string;
  activityCode: string;
  activityName: string;
  category: string;
  location: string | null;
  assignee: string | null;
  requirementType: string;
  requirementItem: string;
  status: string;
  notes: string | null;
  blocked: boolean;
  missingRequirements: string | null;
}

export interface ProcurementReport {
  summary: {
    totalRequirements: number;
    blockedRequirements: number;
    affectedProjects: number;
    blockedActivities: number;
    byStatus: Record<string, number>;
  };
  breakdowns: {
    byType: BreakdownEntry[];
    byProject: BreakdownEntry[];
  };
  items: ProcurementReportItem[];
}

export interface DailyHistoryItem {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  date: string;
  summary: string | null;
  blockers: string | null;
  tomorrowPlan: string | null;
  completedWork: string | null;
  workedActivitiesSummary: string | null;
  createdBy: string | null;
  linkedActivities: Array<{
    id: string;
    code: string;
    nameAr: string;
    status: string;
  }>;
}

export interface DailyHistoryReport {
  summary: {
    totalLogs: number;
    projectsCovered: number;
    logsWithBlockers: number;
    linkedActivityCount: number;
  };
  breakdowns: {
    byProject: BreakdownEntry[];
  };
  items: DailyHistoryItem[];
}

export interface CostSummaryItem {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  currency: string;
  estimated: number;
  actual: number;
  variance: number;
  spendingRatio: number | null;
  invoicesTotal: number;
  extractsTotal: number;
  contractValue: number;
  topCostItemCode: string | null;
  topCostCategory: string | null;
  categoryCount: number;
}

export interface CostSummaryReport {
  summary: {
    totalProjects: number;
    estimatedTotal: number;
    actualTotal: number;
    varianceTotal: number;
    spendingRatio: number | null;
    extractsTotal: number;
  };
  categories: Array<{
    category: string;
    estimated: number;
    actual: number;
    variance: number;
    itemCount: number;
  }>;
  items: CostSummaryItem[];
}

export interface InvoiceReportItem {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  invoiceNumber: string;
  date: string;
  vendor: string;
  costCode: string | null;
  costItemName: string | null;
  costCategory: string | null;
  description: string | null;
  amountBeforeTax: number;
  tax: number;
  gross: number;
  currency: string;
  status: string;
}

export interface InvoiceReport {
  summary: {
    totalInvoices: number;
    grossTotal: number;
    submittedCount: number;
    approvedCount: number;
    paidCount: number;
    byStatus: Record<string, number>;
  };
  breakdowns: {
    byProject: BreakdownEntry[];
  };
  items: InvoiceReportItem[];
}

export interface ExtractReportItem {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  extractNumber: string;
  date: string;
  description: string | null;
  amountBeforeTax: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
}

export interface ExtractReport {
  summary: {
    totalExtracts: number;
    totalAmount: number;
    submittedCount: number;
    approvedCount: number;
    paidCount: number;
    byStatus: Record<string, number>;
  };
  breakdowns: {
    byProject: BreakdownEntry[];
  };
  items: ExtractReportItem[];
}

function createReportQuery<T>(
  key: string,
  filters: ReportFilters,
  fetcher: (params?: Record<string, unknown>) => Promise<{ data: { data: T } }>,
  enabled: boolean,
) {
  return useQuery<T>({
    queryKey: ['reports', key, filters],
    queryFn: async () => {
      const { data } = await fetcher(filters);
      return data.data;
    },
    enabled,
  });
}

export function useProjectStatusReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<ProjectStatusReport>(
    'project-status',
    filters,
    reportsApi.getProjectStatus,
    enabled,
  );
}

export function useExecutiveSummaryReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<ExecutiveSummaryReport>(
    'executive-summary',
    filters,
    reportsApi.getExecutiveSummary,
    enabled,
  );
}

export function useOperationsReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<OperationsReport>(
    'operations',
    filters,
    reportsApi.getOperations,
    enabled,
  );
}

export function useProcurementReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<ProcurementReport>(
    'procurement',
    filters,
    reportsApi.getProcurementReadiness,
    enabled,
  );
}

export function useDailyHistoryReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<DailyHistoryReport>(
    'daily-history',
    filters,
    reportsApi.getDailyHistory,
    enabled,
  );
}

export function useCostSummaryReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<CostSummaryReport>(
    'cost-summary',
    filters,
    reportsApi.getCostSummary,
    enabled,
  );
}

export function useInvoiceReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<InvoiceReport>(
    'invoices',
    filters,
    reportsApi.getInvoices,
    enabled,
  );
}

export function useExtractReport(filters: ReportFilters, enabled = true) {
  return createReportQuery<ExtractReport>(
    'extracts',
    filters,
    reportsApi.getExtracts,
    enabled,
  );
}
