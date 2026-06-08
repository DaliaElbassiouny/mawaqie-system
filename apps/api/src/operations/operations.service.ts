import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityStatus,
  Prisma,
  RequirementReadinessStatus,
} from '@prisma/client';
import { AuthUser } from '@mawaqie/shared';
import { AuditService } from '../audit/audit.service';
import { sanitizeLimit, sanitizePage } from '../common/utils/query.util';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActivityFilters,
  ApproveActivityDto,
  CreateActivityDto,
  CreateDailyLogDto,
  CreateScheduleDto,
  GetWeeklyLookaheadQueryDto,
  ListActivitiesQueryDto,
  ListDailyLogsQueryDto,
  ListProcurementReadinessQueryDto,
  PROCUREMENT_REQUIREMENT_TYPES,
  type ProcurementRequirementType,
  type LookaheadPriority,
  type LookaheadStatus,
  UpdateActivityDto,
  UpdateProcurementRequirementDto,
  UpdateDailyLogDto,
  UpdateScheduleDto,
} from './dto/operation.dto';

const RESPONSIBLE_USER_SELECT = {
  id: true,
  nameAr: true,
  nameEn: true,
  email: true,
};

const ACTIVITY_SELECT = {
  id: true,
  scheduleId: true,
  projectId: true,
  code: true,
  nameAr: true,
  nameEn: true,
  category: true,
  location: true,
  status: true,
  lookaheadStatus: true,
  priority: true,
  readyForExecution: true,
  missingRequirements: true,
  plannedStart: true,
  plannedEnd: true,
  actualStart: true,
  actualEnd: true,
  progressPercent: true,
  responsibleUserId: true,
  notes: true,
  blockerReason: true,
  delayDays: true,
  requiredLabor: true,
  laborRequirementStatus: true,
  laborRequirementNotes: true,
  requiredMaterials: true,
  materialsRequirementStatus: true,
  materialsRequirementNotes: true,
  requiredEquipment: true,
  equipmentRequirementStatus: true,
  equipmentRequirementNotes: true,
  expectedCost: true,
  actualCost: true,
  requiresApproval: true,
  approvalStatus: true,
  approvedById: true,
  approvedAt: true,
  approvalNote: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
  responsibleUser: { select: RESPONSIBLE_USER_SELECT },
  approvedBy: { select: RESPONSIBLE_USER_SELECT },
};

const SCHEDULE_SELECT = {
  id: true,
  projectId: true,
  year: true,
  month: true,
  title: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  activities: {
    select: ACTIVITY_SELECT,
    orderBy: [{ plannedStart: 'asc' as const }, { code: 'asc' as const }],
  },
};

const LOG_SELECT = {
  id: true,
  projectId: true,
  date: true,
  summary: true,
  completedWork: true,
  workedActivitiesSummary: true,
  blockers: true,
  notes: true,
  tomorrowPlan: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  creator: { select: RESPONSIBLE_USER_SELECT },
  relatedActivities: {
    select: {
      activity: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
          status: true,
          lookaheadStatus: true,
          priority: true,
        },
      },
    },
  },
};

type RawActivity = Prisma.OperationActivityGetPayload<{ select: typeof ACTIVITY_SELECT }>;
type RawSchedule = Prisma.OperationScheduleGetPayload<{ select: typeof SCHEDULE_SELECT }>;
type RawDailyLog = Prisma.DailyLogGetPayload<{ select: typeof LOG_SELECT }>;

type ActivityRequirementKey = 'labor' | 'materials' | 'equipment';
type RequirementType = 'LABOR' | 'MATERIALS' | 'EQUIPMENT';

export interface ActivityRequirementEntry {
  key: ActivityRequirementKey;
  type: RequirementType;
  value: string;
  status: RequirementReadinessStatus;
  notes: string | null;
  procurementLinked: boolean;
}

interface RequirementSnapshot {
  requiredLabor: string | null;
  laborRequirementStatus: RequirementReadinessStatus | null;
  laborRequirementNotes: string | null;
  requiredMaterials: string | null;
  materialsRequirementStatus: RequirementReadinessStatus | null;
  materialsRequirementNotes: string | null;
  requiredEquipment: string | null;
  equipmentRequirementStatus: RequirementReadinessStatus | null;
  equipmentRequirementNotes: string | null;
  readyForExecution: boolean;
  missingRequirements: string | null;
  requirementReadinessStatus: RequirementReadinessStatus | null;
  procurementReadinessStatus: RequirementReadinessStatus | null;
  procurementBlocked: boolean;
  procurementBlockedItems: string[];
  requirements: ActivityRequirementEntry[];
}

type ActivityCostHealth =
  | 'NOT_SET'
  | 'PLANNED'
  | 'AT_RISK'
  | 'ON_TRACK'
  | 'OVER'
  | 'UNPLANNED';

type CostTimingStatus = 'NONE' | 'WATCH' | 'BLOCKED';

interface ActivityCostSnapshot {
  expectedCost: number | null;
  actualCost: number | null;
  varianceAmount: number | null;
  variancePercent: number | null;
  costHealth: ActivityCostHealth;
  costTimingStatus: CostTimingStatus;
  costAffectedByProcurement: boolean;
}

const REQUIREMENT_DEFINITIONS = [
  {
    key: 'labor',
    type: 'LABOR',
    procurementLinked: false,
    valueField: 'requiredLabor',
    statusField: 'laborRequirementStatus',
    notesField: 'laborRequirementNotes',
  },
  {
    key: 'materials',
    type: 'MATERIALS',
    procurementLinked: true,
    valueField: 'requiredMaterials',
    statusField: 'materialsRequirementStatus',
    notesField: 'materialsRequirementNotes',
  },
  {
    key: 'equipment',
    type: 'EQUIPMENT',
    procurementLinked: true,
    valueField: 'requiredEquipment',
    statusField: 'equipmentRequirementStatus',
    notesField: 'equipmentRequirementNotes',
  },
] as const;

const LOOKAHEAD_TO_ACTIVITY_STATUS: Record<LookaheadStatus, ActivityStatus> = {
  PLANNED: 'NOT_STARTED',
  READY: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  DONE: 'COMPLETED',
};

const PRIORITY_WEIGHT: Record<LookaheadPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function normalizeText(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function resolveRequirementStatus(
  value: string | null,
  status?: RequirementReadinessStatus | null,
): RequirementReadinessStatus | null {
  if (!value) return null;
  return status ?? 'PENDING';
}

function aggregateRequirementStatuses(
  statuses: RequirementReadinessStatus[],
): RequirementReadinessStatus | null {
  if (statuses.length === 0) return null;
  if (statuses.every((status) => status === 'AVAILABLE')) return 'AVAILABLE';
  if (statuses.includes('BLOCKED')) return 'BLOCKED';
  if (
    statuses.includes('PARTIALLY_AVAILABLE') ||
    (statuses.includes('AVAILABLE') && statuses.some((status) => status !== 'AVAILABLE'))
  ) {
    return 'PARTIALLY_AVAILABLE';
  }
  if (statuses.includes('REQUESTED')) return 'REQUESTED';
  return 'PENDING';
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100) / 100;
}

function sumNullableNumbers(values: Array<number | null | undefined>): number {
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return Math.round(total * 100) / 100;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function shiftUtcMonth(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function resolveActivityTimingDate(activity: {
  plannedStart?: Date | string | null;
  plannedEnd?: Date | string | null;
}): Date | null {
  const raw = activity.plannedStart ?? activity.plannedEnd;
  if (!raw) return null;
  const parsed = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildActivityCostSnapshot(params: {
  expectedCost?: Prisma.Decimal | number | null;
  actualCost?: Prisma.Decimal | number | null;
  procurementReadinessStatus: RequirementReadinessStatus | null;
  procurementBlocked: boolean;
}): ActivityCostSnapshot {
  const expectedCost = decimalToNumber(params.expectedCost);
  const actualCost = decimalToNumber(params.actualCost);
  const costTimingStatus: CostTimingStatus = params.procurementBlocked
    ? 'BLOCKED'
    : params.procurementReadinessStatus &&
        params.procurementReadinessStatus !== 'AVAILABLE'
      ? 'WATCH'
      : 'NONE';
  const costAffectedByProcurement = costTimingStatus !== 'NONE';

  const varianceAmount =
    expectedCost !== null && actualCost !== null
      ? Math.round((actualCost - expectedCost) * 100) / 100
      : null;
  const variancePercent =
    varianceAmount !== null && expectedCost && expectedCost !== 0
      ? Math.round((varianceAmount / expectedCost) * 10000) / 100
      : null;

  let costHealth: ActivityCostHealth;
  if (expectedCost === null && actualCost === null) {
    costHealth = 'NOT_SET';
  } else if (expectedCost === null && actualCost !== null) {
    costHealth = 'UNPLANNED';
  } else if (actualCost === null) {
    costHealth = costTimingStatus === 'BLOCKED' ? 'AT_RISK' : 'PLANNED';
  } else {
    costHealth = actualCost > (expectedCost ?? 0) ? 'OVER' : 'ON_TRACK';
  }

  return {
    expectedCost,
    actualCost,
    varianceAmount,
    variancePercent,
    costHealth,
    costTimingStatus,
    costAffectedByProcurement,
  };
}

function createRequirementSnapshot(input: {
  requiredLabor?: string | null;
  laborRequirementStatus?: RequirementReadinessStatus | null;
  laborRequirementNotes?: string | null;
  requiredMaterials?: string | null;
  materialsRequirementStatus?: RequirementReadinessStatus | null;
  materialsRequirementNotes?: string | null;
  requiredEquipment?: string | null;
  equipmentRequirementStatus?: RequirementReadinessStatus | null;
  equipmentRequirementNotes?: string | null;
  readyForExecution?: boolean | null;
  missingRequirements?: string | null;
}): RequirementSnapshot {
  const requiredLabor = normalizeText(input.requiredLabor);
  const laborRequirementNotes = normalizeText(input.laborRequirementNotes);
  const requiredMaterials = normalizeText(input.requiredMaterials);
  const materialsRequirementNotes = normalizeText(input.materialsRequirementNotes);
  const requiredEquipment = normalizeText(input.requiredEquipment);
  const equipmentRequirementNotes = normalizeText(input.equipmentRequirementNotes);

  const requirements: ActivityRequirementEntry[] = REQUIREMENT_DEFINITIONS.flatMap((definition) => {
    const value =
      definition.valueField === 'requiredLabor'
        ? requiredLabor
        : definition.valueField === 'requiredMaterials'
          ? requiredMaterials
          : requiredEquipment;
    const status =
      definition.statusField === 'laborRequirementStatus'
        ? resolveRequirementStatus(value, input.laborRequirementStatus)
        : definition.statusField === 'materialsRequirementStatus'
          ? resolveRequirementStatus(value, input.materialsRequirementStatus)
          : resolveRequirementStatus(value, input.equipmentRequirementStatus);
    const notes =
      definition.notesField === 'laborRequirementNotes'
        ? laborRequirementNotes
        : definition.notesField === 'materialsRequirementNotes'
          ? materialsRequirementNotes
          : equipmentRequirementNotes;

    if (!value || !status) return [];

    return [
      {
        key: definition.key,
        type: definition.type,
        value,
        status,
        notes,
        procurementLinked: definition.procurementLinked,
      } satisfies ActivityRequirementEntry,
    ];
  });

  const requirementReadinessStatus = aggregateRequirementStatuses(
    requirements.map((requirement) => requirement.status),
  );
  const procurementRequirements = requirements.filter((requirement) => requirement.procurementLinked);
  const procurementReadinessStatus = aggregateRequirementStatuses(
    procurementRequirements.map((requirement) => requirement.status),
  );
  const procurementBlockedItems = procurementRequirements
    .filter((requirement) => requirement.status === 'BLOCKED')
    .map((requirement) => requirement.value);
  const readyForExecution =
    requirements.length === 0
      ? !!input.readyForExecution
      : requirements.every((requirement) => requirement.status === 'AVAILABLE');
  const missingRequirements =
    requirements.length === 0
      ? readyForExecution
        ? null
        : normalizeText(input.missingRequirements)
      : readyForExecution
        ? null
        : requirements
            .filter((requirement) => requirement.status !== 'AVAILABLE')
            .map((requirement) => requirement.value)
            .join(' | ');

  return {
    requiredLabor,
    laborRequirementStatus: resolveRequirementStatus(
      requiredLabor,
      input.laborRequirementStatus,
    ),
    laborRequirementNotes,
    requiredMaterials,
    materialsRequirementStatus: resolveRequirementStatus(
      requiredMaterials,
      input.materialsRequirementStatus,
    ),
    materialsRequirementNotes,
    requiredEquipment,
    equipmentRequirementStatus: resolveRequirementStatus(
      requiredEquipment,
      input.equipmentRequirementStatus,
    ),
    equipmentRequirementNotes,
    readyForExecution,
    missingRequirements,
    requirementReadinessStatus,
    procurementReadinessStatus,
    procurementBlocked: procurementBlockedItems.length > 0,
    procurementBlockedItems,
    requirements,
  };
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseDateBoundary(value?: string | null, boundary: 'start' | 'end' = 'start'): Date | undefined {
  const parsed = parseDate(value);
  if (!parsed) return undefined;

  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (boundary === 'start') parsed.setUTCHours(0, 0, 0, 0);
    else parsed.setUTCHours(23, 59, 59, 999);
  }

  return parsed;
}

function parseMutableDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseDate(value) ?? null;
}

function autoDelayDays(plannedEnd?: Date | null, actualEnd?: Date | null): number {
  if (!plannedEnd || !actualEnd) return 0;
  const diff = Math.floor(
    (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, diff);
}

function deriveLookaheadStatus(params: {
  status?: ActivityStatus;
  readyForExecution?: boolean | null;
  fallback?: string | null;
}): LookaheadStatus {
  if (params.status === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (params.status === 'COMPLETED') return 'DONE';
  if (params.status === 'BLOCKED') return 'BLOCKED';

  const fallback = params.fallback as LookaheadStatus | undefined;
  if (fallback && ['PLANNED', 'READY', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(fallback)) {
    if (params.status === 'NOT_STARTED' || params.status === 'DELAYED' || !params.status) {
      if (fallback === 'DONE' || fallback === 'BLOCKED' || fallback === 'IN_PROGRESS') {
        return params.readyForExecution ? 'READY' : 'PLANNED';
      }
      return fallback;
    }
  }

  return params.readyForExecution ? 'READY' : 'PLANNED';
}

function deriveActivityStatus(params: {
  lookaheadStatus?: string | null;
  status?: ActivityStatus;
}): ActivityStatus {
  if (params.lookaheadStatus && params.lookaheadStatus in LOOKAHEAD_TO_ACTIVITY_STATUS) {
    return LOOKAHEAD_TO_ACTIVITY_STATUS[params.lookaheadStatus as LookaheadStatus];
  }
  return params.status ?? 'NOT_STARTED';
}

function serializeDailyLog(log: RawDailyLog) {
  return {
    ...log,
    relatedActivities: log.relatedActivities
      .map((link) => link.activity)
      .sort((a, b) => a.code.localeCompare(b.code)),
  };
}

function serializeActivity(activity: RawActivity) {
  const requirementSnapshot = createRequirementSnapshot({
    requiredLabor: activity.requiredLabor,
    laborRequirementStatus: activity.laborRequirementStatus,
    laborRequirementNotes: activity.laborRequirementNotes,
    requiredMaterials: activity.requiredMaterials,
    materialsRequirementStatus: activity.materialsRequirementStatus,
    materialsRequirementNotes: activity.materialsRequirementNotes,
    requiredEquipment: activity.requiredEquipment,
    equipmentRequirementStatus: activity.equipmentRequirementStatus,
    equipmentRequirementNotes: activity.equipmentRequirementNotes,
    readyForExecution: activity.readyForExecution,
    missingRequirements: activity.missingRequirements,
  });
  const costSnapshot = buildActivityCostSnapshot({
    expectedCost: activity.expectedCost,
    actualCost: activity.actualCost,
    procurementReadinessStatus: requirementSnapshot.procurementReadinessStatus,
    procurementBlocked: requirementSnapshot.procurementBlocked,
  });

  return {
    ...activity,
    expectedCost: costSnapshot.expectedCost,
    actualCost: costSnapshot.actualCost,
    readyForExecution: requirementSnapshot.readyForExecution,
    missingRequirements: requirementSnapshot.missingRequirements,
    requirements: requirementSnapshot.requirements,
    requirementReadinessStatus: requirementSnapshot.requirementReadinessStatus,
    procurementReadinessStatus: requirementSnapshot.procurementReadinessStatus,
    procurementBlocked: requirementSnapshot.procurementBlocked,
    procurementBlockedItems: requirementSnapshot.procurementBlockedItems,
    costVarianceAmount: costSnapshot.varianceAmount,
    costVariancePercent: costSnapshot.variancePercent,
    costHealth: costSnapshot.costHealth,
    costTimingStatus: costSnapshot.costTimingStatus,
    costAffectedByProcurement: costSnapshot.costAffectedByProcurement,
  };
}

function serializeSchedule(schedule: RawSchedule) {
  return {
    ...schedule,
    activities: schedule.activities.map(serializeActivity),
  };
}

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissionScope: PermissionScopeService,
  ) {}

  private async assertProjectAccess(projectId: string, caller: AuthUser) {
    const scopeWhere = this.permissionScope.buildProjectWhere(caller);
    const project = await this.prisma.project.findFirst({
      where: { AND: [{ id: projectId }, scopeWhere] },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found or not accessible.');
    }

    return project;
  }

  private async nextActivityCode(projectId: string): Promise<string> {
    const count = await this.prisma.operationActivity.count({ where: { projectId } });
    return `ACT-${String(count + 1).padStart(3, '0')}`;
  }

  private buildSearchWhere(search?: string | null): Prisma.OperationActivityWhereInput | undefined {
    const normalized = normalizeText(search);
    if (!normalized) return undefined;

    return {
      OR: [
        { code: { contains: normalized, mode: 'insensitive' } },
        { nameAr: { contains: normalized, mode: 'insensitive' } },
        { nameEn: { contains: normalized, mode: 'insensitive' } },
        { requiredLabor: { contains: normalized, mode: 'insensitive' } },
        { requiredMaterials: { contains: normalized, mode: 'insensitive' } },
        { requiredEquipment: { contains: normalized, mode: 'insensitive' } },
      ],
    };
  }

  private buildDateWindowWhere(start?: Date, end?: Date): Prisma.OperationActivityWhereInput | undefined {
    if (!start && !end) return undefined;

    if (start && end) {
      return {
        OR: [
          {
            AND: [
              { plannedStart: { not: null, lte: end } },
              { plannedEnd: { not: null, gte: start } },
            ],
          },
          {
            AND: [
              { plannedStart: { not: null, gte: start, lte: end } },
              { plannedEnd: null },
            ],
          },
          {
            AND: [
              { plannedEnd: { not: null, gte: start, lte: end } },
              { plannedStart: null },
            ],
          },
        ],
      };
    }

    if (start) {
      return {
        OR: [
          { plannedStart: { not: null, gte: start } },
          { plannedEnd: { not: null, gte: start } },
        ],
      };
    }

    return {
      OR: [
        { plannedStart: { not: null, lte: end } },
        { plannedEnd: { not: null, lte: end } },
      ],
    };
  }

  private buildActivityWhere(projectId: string, filters: ActivityFilters): Prisma.OperationActivityWhereInput {
    const and: Prisma.OperationActivityWhereInput[] = [{ projectId }];

    if (filters.status) and.push({ status: filters.status });
    if (filters.lookaheadStatus) and.push({ lookaheadStatus: filters.lookaheadStatus });
    if (filters.category) and.push({ category: filters.category });
    if (filters.location) and.push({ location: filters.location });
    if (filters.responsibleUserId) and.push({ responsibleUserId: filters.responsibleUserId });
    if (filters.scheduleId) and.push({ scheduleId: filters.scheduleId });
    if (filters.approvalStatus) and.push({ approvalStatus: filters.approvalStatus });
    if (filters.priority) and.push({ priority: filters.priority });
    if (filters.readyForExecution !== undefined) {
      and.push({ readyForExecution: filters.readyForExecution });
    }

    const dateWhere = this.buildDateWindowWhere(
      parseDateBoundary(filters.startDate, 'start'),
      parseDateBoundary(filters.endDate, 'end'),
    );
    if (dateWhere) and.push(dateWhere);

    const searchWhere = this.buildSearchWhere(filters.search);
    if (searchWhere) and.push(searchWhere);

    return and.length === 1 ? and[0] : { AND: and };
  }

  private buildDailyLogWhere(projectId: string, query: ListDailyLogsQueryDto): Prisma.DailyLogWhereInput {
    const and: Prisma.DailyLogWhereInput[] = [{ projectId }];
    const startDate = parseDateBoundary(query.startDate, 'start');
    const endDate = parseDateBoundary(query.endDate, 'end');

    if (startDate || endDate) {
      and.push({
        date: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      });
    }

    return and.length === 1 ? and[0] : { AND: and };
  }

  private buildProcurementRequirementMatch(
    requirementType: ProcurementRequirementType | undefined,
    requirementStatus: RequirementReadinessStatus | undefined,
    blockedOnly: boolean | undefined,
  ): Prisma.OperationActivityWhereInput[] {
    const matches: Prisma.OperationActivityWhereInput[] = [];
    const normalizedTypes: readonly ProcurementRequirementType[] = requirementType
      ? [requirementType]
      : PROCUREMENT_REQUIREMENT_TYPES;

    if (normalizedTypes.includes('MATERIALS')) {
      matches.push({
        requiredMaterials: { not: null },
        ...(blockedOnly
          ? { materialsRequirementStatus: 'BLOCKED' }
          : requirementStatus
            ? { materialsRequirementStatus: requirementStatus }
            : {}),
      });
    }

    if (normalizedTypes.includes('EQUIPMENT')) {
      matches.push({
        requiredEquipment: { not: null },
        ...(blockedOnly
          ? { equipmentRequirementStatus: 'BLOCKED' }
          : requirementStatus
            ? { equipmentRequirementStatus: requirementStatus }
            : {}),
      });
    }

    return matches;
  }

  private buildProcurementWhere(
    projectId: string,
    query: ListProcurementReadinessQueryDto,
  ): Prisma.OperationActivityWhereInput {
    const and: Prisma.OperationActivityWhereInput[] = [{ projectId }];
    const searchWhere = this.buildSearchWhere(query.search);
    if (searchWhere) and.push(searchWhere);

    const requirementMatches = this.buildProcurementRequirementMatch(
      query.requirementType,
      query.requirementStatus,
      query.blockedOnly,
    );

    if (requirementMatches.length === 0) {
      throw new BadRequestException('At least one valid procurement requirement type is required.');
    }

    and.push({ OR: requirementMatches });

    return and.length === 1 ? and[0] : { AND: and };
  }

  private getMergedRequirementSnapshot(
    base: Pick<
      RawActivity,
      | 'requiredLabor'
      | 'laborRequirementStatus'
      | 'laborRequirementNotes'
      | 'requiredMaterials'
      | 'materialsRequirementStatus'
      | 'materialsRequirementNotes'
      | 'requiredEquipment'
      | 'equipmentRequirementStatus'
      | 'equipmentRequirementNotes'
      | 'readyForExecution'
      | 'missingRequirements'
    >,
    override: Partial<{
      requiredLabor: string | null;
      laborRequirementStatus: RequirementReadinessStatus | null;
      laborRequirementNotes: string | null;
      requiredMaterials: string | null;
      materialsRequirementStatus: RequirementReadinessStatus | null;
      materialsRequirementNotes: string | null;
      requiredEquipment: string | null;
      equipmentRequirementStatus: RequirementReadinessStatus | null;
      equipmentRequirementNotes: string | null;
      readyForExecution: boolean | null;
      missingRequirements: string | null;
    }> = {},
  ) {
    return createRequirementSnapshot({
      requiredLabor: override.requiredLabor ?? base.requiredLabor,
      laborRequirementStatus: override.laborRequirementStatus ?? base.laborRequirementStatus,
      laborRequirementNotes: override.laborRequirementNotes ?? base.laborRequirementNotes,
      requiredMaterials: override.requiredMaterials ?? base.requiredMaterials,
      materialsRequirementStatus:
        override.materialsRequirementStatus ?? base.materialsRequirementStatus,
      materialsRequirementNotes:
        override.materialsRequirementNotes ?? base.materialsRequirementNotes,
      requiredEquipment: override.requiredEquipment ?? base.requiredEquipment,
      equipmentRequirementStatus:
        override.equipmentRequirementStatus ?? base.equipmentRequirementStatus,
      equipmentRequirementNotes:
        override.equipmentRequirementNotes ?? base.equipmentRequirementNotes,
      readyForExecution: override.readyForExecution ?? base.readyForExecution,
      missingRequirements: override.missingRequirements ?? base.missingRequirements,
    });
  }

  private async assertScheduleBelongsToProject(projectId: string, scheduleId?: string | null) {
    if (!scheduleId) return;

    const schedule = await this.prisma.operationSchedule.findFirst({
      where: { id: scheduleId, projectId },
      select: { id: true },
    });

    if (!schedule) {
      throw new NotFoundException('Operation schedule not found in this project.');
    }
  }

  private async resolveRelatedActivityIds(projectId: string, activityIds?: string[]) {
    const normalized = [...new Set((activityIds ?? []).filter(Boolean))];
    if (normalized.length === 0) return [];

    const activities = await this.prisma.operationActivity.findMany({
      where: { projectId, id: { in: normalized } },
      select: { id: true },
    });

    if (activities.length !== normalized.length) {
      throw new NotFoundException('One or more related activities do not belong to this project.');
    }

    return normalized;
  }

  async getStats(projectId: string, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const [total, inProgress, completed, delayed, blocked, pendingApproval, notStarted] =
      await Promise.all([
        this.prisma.operationActivity.count({ where: { projectId } }),
        this.prisma.operationActivity.count({ where: { projectId, status: 'IN_PROGRESS' } }),
        this.prisma.operationActivity.count({ where: { projectId, status: 'COMPLETED' } }),
        this.prisma.operationActivity.count({ where: { projectId, status: 'DELAYED' } }),
        this.prisma.operationActivity.count({ where: { projectId, status: 'BLOCKED' } }),
        this.prisma.operationActivity.count({ where: { projectId, approvalStatus: 'PENDING' } }),
        this.prisma.operationActivity.count({ where: { projectId, status: 'NOT_STARTED' } }),
      ]);

    return { total, inProgress, completed, delayed, blocked, pendingApproval, notStarted };
  }

  async getWeeklyLookahead(projectId: string, query: GetWeeklyLookaheadQueryDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const windowStart =
      parseDateBoundary(query.windowStart, 'start') ??
      parseDateBoundary(new Date().toISOString().slice(0, 10), 'start')!;
    const days = query.days ?? 7;
    const windowEnd = new Date(windowStart);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + (days - 1));
    windowEnd.setUTCHours(23, 59, 59, 999);

    const items = await this.prisma.operationActivity.findMany({
      where: this.buildActivityWhere(projectId, {
        ...query,
        startDate: windowStart.toISOString(),
        endDate: windowEnd.toISOString(),
      }),
      select: ACTIVITY_SELECT,
      orderBy: [{ plannedStart: 'asc' }, { code: 'asc' }],
    });

    const sortedItems = [...items].sort((a, b) => {
      const priorityDiff =
        PRIORITY_WEIGHT[(a.priority as LookaheadPriority) ?? 'MEDIUM'] -
        PRIORITY_WEIGHT[(b.priority as LookaheadPriority) ?? 'MEDIUM'];
      if (priorityDiff !== 0) return priorityDiff;

      const dateA = a.plannedStart ? new Date(a.plannedStart).getTime() : Number.MAX_SAFE_INTEGER;
      const dateB = b.plannedStart ? new Date(b.plannedStart).getTime() : Number.MAX_SAFE_INTEGER;
      if (dateA !== dateB) return dateA - dateB;

      return a.code.localeCompare(b.code);
    }).map(serializeActivity);

    return {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      counts: {
        total: sortedItems.length,
        planned: sortedItems.filter((item) => item.lookaheadStatus === 'PLANNED').length,
        ready: sortedItems.filter((item) => item.lookaheadStatus === 'READY').length,
        inProgress: sortedItems.filter((item) => item.lookaheadStatus === 'IN_PROGRESS').length,
        blocked: sortedItems.filter((item) => item.lookaheadStatus === 'BLOCKED').length,
        done: sortedItems.filter((item) => item.lookaheadStatus === 'DONE').length,
        missingRequirements: sortedItems.filter(
          (item) => !item.readyForExecution || !!item.missingRequirements,
        ).length,
        highPriority: sortedItems.filter((item) => item.priority === 'HIGH').length,
      },
      items: sortedItems,
    };
  }

  async getCostSummary(projectId: string, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const [project, rawActivities] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, currency: true },
      }),
      this.prisma.operationActivity.findMany({
        where: { projectId },
        select: ACTIVITY_SELECT,
        orderBy: [{ plannedStart: 'asc' }, { code: 'asc' }],
      }),
    ]);

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const activities = rawActivities.map(serializeActivity);
    const today = startOfUtcDay(new Date());
    const weekEnd = endOfUtcDay(addUtcDays(today, 6));
    const monthEnd = endOfUtcMonth(today);

    const weeklyForecast = Array.from({ length: 6 }, (_, index) => {
      const startDate = addUtcDays(today, index * 7);
      const endDate = endOfUtcDay(addUtcDays(startDate, 6));
      return {
        index,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        expectedCost: 0,
        activityCount: 0,
      };
    });

    const firstMonth = startOfUtcMonth(today);
    const monthlyForecast = Array.from({ length: 4 }, (_, index) => {
      const startDate = shiftUtcMonth(firstMonth, index);
      const endDate = endOfUtcMonth(startDate);
      return {
        index,
        year: startDate.getUTCFullYear(),
        month: startDate.getUTCMonth() + 1,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        expectedCost: 0,
        activityCount: 0,
      };
    });

    const byStatus = new Map<
      string,
      { key: string; count: number; expectedCost: number; actualCost: number }
    >();
    const byCategory = new Map<
      string,
      { key: string; count: number; expectedCost: number; actualCost: number }
    >();

    let withExpectedCost = 0;
    let withActualCost = 0;
    let withoutExpectedCost = 0;
    let procurementAffected = 0;
    let blockedByProcurement = 0;
    let expectedCost = 0;
    let actualCost = 0;
    let inProgressExpectedCost = 0;
    let completedActualCost = 0;
    let blockedExposure = 0;
    let procurementAffectedExposure = 0;
    let upcomingWeekExpectedCost = 0;
    let upcomingMonthExpectedCost = 0;

    for (const activity of activities) {
      const expected = activity.expectedCost ?? 0;
      const actual = activity.actualCost ?? 0;
      const timingDate = resolveActivityTimingDate(activity);

      expectedCost += expected;
      actualCost += actual;

      if (activity.expectedCost !== null) withExpectedCost += 1;
      else withoutExpectedCost += 1;
      if (activity.actualCost !== null) withActualCost += 1;
      if (activity.costAffectedByProcurement) procurementAffected += 1;
      if (activity.procurementBlocked) blockedByProcurement += 1;
      if (activity.status === 'IN_PROGRESS') inProgressExpectedCost += expected;
      if (activity.status === 'COMPLETED') completedActualCost += actual;
      if (activity.status === 'BLOCKED' || activity.costTimingStatus === 'BLOCKED') {
        blockedExposure += expected;
      }
      if (activity.costAffectedByProcurement) {
        procurementAffectedExposure += expected;
      }

      if (timingDate && activity.status !== 'COMPLETED' && expected > 0) {
        if (timingDate >= today && timingDate <= weekEnd) {
          upcomingWeekExpectedCost += expected;
        }

        if (timingDate >= today && timingDate <= monthEnd) {
          upcomingMonthExpectedCost += expected;
        }

        const weeklyBucket = weeklyForecast.find(
          (bucket) =>
            timingDate >= new Date(bucket.startDate) && timingDate <= new Date(bucket.endDate),
        );
        if (weeklyBucket) {
          weeklyBucket.expectedCost = sumNullableNumbers([weeklyBucket.expectedCost, expected]);
          weeklyBucket.activityCount += 1;
        }

        const monthlyBucket = monthlyForecast.find(
          (bucket) =>
            timingDate >= new Date(bucket.startDate) && timingDate <= new Date(bucket.endDate),
        );
        if (monthlyBucket) {
          monthlyBucket.expectedCost = sumNullableNumbers([monthlyBucket.expectedCost, expected]);
          monthlyBucket.activityCount += 1;
        }
      }

      const currentStatus = byStatus.get(activity.status) ?? {
        key: activity.status,
        count: 0,
        expectedCost: 0,
        actualCost: 0,
      };
      currentStatus.count += 1;
      currentStatus.expectedCost = sumNullableNumbers([currentStatus.expectedCost, expected]);
      currentStatus.actualCost = sumNullableNumbers([currentStatus.actualCost, actual]);
      byStatus.set(activity.status, currentStatus);

      const currentCategory = byCategory.get(activity.category) ?? {
        key: activity.category,
        count: 0,
        expectedCost: 0,
        actualCost: 0,
      };
      currentCategory.count += 1;
      currentCategory.expectedCost = sumNullableNumbers([currentCategory.expectedCost, expected]);
      currentCategory.actualCost = sumNullableNumbers([currentCategory.actualCost, actual]);
      byCategory.set(activity.category, currentCategory);
    }

    const totalExpectedCost = Math.round(expectedCost * 100) / 100;
    const totalActualCost = Math.round(actualCost * 100) / 100;
    const varianceAmount = Math.round((totalActualCost - totalExpectedCost) * 100) / 100;
    const variancePercent =
      totalExpectedCost > 0
        ? Math.round((varianceAmount / totalExpectedCost) * 10000) / 100
        : null;

    return {
      currency: project.currency,
      counts: {
        totalActivities: activities.length,
        withExpectedCost,
        withActualCost,
        withoutExpectedCost,
        procurementAffected,
        blockedByProcurement,
      },
      totals: {
        expectedCost: totalExpectedCost,
        actualCost: totalActualCost,
        varianceAmount,
        variancePercent,
        inProgressExpectedCost: Math.round(inProgressExpectedCost * 100) / 100,
        completedActualCost: Math.round(completedActualCost * 100) / 100,
        blockedExposure: Math.round(blockedExposure * 100) / 100,
        procurementAffectedExposure:
          Math.round(procurementAffectedExposure * 100) / 100,
        upcomingWeekExpectedCost: Math.round(upcomingWeekExpectedCost * 100) / 100,
        upcomingMonthExpectedCost: Math.round(upcomingMonthExpectedCost * 100) / 100,
      },
      byStatus: [...byStatus.values()].sort((a, b) => b.expectedCost - a.expectedCost),
      byCategory: [...byCategory.values()].sort((a, b) => b.expectedCost - a.expectedCost),
      forecast: {
        weekly: weeklyForecast,
        monthly: monthlyForecast,
      },
      topRiskActivities: activities
        .filter(
          (activity) =>
            (activity.expectedCost ?? 0) > 0 &&
            (activity.costTimingStatus !== 'NONE' || activity.costHealth === 'OVER'),
        )
        .sort((a, b) => {
          const severityA =
            a.costTimingStatus === 'BLOCKED' ? 0 : a.costHealth === 'OVER' ? 1 : 2;
          const severityB =
            b.costTimingStatus === 'BLOCKED' ? 0 : b.costHealth === 'OVER' ? 1 : 2;
          if (severityA !== severityB) return severityA - severityB;
          return (b.expectedCost ?? 0) - (a.expectedCost ?? 0);
        })
        .slice(0, 5)
        .map((activity) => ({
          id: activity.id,
          code: activity.code,
          nameAr: activity.nameAr,
          status: activity.status,
          plannedStart: activity.plannedStart,
          expectedCost: activity.expectedCost,
          actualCost: activity.actualCost,
          costHealth: activity.costHealth,
          costTimingStatus: activity.costTimingStatus,
          procurementBlockedItems: activity.procurementBlockedItems,
        })),
    };
  }

  async findActivities(projectId: string, query: ListActivitiesQueryDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);
    const where = this.buildActivityWhere(projectId, query);

    const [items, total] = await Promise.all([
      this.prisma.operationActivity.findMany({
        where,
        select: ACTIVITY_SELECT,
        orderBy: [{ plannedStart: 'asc' }, { code: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.operationActivity.count({ where }),
    ]);

    return {
      items: items.map(serializeActivity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createActivity(projectId: string, dto: CreateActivityDto, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);
    await this.assertScheduleBelongsToProject(projectId, dto.scheduleId);

    const code = dto.code?.trim() || (await this.nextActivityCode(projectId));
    const existing = await this.prisma.operationActivity.findUnique({
      where: { projectId_code: { projectId, code } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Activity code already exists in this project.');
    }

    const plannedStart = parseMutableDate(dto.plannedStart) ?? undefined;
    const plannedEnd = parseMutableDate(dto.plannedEnd) ?? undefined;
    const actualStart = parseMutableDate(dto.actualStart) ?? undefined;
    const actualEnd = parseMutableDate(dto.actualEnd) ?? undefined;

    const requirementSnapshot = createRequirementSnapshot({
      requiredLabor: dto.requiredLabor,
      laborRequirementStatus: dto.laborRequirementStatus,
      laborRequirementNotes: dto.laborRequirementNotes,
      requiredMaterials: dto.requiredMaterials,
      materialsRequirementStatus: dto.materialsRequirementStatus,
      materialsRequirementNotes: dto.materialsRequirementNotes,
      requiredEquipment: dto.requiredEquipment,
      equipmentRequirementStatus: dto.equipmentRequirementStatus,
      equipmentRequirementNotes: dto.equipmentRequirementNotes,
      readyForExecution: dto.readyForExecution ?? false,
      missingRequirements: dto.missingRequirements,
    });
    const readyForExecution = requirementSnapshot.readyForExecution;
    const lookaheadStatus =
      dto.lookaheadStatus ??
      deriveLookaheadStatus({
        status: dto.status,
        readyForExecution,
      });
    const status = dto.status ?? deriveActivityStatus({ lookaheadStatus });
    const progressPercent =
      dto.progressPercent ?? (lookaheadStatus === 'DONE' ? 100 : 0);

    const activity = await this.prisma.operationActivity.create({
      data: {
        projectId,
        scheduleId: dto.scheduleId ?? null,
        code,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        category: dto.category ?? 'OTHER',
        location: dto.location,
        status,
        lookaheadStatus,
        priority: dto.priority ?? 'MEDIUM',
        readyForExecution,
        missingRequirements: requirementSnapshot.missingRequirements,
        plannedStart,
        plannedEnd,
        actualStart,
        actualEnd,
        progressPercent,
        responsibleUserId: dto.responsibleUserId ?? null,
        notes: dto.notes,
        blockerReason: dto.blockerReason,
        requiredLabor: requirementSnapshot.requiredLabor,
        laborRequirementStatus: requirementSnapshot.laborRequirementStatus,
        laborRequirementNotes: requirementSnapshot.laborRequirementNotes,
        requiredMaterials: requirementSnapshot.requiredMaterials,
        materialsRequirementStatus: requirementSnapshot.materialsRequirementStatus,
        materialsRequirementNotes: requirementSnapshot.materialsRequirementNotes,
        requiredEquipment: requirementSnapshot.requiredEquipment,
        equipmentRequirementStatus: requirementSnapshot.equipmentRequirementStatus,
        equipmentRequirementNotes: requirementSnapshot.equipmentRequirementNotes,
        expectedCost: dto.expectedCost ?? null,
        actualCost: dto.actualCost ?? null,
        requiresApproval: dto.requiresApproval ?? false,
        approvalStatus: 'NOT_REQUIRED',
        delayDays: autoDelayDays(plannedEnd ?? null, actualEnd ?? null),
        createdById: actor.id,
        updatedById: actor.id,
      },
      select: ACTIVITY_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'CREATE',
      module: 'operations',
      entityType: 'OperationActivity',
      entityId: activity.id,
      newData: {
        projectId,
        code,
        lookaheadStatus: activity.lookaheadStatus,
        priority: activity.priority,
        expectedCost: activity.expectedCost,
        actualCost: activity.actualCost,
        procurementReadinessStatus: requirementSnapshot.procurementReadinessStatus,
      },
    });

    return serializeActivity(activity);
  }

  async updateActivity(projectId: string, activityId: string, dto: UpdateActivityDto, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const existing = await this.prisma.operationActivity.findFirst({
      where: { id: activityId, projectId },
      select: {
        id: true,
        code: true,
        status: true,
        lookaheadStatus: true,
        priority: true,
        readyForExecution: true,
        missingRequirements: true,
        requiredLabor: true,
        laborRequirementStatus: true,
        laborRequirementNotes: true,
        requiredMaterials: true,
        materialsRequirementStatus: true,
        materialsRequirementNotes: true,
        requiredEquipment: true,
        equipmentRequirementStatus: true,
        equipmentRequirementNotes: true,
        plannedEnd: true,
        actualEnd: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Activity not found.');
    }

    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.prisma.operationActivity.findUnique({
        where: { projectId_code: { projectId, code: dto.code } },
        select: { id: true },
      });
      if (codeExists) {
        throw new ConflictException('Activity code already exists in this project.');
      }
    }

    if (dto.scheduleId !== undefined && dto.scheduleId !== '') {
      await this.assertScheduleBelongsToProject(projectId, dto.scheduleId);
    }

    const plannedEnd =
      dto.plannedEnd !== undefined
        ? parseMutableDate(dto.plannedEnd)
        : existing.plannedEnd;
    const actualEnd =
      dto.actualEnd !== undefined
        ? parseMutableDate(dto.actualEnd)
        : existing.actualEnd;

    const requirementSnapshot = this.getMergedRequirementSnapshot(existing, {
      ...(dto.requiredLabor !== undefined
        ? { requiredLabor: dto.requiredLabor }
        : {}),
      ...(dto.laborRequirementStatus !== undefined
        ? { laborRequirementStatus: dto.laborRequirementStatus }
        : {}),
      ...(dto.laborRequirementNotes !== undefined
        ? { laborRequirementNotes: dto.laborRequirementNotes }
        : {}),
      ...(dto.requiredMaterials !== undefined
        ? { requiredMaterials: dto.requiredMaterials }
        : {}),
      ...(dto.materialsRequirementStatus !== undefined
        ? { materialsRequirementStatus: dto.materialsRequirementStatus }
        : {}),
      ...(dto.materialsRequirementNotes !== undefined
        ? { materialsRequirementNotes: dto.materialsRequirementNotes }
        : {}),
      ...(dto.requiredEquipment !== undefined
        ? { requiredEquipment: dto.requiredEquipment }
        : {}),
      ...(dto.equipmentRequirementStatus !== undefined
        ? { equipmentRequirementStatus: dto.equipmentRequirementStatus }
        : {}),
      ...(dto.equipmentRequirementNotes !== undefined
        ? { equipmentRequirementNotes: dto.equipmentRequirementNotes }
        : {}),
      ...(dto.readyForExecution !== undefined
        ? { readyForExecution: dto.readyForExecution }
        : {}),
      ...(dto.missingRequirements !== undefined
        ? { missingRequirements: dto.missingRequirements }
        : {}),
    });
    const readyForExecution = requirementSnapshot.readyForExecution;
    const lookaheadStatus =
      dto.lookaheadStatus ??
      deriveLookaheadStatus({
        status: dto.status ?? existing.status,
        readyForExecution,
        fallback: existing.lookaheadStatus,
      });
    const status =
      dto.status ??
      deriveActivityStatus({
        lookaheadStatus,
        status: existing.status,
      });

    const data: Prisma.OperationActivityUpdateInput = {
      updatedById: actor.id,
      status,
      lookaheadStatus,
      readyForExecution,
      delayDays: autoDelayDays(plannedEnd ?? null, actualEnd ?? null),
    };

    if (dto.code !== undefined) data.code = dto.code;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn || null;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.location !== undefined) data.location = dto.location || null;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.plannedStart !== undefined) data.plannedStart = parseMutableDate(dto.plannedStart);
    if (dto.plannedEnd !== undefined) data.plannedEnd = plannedEnd;
    if (dto.actualStart !== undefined) data.actualStart = parseMutableDate(dto.actualStart);
    if (dto.actualEnd !== undefined) data.actualEnd = actualEnd;
    if (dto.progressPercent !== undefined) {
      data.progressPercent = dto.progressPercent;
    } else if (lookaheadStatus === 'DONE') {
      data.progressPercent = 100;
    }
    if (dto.responsibleUserId !== undefined) {
      data.responsibleUser = dto.responsibleUserId
        ? { connect: { id: dto.responsibleUserId } }
        : { disconnect: true };
    }
    if (dto.notes !== undefined) data.notes = dto.notes || null;
    if (dto.blockerReason !== undefined) data.blockerReason = dto.blockerReason || null;
    if (
      dto.requiredLabor !== undefined ||
      dto.laborRequirementStatus !== undefined ||
      dto.laborRequirementNotes !== undefined
    ) {
      data.requiredLabor = requirementSnapshot.requiredLabor;
      data.laborRequirementStatus = requirementSnapshot.laborRequirementStatus;
      data.laborRequirementNotes = requirementSnapshot.laborRequirementNotes;
    }
    if (
      dto.requiredMaterials !== undefined ||
      dto.materialsRequirementStatus !== undefined ||
      dto.materialsRequirementNotes !== undefined
    ) {
      data.requiredMaterials = requirementSnapshot.requiredMaterials;
      data.materialsRequirementStatus = requirementSnapshot.materialsRequirementStatus;
      data.materialsRequirementNotes = requirementSnapshot.materialsRequirementNotes;
    }
    if (
      dto.requiredEquipment !== undefined ||
      dto.equipmentRequirementStatus !== undefined ||
      dto.equipmentRequirementNotes !== undefined
    ) {
      data.requiredEquipment = requirementSnapshot.requiredEquipment;
      data.equipmentRequirementStatus = requirementSnapshot.equipmentRequirementStatus;
      data.equipmentRequirementNotes = requirementSnapshot.equipmentRequirementNotes;
    }
    if (dto.expectedCost !== undefined) data.expectedCost = dto.expectedCost ?? null;
    if (dto.actualCost !== undefined) data.actualCost = dto.actualCost ?? null;
    if (dto.requiresApproval !== undefined) {
      data.requiresApproval = dto.requiresApproval;
      if (!dto.requiresApproval) data.approvalStatus = 'NOT_REQUIRED';
    }
    if (dto.scheduleId !== undefined) {
      data.schedule = dto.scheduleId
        ? { connect: { id: dto.scheduleId } }
        : { disconnect: true };
    }
    if (dto.missingRequirements !== undefined) {
      data.missingRequirements = requirementSnapshot.missingRequirements;
    } else if (readyForExecution) {
      data.missingRequirements = null;
    } else if (
      dto.requiredLabor !== undefined ||
      dto.laborRequirementStatus !== undefined ||
      dto.laborRequirementNotes !== undefined ||
      dto.requiredMaterials !== undefined ||
      dto.materialsRequirementStatus !== undefined ||
      dto.materialsRequirementNotes !== undefined ||
      dto.requiredEquipment !== undefined ||
      dto.equipmentRequirementStatus !== undefined ||
      dto.equipmentRequirementNotes !== undefined
    ) {
      data.missingRequirements = requirementSnapshot.missingRequirements;
    }

    const updated = await this.prisma.operationActivity.update({
      where: { id: activityId },
      data,
      select: ACTIVITY_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'UPDATE',
      module: 'operations',
      entityType: 'OperationActivity',
      entityId: activityId,
      newData: {
        status: updated.status,
        lookaheadStatus: updated.lookaheadStatus,
        priority: updated.priority,
        readyForExecution: updated.readyForExecution,
        expectedCost: updated.expectedCost,
        actualCost: updated.actualCost,
        procurementReadinessStatus: requirementSnapshot.procurementReadinessStatus,
      },
    });

    return serializeActivity(updated);
  }

  async deleteActivity(projectId: string, activityId: string, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const activity = await this.prisma.operationActivity.findFirst({
      where: { id: activityId, projectId },
      select: { id: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found.');
    }

    await this.prisma.operationActivity.delete({ where: { id: activityId } });
    await this.audit.log({
      userId: actor.id,
      action: 'DELETE',
      module: 'operations',
      entityType: 'OperationActivity',
      entityId: activityId,
    });

    return { message: 'Activity deleted successfully.' };
  }

  async submitForApproval(projectId: string, activityId: string, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const activity = await this.prisma.operationActivity.findFirst({
      where: { id: activityId, projectId },
      select: { id: true, requiresApproval: true, approvalStatus: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found.');
    }
    if (!activity.requiresApproval) {
      throw new ConflictException('This activity does not require approval.');
    }
    if (activity.approvalStatus === 'PENDING') {
      throw new ConflictException('This activity is already pending approval.');
    }
    if (activity.approvalStatus === 'APPROVED') {
      throw new ConflictException('This activity is already approved.');
    }

    const updated = await this.prisma.operationActivity.update({
      where: { id: activityId },
      data: { approvalStatus: 'PENDING', updatedById: actor.id },
      select: ACTIVITY_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'SUBMIT_APPROVAL',
      module: 'operations',
      entityType: 'OperationActivity',
      entityId: activityId,
    });

    return serializeActivity(updated);
  }

  async approveActivity(projectId: string, activityId: string, dto: ApproveActivityDto, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const activity = await this.prisma.operationActivity.findFirst({
      where: { id: activityId, projectId },
      select: { id: true, approvalStatus: true },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found.');
    }
    if (activity.approvalStatus !== 'PENDING') {
      throw new ConflictException('This activity is not waiting for approval.');
    }

    const updated = await this.prisma.operationActivity.update({
      where: { id: activityId },
      data: {
        approvalStatus: dto.decision,
        approvedById: actor.id,
        approvedAt: new Date(),
        approvalNote: dto.note ?? null,
        updatedById: actor.id,
      },
      select: ACTIVITY_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: dto.decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
      module: 'operations',
      entityType: 'OperationActivity',
      entityId: activityId,
      newData: { decision: dto.decision, note: dto.note },
    });

    return serializeActivity(updated);
  }

  async findSchedules(projectId: string, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const schedules = await this.prisma.operationSchedule.findMany({
      where: { projectId },
      select: SCHEDULE_SELECT,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return schedules.map(serializeSchedule);
  }

  async createSchedule(projectId: string, dto: CreateScheduleDto, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const existing = await this.prisma.operationSchedule.findUnique({
      where: { projectId_year_month: { projectId, year: dto.year, month: dto.month } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A schedule already exists for this project month.');
    }

    const schedule = await this.prisma.operationSchedule.create({
      data: {
        projectId,
        year: dto.year,
        month: dto.month,
        title: dto.title,
        notes: dto.notes,
        createdById: actor.id,
      },
      select: SCHEDULE_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'CREATE',
      module: 'operations',
      entityType: 'OperationSchedule',
      entityId: schedule.id,
      newData: { projectId, year: dto.year, month: dto.month },
    });

    return serializeSchedule(schedule);
  }

  async updateSchedule(projectId: string, scheduleId: string, dto: UpdateScheduleDto, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const schedule = await this.prisma.operationSchedule.findFirst({
      where: { id: scheduleId, projectId },
      select: { id: true },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found.');
    }

    const updated = await this.prisma.operationSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.month !== undefined ? { month: dto.month } : {}),
      },
      select: SCHEDULE_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'UPDATE',
      module: 'operations',
      entityType: 'OperationSchedule',
      entityId: scheduleId,
    });

    return serializeSchedule(updated);
  }

  async deleteSchedule(projectId: string, scheduleId: string, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const schedule = await this.prisma.operationSchedule.findFirst({
      where: { id: scheduleId, projectId },
      select: { id: true },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found.');
    }

    await this.prisma.operationSchedule.delete({ where: { id: scheduleId } });
    await this.audit.log({
      userId: actor.id,
      action: 'DELETE',
      module: 'operations',
      entityType: 'OperationSchedule',
      entityId: scheduleId,
    });

    return { message: 'Schedule deleted successfully.' };
  }

  async findProcurementReadiness(
    projectId: string,
    query: ListProcurementReadinessQueryDto,
    caller: AuthUser,
  ) {
    await this.assertProjectAccess(projectId, caller);

    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);
    const where = this.buildProcurementWhere(projectId, query);

    const [items, total, allMatching] = await Promise.all([
      this.prisma.operationActivity.findMany({
        where,
        select: ACTIVITY_SELECT,
        orderBy: [{ plannedStart: 'asc' }, { code: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.operationActivity.count({ where }),
      this.prisma.operationActivity.findMany({
        where,
        select: ACTIVITY_SELECT,
      }),
    ]);

    const pageActivityIds = items.map((a) => a.id);
    const linkedPRRows = pageActivityIds.length
      ? await this.prisma.purchaseRequest.findMany({
          where: {
            activityId: { in: pageActivityIds },
            status: { notIn: ['CANCELLED'] },
          },
          select: {
            id: true,
            prNumber: true,
            activityId: true,
            status: true,
            requirementType: true,
          },
        })
      : [];

    const prsByActivity = new Map<
      string,
      Array<{ id: string; prNumber: string; status: string; requirementType: string | null }>
    >();
    for (const pr of linkedPRRows) {
      if (!pr.activityId) continue;
      if (!prsByActivity.has(pr.activityId)) prsByActivity.set(pr.activityId, []);
      prsByActivity.get(pr.activityId)!.push({
        id: pr.id,
        prNumber: pr.prNumber,
        status: pr.status,
        requirementType: pr.requirementType,
      });
    }

    const summary = allMatching
      .map(serializeActivity)
      .flatMap((activity) =>
        activity.requirements.filter(
          (requirement) =>
            requirement.procurementLinked &&
            (!query.requirementType || requirement.type === query.requirementType),
        ),
      )
      .reduce(
        (acc, requirement) => {
          acc.totalNeeds += 1;
          acc[requirement.status] += 1;
          return acc;
        },
        {
          totalNeeds: 0,
          PENDING: 0,
          REQUESTED: 0,
          PARTIALLY_AVAILABLE: 0,
          AVAILABLE: 0,
          BLOCKED: 0,
        },
      );

    return {
      items: items.map((a) => ({
        ...serializeActivity(a),
        linkedPRs: prsByActivity.get(a.id) ?? [],
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        activities: total,
        totalNeeds: summary.totalNeeds,
        pending: summary.PENDING,
        requested: summary.REQUESTED,
        partiallyAvailable: summary.PARTIALLY_AVAILABLE,
        available: summary.AVAILABLE,
        blocked: summary.BLOCKED,
      },
    };
  }

  async updateProcurementRequirement(
    projectId: string,
    activityId: string,
    requirementType: ProcurementRequirementType,
    dto: UpdateProcurementRequirementDto,
    actor: AuthUser,
  ) {
    await this.assertProjectAccess(projectId, actor);

    if (!PROCUREMENT_REQUIREMENT_TYPES.includes(requirementType)) {
      throw new BadRequestException('Invalid procurement requirement type.');
    }

    const activity = await this.prisma.operationActivity.findFirst({
      where: { id: activityId, projectId },
      select: {
        id: true,
        code: true,
        requiredLabor: true,
        laborRequirementStatus: true,
        laborRequirementNotes: true,
        requiredMaterials: true,
        materialsRequirementStatus: true,
        materialsRequirementNotes: true,
        requiredEquipment: true,
        equipmentRequirementStatus: true,
        equipmentRequirementNotes: true,
        readyForExecution: true,
        missingRequirements: true,
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found.');
    }

    if (requirementType === 'MATERIALS' && !normalizeText(activity.requiredMaterials)) {
      throw new ConflictException('This activity does not have a materials requirement.');
    }

    if (requirementType === 'EQUIPMENT' && !normalizeText(activity.requiredEquipment)) {
      throw new ConflictException('This activity does not have an equipment requirement.');
    }

    const requirementSnapshot = this.getMergedRequirementSnapshot(activity, {
      ...(requirementType === 'MATERIALS'
        ? {
            materialsRequirementStatus: dto.status,
            materialsRequirementNotes: dto.notes ?? null,
          }
        : {
            equipmentRequirementStatus: dto.status,
            equipmentRequirementNotes: dto.notes ?? null,
          }),
    });

    const updated = await this.prisma.operationActivity.update({
      where: { id: activityId },
      data: {
        ...(requirementType === 'MATERIALS'
          ? {
              materialsRequirementStatus: requirementSnapshot.materialsRequirementStatus,
              materialsRequirementNotes: requirementSnapshot.materialsRequirementNotes,
            }
          : {
              equipmentRequirementStatus: requirementSnapshot.equipmentRequirementStatus,
              equipmentRequirementNotes: requirementSnapshot.equipmentRequirementNotes,
            }),
        readyForExecution: requirementSnapshot.readyForExecution,
        missingRequirements: requirementSnapshot.missingRequirements,
        updatedById: actor.id,
      },
      select: ACTIVITY_SELECT,
    });

    await this.audit.log({
      userId: actor.id,
      action: 'UPDATE_READINESS',
      module: 'procurement',
      entityType: 'OperationActivity',
      entityId: activityId,
      newData: {
        code: activity.code,
        requirementType,
        status: dto.status,
        procurementReadinessStatus: requirementSnapshot.procurementReadinessStatus,
      },
    });

    return serializeActivity(updated);
  }

  async findDailyLogs(projectId: string, query: ListDailyLogsQueryDto, caller: AuthUser) {
    await this.assertProjectAccess(projectId, caller);

    const page = sanitizePage(query.page);
    const limit = sanitizeLimit(query.limit);
    const where = this.buildDailyLogWhere(projectId, query);

    const [logs, total] = await Promise.all([
      this.prisma.dailyLog.findMany({
        where,
        select: LOG_SELECT,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dailyLog.count({ where }),
    ]);

    return {
      items: logs.map(serializeDailyLog),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async upsertDailyLog(projectId: string, dto: CreateDailyLogDto, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const date = parseDateBoundary(dto.date, 'start');
    if (!date) {
      throw new ConflictException('Invalid daily report date.');
    }
    date.setUTCHours(0, 0, 0, 0);

    const relatedActivityIds = await this.resolveRelatedActivityIds(projectId, dto.relatedActivityIds);

    const result = await this.prisma.$transaction(async (tx) => {
      const log = await tx.dailyLog.upsert({
        where: { projectId_date: { projectId, date } },
        create: {
          projectId,
          date,
          summary: dto.summary,
          completedWork: dto.completedWork,
          workedActivitiesSummary: dto.workedActivitiesSummary,
          blockers: dto.blockers,
          notes: dto.notes,
          tomorrowPlan: dto.tomorrowPlan,
          createdById: actor.id,
        },
        update: {
          summary: dto.summary ?? null,
          completedWork: dto.completedWork ?? null,
          workedActivitiesSummary: dto.workedActivitiesSummary ?? null,
          blockers: dto.blockers ?? null,
          notes: dto.notes ?? null,
          tomorrowPlan: dto.tomorrowPlan ?? null,
        },
        select: { id: true },
      });

      await tx.dailyLogActivity.deleteMany({ where: { dailyLogId: log.id } });

      if (relatedActivityIds.length > 0) {
        await tx.dailyLogActivity.createMany({
          data: relatedActivityIds.map((activityId) => ({
            dailyLogId: log.id,
            activityId,
          })),
        });
      }

      return tx.dailyLog.findUniqueOrThrow({
        where: { id: log.id },
        select: LOG_SELECT,
      });
    });

    await this.audit.log({
      userId: actor.id,
      action: 'UPSERT',
      module: 'operations',
      entityType: 'DailyLog',
      entityId: result.id,
      newData: { date: dto.date, relatedActivityIds },
    });

    return serializeDailyLog(result);
  }

  async updateDailyLog(projectId: string, logId: string, dto: UpdateDailyLogDto, actor: AuthUser) {
    await this.assertProjectAccess(projectId, actor);

    const log = await this.prisma.dailyLog.findFirst({
      where: { id: logId, projectId },
      select: { id: true },
    });

    if (!log) {
      throw new NotFoundException('Daily report not found.');
    }

    const relatedActivityIds =
      dto.relatedActivityIds !== undefined
        ? await this.resolveRelatedActivityIds(projectId, dto.relatedActivityIds)
        : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.dailyLog.update({
        where: { id: logId },
        data: {
          ...(dto.summary !== undefined ? { summary: dto.summary || null } : {}),
          ...(dto.completedWork !== undefined ? { completedWork: dto.completedWork || null } : {}),
          ...(dto.workedActivitiesSummary !== undefined
            ? { workedActivitiesSummary: dto.workedActivitiesSummary || null }
            : {}),
          ...(dto.blockers !== undefined ? { blockers: dto.blockers || null } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
          ...(dto.tomorrowPlan !== undefined ? { tomorrowPlan: dto.tomorrowPlan || null } : {}),
        },
      });

      if (relatedActivityIds !== undefined) {
        await tx.dailyLogActivity.deleteMany({ where: { dailyLogId: logId } });
        if (relatedActivityIds.length > 0) {
          await tx.dailyLogActivity.createMany({
            data: relatedActivityIds.map((activityId) => ({
              dailyLogId: logId,
              activityId,
            })),
          });
        }
      }

      return tx.dailyLog.findUniqueOrThrow({
        where: { id: logId },
        select: LOG_SELECT,
      });
    });

    await this.audit.log({
      userId: actor.id,
      action: 'UPDATE',
      module: 'operations',
      entityType: 'DailyLog',
      entityId: logId,
      newData: {
        relatedActivityIds: relatedActivityIds ?? 'unchanged',
      },
    });

    return serializeDailyLog(result);
  }
}
