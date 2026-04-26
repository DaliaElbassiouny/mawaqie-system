import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { operationsApi } from '@/lib/api';

export type ActivityStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DELAYED'
  | 'BLOCKED';

export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type LookaheadStatus = 'PLANNED' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type LookaheadPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RequirementReadinessStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'PARTIALLY_AVAILABLE'
  | 'AVAILABLE'
  | 'BLOCKED';
export type ActivityCostHealth =
  | 'NOT_SET'
  | 'PLANNED'
  | 'AT_RISK'
  | 'ON_TRACK'
  | 'OVER'
  | 'UNPLANNED';
export type CostTimingStatus = 'NONE' | 'WATCH' | 'BLOCKED';
export type ActivityRequirementKey = 'labor' | 'materials' | 'equipment';
export type ActivityRequirementType = 'LABOR' | 'MATERIALS' | 'EQUIPMENT';
export type ProcurementRequirementType = 'MATERIALS' | 'EQUIPMENT';

export interface UserSummary {
  id: string;
  nameAr: string;
  nameEn: string | null;
  email: string;
}

export interface ActivityRequirementRecord {
  key: ActivityRequirementKey;
  type: ActivityRequirementType;
  value: string;
  status: RequirementReadinessStatus;
  notes: string | null;
  procurementLinked: boolean;
}

export interface ActivityRecord {
  id: string;
  scheduleId: string | null;
  projectId: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  location: string | null;
  status: ActivityStatus;
  lookaheadStatus: LookaheadStatus;
  priority: LookaheadPriority;
  readyForExecution: boolean;
  missingRequirements: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  progressPercent: number;
  responsibleUserId: string | null;
  notes: string | null;
  blockerReason: string | null;
  delayDays: number;
  requiredLabor: string | null;
  laborRequirementStatus: RequirementReadinessStatus | null;
  laborRequirementNotes: string | null;
  requiredMaterials: string | null;
  materialsRequirementStatus: RequirementReadinessStatus | null;
  materialsRequirementNotes: string | null;
  requiredEquipment: string | null;
  equipmentRequirementStatus: RequirementReadinessStatus | null;
  equipmentRequirementNotes: string | null;
  requirementReadinessStatus: RequirementReadinessStatus | null;
  procurementReadinessStatus: RequirementReadinessStatus | null;
  procurementBlocked: boolean;
  procurementBlockedItems: string[];
  requirements: ActivityRequirementRecord[];
  expectedCost: number | null;
  actualCost: number | null;
  costVarianceAmount: number | null;
  costVariancePercent: number | null;
  costHealth: ActivityCostHealth;
  costTimingStatus: CostTimingStatus;
  costAffectedByProcurement: boolean;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  approvedById: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  responsibleUser: UserSummary | null;
  approvedBy: UserSummary | null;
}

export interface ScheduleRecord {
  id: string;
  projectId: string;
  year: number;
  month: number;
  title: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  activities: ActivityRecord[];
}

export interface DailyLogActivitySummary {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  status: ActivityStatus;
  lookaheadStatus: LookaheadStatus;
  priority: LookaheadPriority;
}

export interface DailyLogRecord {
  id: string;
  projectId: string;
  date: string;
  summary: string | null;
  completedWork: string | null;
  workedActivitiesSummary: string | null;
  blockers: string | null;
  notes: string | null;
  tomorrowPlan: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  creator: UserSummary | null;
  relatedActivities: DailyLogActivitySummary[];
}

export interface OperationsStats {
  total: number;
  inProgress: number;
  completed: number;
  delayed: number;
  blocked: number;
  pendingApproval: number;
  notStarted: number;
}

export interface ActivityFilters {
  status?: ActivityStatus;
  lookaheadStatus?: LookaheadStatus;
  category?: string;
  location?: string;
  responsibleUserId?: string;
  scheduleId?: string;
  approvalStatus?: ApprovalStatus;
  priority?: LookaheadPriority;
  readyForExecution?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DailyLogFilters {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ProcurementReadinessFilters {
  search?: string;
  requirementType?: ProcurementRequirementType;
  requirementStatus?: RequirementReadinessStatus;
  blockedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface WeeklyLookaheadFilters {
  status?: ActivityStatus;
  lookaheadStatus?: LookaheadStatus;
  category?: string;
  location?: string;
  responsibleUserId?: string;
  scheduleId?: string;
  approvalStatus?: ApprovalStatus;
  priority?: LookaheadPriority;
  readyForExecution?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  windowStart?: string;
  days?: number;
}

export interface WeeklyLookaheadResponse {
  windowStart: string;
  windowEnd: string;
  counts: {
    total: number;
    planned: number;
    ready: number;
    inProgress: number;
    blocked: number;
    done: number;
    missingRequirements: number;
    highPriority: number;
  };
  items: ActivityRecord[];
}

export interface PaginatedActivities {
  items: ActivityRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDailyLogs {
  items: DailyLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProcurementReadinessResponse extends PaginatedActivities {
  summary: {
    activities: number;
    totalNeeds: number;
    pending: number;
    requested: number;
    partiallyAvailable: number;
    available: number;
    blocked: number;
  };
}

export interface ProjectCostSummary {
  currency: string;
  counts: {
    totalActivities: number;
    withExpectedCost: number;
    withActualCost: number;
    withoutExpectedCost: number;
    procurementAffected: number;
    blockedByProcurement: number;
  };
  totals: {
    expectedCost: number;
    actualCost: number;
    varianceAmount: number;
    variancePercent: number | null;
    inProgressExpectedCost: number;
    completedActualCost: number;
    blockedExposure: number;
    procurementAffectedExposure: number;
    upcomingWeekExpectedCost: number;
    upcomingMonthExpectedCost: number;
  };
  byStatus: Array<{
    key: ActivityStatus;
    count: number;
    expectedCost: number;
    actualCost: number;
  }>;
  byCategory: Array<{
    key: string;
    count: number;
    expectedCost: number;
    actualCost: number;
  }>;
  forecast: {
    weekly: Array<{
      index: number;
      startDate: string;
      endDate: string;
      expectedCost: number;
      activityCount: number;
    }>;
    monthly: Array<{
      index: number;
      year: number;
      month: number;
      startDate: string;
      endDate: string;
      expectedCost: number;
      activityCount: number;
    }>;
  };
  topRiskActivities: Array<{
    id: string;
    code: string;
    nameAr: string;
    status: ActivityStatus;
    plannedStart: string | null;
    expectedCost: number | null;
    actualCost: number | null;
    costHealth: ActivityCostHealth;
    costTimingStatus: CostTimingStatus;
    procurementBlockedItems: string[];
  }>;
}

const statsKey = (projectId: string) => ['operations', 'stats', projectId];
const lookaheadKey = (projectId: string, filters?: WeeklyLookaheadFilters) =>
  ['operations', 'lookahead', projectId, filters ?? {}];
const costSummaryKey = (projectId: string) => ['operations', 'cost-summary', projectId];
const activitiesKey = (projectId: string, filters?: ActivityFilters) =>
  ['operations', 'activities', projectId, filters ?? {}];
const procurementKey = (projectId: string, filters?: ProcurementReadinessFilters) =>
  ['procurement', 'readiness', projectId, filters ?? {}];
const schedulesKey = (projectId: string) => ['operations', 'schedules', projectId];
const dailyLogsKey = (projectId: string, filters?: DailyLogFilters) =>
  ['operations', 'daily-logs', projectId, filters ?? {}];

const invalidateActivityViews = (projectId: string) => [
  ['operations', 'lookahead', projectId],
  ['operations', 'activities', projectId],
  ['operations', 'stats', projectId],
  ['operations', 'cost-summary', projectId],
  ['operations', 'schedules', projectId],
  ['procurement', 'readiness', projectId],
];

export function useOperationsStats(projectId: string | null) {
  return useQuery<OperationsStats>({
    queryKey: statsKey(projectId!),
    queryFn: async () => {
      const { data } = await operationsApi.getStats(projectId!);
      return (data as { data: OperationsStats }).data;
    },
    enabled: !!projectId,
  });
}

export function useWeeklyLookahead(projectId: string | null, filters?: WeeklyLookaheadFilters) {
  return useQuery<WeeklyLookaheadResponse>({
    queryKey: lookaheadKey(projectId!, filters),
    queryFn: async () => {
      const { data } = await operationsApi.getLookahead(
        projectId!,
        filters as Record<string, unknown>,
      );
      return (data as { data: WeeklyLookaheadResponse }).data;
    },
    enabled: !!projectId,
  });
}

export function useProjectCostSummary(projectId: string | null) {
  return useQuery<ProjectCostSummary>({
    queryKey: costSummaryKey(projectId!),
    queryFn: async () => {
      const { data } = await operationsApi.getCostSummary(projectId!);
      return (data as { data: ProjectCostSummary }).data;
    },
    enabled: !!projectId,
  });
}

export function useActivities(projectId: string | null, filters?: ActivityFilters) {
  return useQuery<PaginatedActivities>({
    queryKey: activitiesKey(projectId!, filters),
    queryFn: async () => {
      const { data } = await operationsApi.listActivities(
        projectId!,
        filters as Record<string, unknown>,
      );
      return (data as { data: PaginatedActivities }).data;
    },
    enabled: !!projectId,
  });
}

export function useCreateActivity(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => operationsApi.createActivity(projectId, payload),
    onSuccess: () => {
      invalidateActivityViews(projectId).forEach((key) =>
        qc.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

export function useUpdateActivity(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, data }: { activityId: string; data: unknown }) =>
      operationsApi.updateActivity(projectId, activityId, data),
    onSuccess: () => {
      invalidateActivityViews(projectId).forEach((key) =>
        qc.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

export function useDeleteActivity(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => operationsApi.deleteActivity(projectId, activityId),
    onSuccess: () => {
      invalidateActivityViews(projectId).forEach((key) =>
        qc.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

export function useSubmitForApproval(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => operationsApi.submitForApproval(projectId, activityId),
    onSuccess: () => {
      invalidateActivityViews(projectId).forEach((key) =>
        qc.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

export function useApproveActivity(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityId,
      decision,
      note,
    }: {
      activityId: string;
      decision: 'APPROVED' | 'REJECTED';
      note?: string;
    }) => operationsApi.approveActivity(projectId, activityId, { decision, note }),
    onSuccess: () => {
      invalidateActivityViews(projectId).forEach((key) =>
        qc.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

export function useSchedules(projectId: string | null) {
  return useQuery<ScheduleRecord[]>({
    queryKey: schedulesKey(projectId!),
    queryFn: async () => {
      const { data } = await operationsApi.listSchedules(projectId!);
      return (data as { data: ScheduleRecord[] }).data;
    },
    enabled: !!projectId,
  });
}

export function useCreateSchedule(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => operationsApi.createSchedule(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedulesKey(projectId) }),
  });
}

export function useUpdateSchedule(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: unknown }) =>
      operationsApi.updateSchedule(projectId, scheduleId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedulesKey(projectId) }),
  });
}

export function useDeleteSchedule(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => operationsApi.deleteSchedule(projectId, scheduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedulesKey(projectId) }),
  });
}

export function useDailyLogs(projectId: string | null, filters?: DailyLogFilters) {
  return useQuery<PaginatedDailyLogs>({
    queryKey: dailyLogsKey(projectId!, filters),
    queryFn: async () => {
      const { data } = await operationsApi.listDailyLogs(
        projectId!,
        filters as Record<string, unknown>,
      );
      return (data as { data: PaginatedDailyLogs }).data;
    },
    enabled: !!projectId,
  });
}

export function useUpsertDailyLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => operationsApi.upsertDailyLog(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations', 'daily-logs', projectId] }),
  });
}

export function useUpdateDailyLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: unknown }) =>
      operationsApi.updateDailyLog(projectId, logId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations', 'daily-logs', projectId] }),
  });
}

export function useProcurementReadiness(
  projectId: string | null,
  filters?: ProcurementReadinessFilters,
) {
  return useQuery<ProcurementReadinessResponse>({
    queryKey: procurementKey(projectId!, filters),
    queryFn: async () => {
      const { data } = await operationsApi.listProcurementReadiness(
        projectId!,
        filters as Record<string, unknown>,
      );
      return (data as { data: ProcurementReadinessResponse }).data;
    },
    enabled: !!projectId,
  });
}

export function useUpdateProcurementRequirement(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityId,
      requirementType,
      status,
      notes,
    }: {
      activityId: string;
      requirementType: ProcurementRequirementType;
      status: RequirementReadinessStatus;
      notes?: string;
    }) =>
      operationsApi.updateProcurementRequirement(projectId, activityId, requirementType, {
        status,
        notes,
      }),
    onSuccess: () => {
      invalidateActivityViews(projectId).forEach((key) =>
        qc.invalidateQueries({ queryKey: key }),
      );
      qc.invalidateQueries({ queryKey: ['operations', 'daily-logs', projectId] });
    },
  });
}
