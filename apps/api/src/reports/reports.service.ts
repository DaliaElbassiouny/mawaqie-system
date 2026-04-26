import { Injectable } from '@nestjs/common';
import {
  ActivityStatus,
  InvoiceStatus,
  Prisma,
  ProjectStatus,
  RequirementReadinessStatus,
} from '@prisma/client';
import { AuthUser } from '@cdc/shared';
import { PermissionScopeService } from '../common/services/permission-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CostSummaryReportQueryDto,
  DailyReportsHistoryQueryDto,
  ExecutiveSummaryQueryDto,
  ExtractsReportQueryDto,
  InvoiceReportQueryDto,
  OperationsReportQueryDto,
  ProcurementReadinessReportQueryDto,
  ProjectStatusReportQueryDto,
} from './dto/report.dto';

type NumericValue = Prisma.Decimal | number | null | undefined;
type RequirementType = 'MATERIALS' | 'EQUIPMENT';

const PROJECT_REPORT_SELECT = {
  id: true,
  code: true,
  nameAr: true,
  status: true,
  currency: true,
  contractValue: true,
  tender: {
    select: {
      client: {
        select: {
          code: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
  },
  costItems: {
    select: {
      id: true,
      code: true,
      category: true,
      totalCost: true,
    },
  },
  invoices: {
    select: {
      id: true,
      status: true,
      grossAmount: true,
      costItem: {
        select: {
          category: true,
        },
      },
    },
  },
  extracts: {
    select: {
      id: true,
      status: true,
      totalAmount: true,
    },
  },
  operationActivities: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      status: true,
      progressPercent: true,
      delayDays: true,
      blockerReason: true,
      missingRequirements: true,
      requiredMaterials: true,
      materialsRequirementStatus: true,
      requiredEquipment: true,
      equipmentRequirementStatus: true,
      expectedCost: true,
      actualCost: true,
    },
  },
} satisfies Prisma.ProjectSelect;

const ACTIVITY_REPORT_SELECT = {
  id: true,
  code: true,
  nameAr: true,
  category: true,
  location: true,
  status: true,
  progressPercent: true,
  priority: true,
  plannedStart: true,
  plannedEnd: true,
  actualStart: true,
  actualEnd: true,
  delayDays: true,
  blockerReason: true,
  missingRequirements: true,
  expectedCost: true,
  actualCost: true,
  requiredMaterials: true,
  materialsRequirementStatus: true,
  materialsRequirementNotes: true,
  requiredEquipment: true,
  equipmentRequirementStatus: true,
  equipmentRequirementNotes: true,
  project: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      status: true,
      currency: true,
      tender: {
        select: {
          client: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
    },
  },
  responsibleUser: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      email: true,
    },
  },
} satisfies Prisma.OperationActivitySelect;

const DAILY_LOG_REPORT_SELECT = {
  id: true,
  date: true,
  summary: true,
  blockers: true,
  tomorrowPlan: true,
  workedActivitiesSummary: true,
  completedWork: true,
  project: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      tender: {
        select: {
          client: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
    },
  },
  creator: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
    },
  },
  relatedActivities: {
    select: {
      activity: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.DailyLogSelect;

const INVOICE_REPORT_SELECT = {
  id: true,
  invoiceNumber: true,
  date: true,
  vendor: true,
  description: true,
  amountBeforeTax: true,
  taxAmount: true,
  grossAmount: true,
  currency: true,
  status: true,
  costItem: {
    select: {
      code: true,
      nameAr: true,
      category: true,
    },
  },
  project: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      tender: {
        select: {
          client: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.InvoiceSelect;

const EXTRACT_REPORT_SELECT = {
  id: true,
  extractNumber: true,
  date: true,
  description: true,
  amountBeforeTax: true,
  taxAmount: true,
  totalAmount: true,
  currency: true,
  status: true,
  project: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      tender: {
        select: {
          client: {
            select: {
              code: true,
              nameAr: true,
              nameEn: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ExtractSelect;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toNumber(value: NumericValue): number {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? round(numeric) : 0;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentage(part: number, total: number): number | null {
  if (!total) return null;
  return round((part / total) * 100);
}

function parseDateBoundary(value?: string, boundary: 'start' | 'end' = 'start'): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (boundary === 'start') parsed.setUTCHours(0, 0, 0, 0);
    else parsed.setUTCHours(23, 59, 59, 999);
  }
  return parsed;
}

function tally<T extends string>(entries: T[]): Record<T, number> {
  return entries.reduce(
    (acc, key) => {
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

function sortBreakdown(map: Map<string, number>) {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function sortRecordBreakdown(record: Record<string, number>) {
  return Object.entries(record)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function defaultRequirementStatus(
  value: string | null,
  status: RequirementReadinessStatus | null,
): RequirementReadinessStatus | null {
  if (!value) return null;
  return status ?? 'PENDING';
}

function procurementRequirements(activity: {
  requiredMaterials: string | null;
  materialsRequirementStatus: RequirementReadinessStatus | null;
  materialsRequirementNotes?: string | null;
  requiredEquipment: string | null;
  equipmentRequirementStatus: RequirementReadinessStatus | null;
  equipmentRequirementNotes?: string | null;
}) {
  const items: Array<{
    type: RequirementType;
    item: string;
    status: RequirementReadinessStatus;
    notes: string | null;
  }> = [];

  const materialsStatus = defaultRequirementStatus(
    activity.requiredMaterials,
    activity.materialsRequirementStatus,
  );
  if (activity.requiredMaterials && materialsStatus) {
    items.push({
      type: 'MATERIALS',
      item: activity.requiredMaterials,
      status: materialsStatus,
      notes: activity.materialsRequirementNotes ?? null,
    });
  }

  const equipmentStatus = defaultRequirementStatus(
    activity.requiredEquipment,
    activity.equipmentRequirementStatus,
  );
  if (activity.requiredEquipment && equipmentStatus) {
    items.push({
      type: 'EQUIPMENT',
      item: activity.requiredEquipment,
      status: equipmentStatus,
      notes: activity.equipmentRequirementNotes ?? null,
    });
  }

  return items;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: PermissionScopeService,
  ) {}

  private buildClientSearch(client?: string): Prisma.ProjectWhereInput | null {
    if (!client?.trim()) return null;
    return {
      tender: {
        client: {
          OR: [
            { code: { contains: client, mode: 'insensitive' } },
            { nameAr: { contains: client, mode: 'insensitive' } },
            { nameEn: { contains: client, mode: 'insensitive' } },
          ],
        },
      },
    };
  }

  private buildProjectWhere(
    caller: AuthUser,
    filters: {
      projectId?: string;
      client?: string;
      search?: string;
      status?: ProjectStatus;
    } = {},
  ): Prisma.ProjectWhereInput {
    const parts: Prisma.ProjectWhereInput[] = [this.scope.buildProjectWhere(caller)];

    if (filters.projectId) parts.push({ id: filters.projectId });
    if (filters.status) parts.push({ status: filters.status });

    const clientWhere = this.buildClientSearch(filters.client);
    if (clientWhere) parts.push(clientWhere);

    if (filters.search?.trim()) {
      parts.push({
        OR: [
          { code: { contains: filters.search, mode: 'insensitive' } },
          { nameAr: { contains: filters.search, mode: 'insensitive' } },
          { nameEn: { contains: filters.search, mode: 'insensitive' } },
          { location: { contains: filters.search, mode: 'insensitive' } },
          { projectType: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: parts };
  }

  private buildActivityDateFilter(startDate?: string, endDate?: string): Prisma.OperationActivityWhereInput[] {
    const start = parseDateBoundary(startDate, 'start');
    const end = parseDateBoundary(endDate, 'end');
    if (!start && !end) return [];

    const range: Prisma.DateTimeFilter = {};
    if (start) range.gte = start;
    if (end) range.lte = end;

    return [
      {
        OR: [
          { plannedStart: range },
          { plannedEnd: range },
          { actualStart: range },
          { actualEnd: range },
        ],
      },
    ];
  }

  async getExecutiveSummary(query: ExecutiveSummaryQueryDto, caller: AuthUser) {
    const [projectStatus, operations, procurement, dailyHistory, costSummary, invoices, extracts] =
      await Promise.all([
        this.getProjectStatusReport(
          {
            projectId: query.projectId,
            client: query.client,
            search: query.search,
            status: query.status,
          },
          caller,
        ),
        this.getOperationsReport(
          {
            projectId: query.projectId,
            client: query.client,
            search: query.search,
            startDate: query.startDate,
            endDate: query.endDate,
          },
          caller,
        ),
        this.getProcurementReadinessReport(
          {
            projectId: query.projectId,
            client: query.client,
            search: query.search,
          },
          caller,
        ),
        this.getDailyReportsHistory(
          {
            projectId: query.projectId,
            client: query.client,
            search: query.search,
            startDate: query.startDate,
            endDate: query.endDate,
          },
          caller,
        ),
        this.getCostSummaryReport(
          {
            projectId: query.projectId,
            client: query.client,
            search: query.search,
          },
          caller,
        ),
        this.getInvoiceReport(
          {
            projectId: query.projectId,
            client: query.client,
            search: query.search,
            startDate: query.startDate,
            endDate: query.endDate,
          },
          caller,
        ),
        this.getExtractsReport(
          {
            projectId: query.projectId,
            client: query.client,
            search: query.search,
            startDate: query.startDate,
            endDate: query.endDate,
          },
          caller,
        ),
      ]);

    const procurementReadyCount = procurement.summary.byStatus.AVAILABLE ?? 0;
    const procurementPartialCount = procurement.summary.byStatus.PARTIALLY_AVAILABLE ?? 0;
    const totalContractValue = round(
      costSummary.items.reduce((sum, item) => sum + item.contractValue, 0),
    );

    const dailyLogsTrendMap = new Map<string, number>();
    dailyHistory.items.forEach((item) => {
      const dateKey = item.date.toISOString().slice(0, 10);
      dailyLogsTrendMap.set(dateKey, (dailyLogsTrendMap.get(dateKey) ?? 0) + 1);
    });

    return {
      summary: {
        totalProjects: projectStatus.summary.totalProjects,
        activeProjects: projectStatus.summary.activeProjects,
        delayedProjects: projectStatus.summary.delayedProjects,
        procurementRiskProjects: projectStatus.summary.procurementRiskProjects,
        blockedActivities: operations.summary.blockedActivities,
        delayedActivities: operations.summary.delayedActivities,
        executionCompletion: percentage(
          operations.summary.completedActivities,
          operations.summary.totalActivities,
        ),
        procurementReadiness: percentage(
          procurementReadyCount + procurementPartialCount,
          procurement.summary.totalRequirements,
        ),
        totalEstimatedCost: costSummary.summary.estimatedTotal,
        totalActualCost: costSummary.summary.actualTotal,
        totalVariance: costSummary.summary.varianceTotal,
        budgetConsumption: costSummary.summary.spendingRatio,
        totalContractValue,
        totalInvoices: invoices.summary.totalInvoices,
        totalInvoicesGross: invoices.summary.grossTotal,
        invoicePaidRatio: percentage(
          invoices.summary.paidCount,
          invoices.summary.totalInvoices,
        ),
        totalExtracts: extracts.summary.totalExtracts,
        totalExtractsAmount: extracts.summary.totalAmount,
        extractPaidRatio: percentage(
          extracts.summary.paidCount,
          extracts.summary.totalExtracts,
        ),
        dailyReportsCount: dailyHistory.summary.totalLogs,
        blockedRequirements: procurement.summary.blockedRequirements,
        readyRequirements: procurementReadyCount,
        partiallyReadyRequirements: procurementPartialCount,
      },
      charts: {
        projectsByStatus: sortRecordBreakdown(projectStatus.summary.statusBreakdown),
        activitiesByStatus: operations.breakdowns.byStatus,
        procurementByStatus: sortRecordBreakdown(procurement.summary.byStatus),
        invoicesByStatus: sortRecordBreakdown(invoices.summary.byStatus),
        extractsByStatus: sortRecordBreakdown(extracts.summary.byStatus),
        costByProject: costSummary.items
          .slice()
          .sort((a, b) => b.estimated - a.estimated || a.projectName.localeCompare(b.projectName))
          .slice(0, 8)
          .map((item) => ({
            projectId: item.projectId,
            projectCode: item.projectCode,
            projectName: item.projectName,
            estimated: item.estimated,
            actual: item.actual,
            variance: item.variance,
          })),
        topCostCategories: costSummary.categories.slice(0, 6),
        delayedProjects: projectStatus.items
          .map((item) => ({
            projectId: item.projectId,
            projectCode: item.projectCode,
            projectName: item.projectName,
            delayed: item.activities.delayed,
            blocked: item.activities.blocked,
          }))
          .filter((item) => item.delayed > 0 || item.blocked > 0)
          .sort((a, b) => b.delayed - a.delayed || b.blocked - a.blocked)
          .slice(0, 8),
        dailyLogsTrend: [...dailyLogsTrendMap.entries()]
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
      highlights: {
        topProjects: projectStatus.items
          .slice()
          .sort(
            (a, b) =>
              (b.progress ?? 0) - (a.progress ?? 0) ||
              b.cost.actual - a.cost.actual ||
              a.projectName.localeCompare(b.projectName),
          )
          .slice(0, 5)
          .map((item) => ({
            projectId: item.projectId,
            projectCode: item.projectCode,
            projectName: item.projectName,
            status: item.status,
            progress: item.progress,
            spendingRatio: item.cost.spendingRatio,
            actualCost: item.cost.actual,
            delayedActivities: item.activities.delayed,
            procurementRiskActivities: item.procurement.riskActivities,
          })),
        riskProjects: projectStatus.items
          .slice()
          .sort(
            (a, b) =>
              b.procurement.blockedActivities - a.procurement.blockedActivities ||
              b.activities.blocked - a.activities.blocked ||
              b.activities.delayed - a.activities.delayed,
          )
          .filter(
            (item) =>
              item.procurement.blockedActivities > 0 ||
              item.activities.blocked > 0 ||
              item.activities.delayed > 0,
          )
          .slice(0, 5)
          .map((item) => ({
            projectId: item.projectId,
            projectCode: item.projectCode,
            projectName: item.projectName,
            status: item.status,
            blockedActivities: item.activities.blocked,
            delayedActivities: item.activities.delayed,
            procurementBlockedActivities: item.procurement.blockedActivities,
            openProcurementItems: item.procurement.openItems,
          })),
      },
    };
  }

  async getProjectStatusReport(query: ProjectStatusReportQueryDto, caller: AuthUser) {
    const projects = await this.prisma.project.findMany({
      where: this.buildProjectWhere(caller, {
        projectId: query.projectId,
        client: query.client,
        search: query.search,
        status: query.status,
      }),
      select: PROJECT_REPORT_SELECT,
      orderBy: [{ status: 'asc' }, { code: 'asc' }],
    });

    const items = projects
      .map((project) => {
        const activityCounts = {
          NOT_STARTED: 0,
          IN_PROGRESS: 0,
          COMPLETED: 0,
          DELAYED: 0,
          BLOCKED: 0,
        };
        const progressValues: number[] = [];
        let delayedCount = 0;
        let blockedCount = 0;
        let procurementRiskCount = 0;
        let procurementBlockedCount = 0;
        const procurementItems = new Set<string>();

        for (const activity of project.operationActivities) {
          activityCounts[activity.status] += 1;
          progressValues.push(activity.progressPercent ?? 0);
          if (activity.status === 'DELAYED' || (activity.delayDays ?? 0) > 0) delayedCount += 1;
          if (activity.status === 'BLOCKED') blockedCount += 1;

          const requirements = procurementRequirements(activity);
          if (requirements.some((requirement) => requirement.status !== 'AVAILABLE')) {
            procurementRiskCount += 1;
          }
          if (requirements.some((requirement) => requirement.status === 'BLOCKED')) {
            procurementBlockedCount += 1;
          }
          requirements
            .filter((requirement) => requirement.status !== 'AVAILABLE')
            .forEach((requirement) => procurementItems.add(requirement.item));
        }

        if (query.procurementRiskOnly && procurementRiskCount === 0) return null;

        const estimatedCost = round(
          project.costItems.reduce((sum, item) => sum + toNumber(item.totalCost), 0),
        );
        const actualCost = round(
          project.invoices.reduce((sum, invoice) => sum + toNumber(invoice.grossAmount), 0),
        );
        const extractsTotal = round(
          project.extracts.reduce((sum, extract) => sum + toNumber(extract.totalAmount), 0),
        );
        const variance = round(actualCost - estimatedCost);
        const spendingRatio = percentage(actualCost, estimatedCost);

        return {
          projectId: project.id,
          projectCode: project.code,
          projectName: project.nameAr,
          clientName:
            project.tender?.client?.nameAr ?? project.tender?.client?.nameEn ?? null,
          status: project.status,
          currency: project.currency,
          progress: average(progressValues),
          activities: {
            total: project.operationActivities.length,
            byState: activityCounts,
            delayed: delayedCount,
            blocked: blockedCount,
          },
          procurement: {
            riskActivities: procurementRiskCount,
            blockedActivities: procurementBlockedCount,
            openItems: procurementItems.size,
            sampleItems: [...procurementItems].slice(0, 3),
          },
          cost: {
            estimated: estimatedCost,
            actual: actualCost,
            variance,
            spendingRatio,
          },
          invoices: {
            count: project.invoices.length,
            total: actualCost,
            paidCount: project.invoices.filter((invoice) => invoice.status === 'PAID').length,
          },
          extracts: {
            count: project.extracts.length,
            total: extractsTotal,
            paidCount: project.extracts.filter((extract) => extract.status === 'PAID').length,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalEstimated = round(items.reduce((sum, item) => sum + item.cost.estimated, 0));
    const totalActual = round(items.reduce((sum, item) => sum + item.cost.actual, 0));
    const statusBreakdown = tally(items.map((item) => item.status));

    return {
      summary: {
        totalProjects: items.length,
        activeProjects: items.filter((item) => item.status === 'ACTIVE').length,
        delayedProjects: items.filter((item) => item.activities.delayed > 0).length,
        procurementRiskProjects: items.filter((item) => item.procurement.riskActivities > 0).length,
        totalEstimated,
        totalActual,
        totalVariance: round(totalActual - totalEstimated),
        overallSpendingRatio: percentage(totalActual, totalEstimated),
        statusBreakdown,
      },
      items,
    };
  }

  async getOperationsReport(query: OperationsReportQueryDto, caller: AuthUser) {
    const whereParts: Prisma.OperationActivityWhereInput[] = [
      {
        project: this.buildProjectWhere(caller, {
          projectId: query.projectId,
          client: query.client,
        }),
      },
      ...this.buildActivityDateFilter(query.startDate, query.endDate),
    ];

    if (query.status) whereParts.push({ status: query.status });
    if (query.category) whereParts.push({ category: query.category });
    if (query.blockedOnly) whereParts.push({ status: 'BLOCKED' });
    if (query.delayedOnly) {
      whereParts.push({
        OR: [{ status: 'DELAYED' }, { delayDays: { gt: 0 } }],
      });
    }
    if (query.assignee?.trim()) {
      whereParts.push({
        responsibleUser: {
          OR: [
            { nameAr: { contains: query.assignee, mode: 'insensitive' } },
            { nameEn: { contains: query.assignee, mode: 'insensitive' } },
            { email: { contains: query.assignee, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (query.search?.trim()) {
      whereParts.push({
        OR: [
          { code: { contains: query.search, mode: 'insensitive' } },
          { nameAr: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
          { blockerReason: { contains: query.search, mode: 'insensitive' } },
          { project: { code: { contains: query.search, mode: 'insensitive' } } },
          { project: { nameAr: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const activities = await this.prisma.operationActivity.findMany({
      where: { AND: whereParts },
      select: ACTIVITY_REPORT_SELECT,
      orderBy: [{ plannedStart: 'asc' }, { code: 'asc' }],
    });

    const statusMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const locationMap = new Map<string, number>();
    const assigneeMap = new Map<string, number>();

    const items = activities.map((activity) => {
      statusMap.set(activity.status, (statusMap.get(activity.status) ?? 0) + 1);
      categoryMap.set(activity.category, (categoryMap.get(activity.category) ?? 0) + 1);
      locationMap.set(
        activity.location ?? 'UNSPECIFIED',
        (locationMap.get(activity.location ?? 'UNSPECIFIED') ?? 0) + 1,
      );
      const assignee =
        activity.responsibleUser?.nameAr ?? activity.responsibleUser?.nameEn ?? 'UNASSIGNED';
      assigneeMap.set(assignee, (assigneeMap.get(assignee) ?? 0) + 1);

      return {
        id: activity.id,
        activityCode: activity.code,
        activityName: activity.nameAr,
        projectCode: activity.project.code,
        projectName: activity.project.nameAr,
        clientName:
          activity.project.tender?.client?.nameAr ??
          activity.project.tender?.client?.nameEn ??
          null,
        status: activity.status,
        priority: activity.priority,
        category: activity.category,
        location: activity.location,
        assignee,
        progress: activity.progressPercent,
        delayed: activity.status === 'DELAYED' || (activity.delayDays ?? 0) > 0,
        delayDays: activity.delayDays ?? 0,
        blocked: activity.status === 'BLOCKED',
        blockerReason: activity.blockerReason,
        plannedStart: activity.plannedStart,
        plannedEnd: activity.plannedEnd,
        expectedCost: toNumber(activity.expectedCost),
        actualCost: toNumber(activity.actualCost),
      };
    });

    return {
      summary: {
        totalActivities: items.length,
        delayedActivities: items.filter((item) => item.delayed).length,
        blockedActivities: items.filter((item) => item.blocked).length,
        inProgressActivities: items.filter((item) => item.status === 'IN_PROGRESS').length,
        completedActivities: items.filter((item) => item.status === 'COMPLETED').length,
        notStartedActivities: items.filter((item) => item.status === 'NOT_STARTED').length,
      },
      breakdowns: {
        byStatus: sortBreakdown(statusMap),
        byCategory: sortBreakdown(categoryMap),
        byLocation: sortBreakdown(locationMap).slice(0, 8),
        byAssignee: sortBreakdown(assigneeMap).slice(0, 8),
      },
      items,
    };
  }

  async getProcurementReadinessReport(
    query: ProcurementReadinessReportQueryDto,
    caller: AuthUser,
  ) {
    const whereParts: Prisma.OperationActivityWhereInput[] = [
      {
        project: this.buildProjectWhere(caller, {
          projectId: query.projectId,
          client: query.client,
        }),
      },
      {
        OR: [{ requiredMaterials: { not: null } }, { requiredEquipment: { not: null } }],
      },
    ];

    if (query.category) whereParts.push({ category: query.category });
    if (query.assignee?.trim()) {
      whereParts.push({
        responsibleUser: {
          OR: [
            { nameAr: { contains: query.assignee, mode: 'insensitive' } },
            { nameEn: { contains: query.assignee, mode: 'insensitive' } },
            { email: { contains: query.assignee, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (query.search?.trim()) {
      whereParts.push({
        OR: [
          { code: { contains: query.search, mode: 'insensitive' } },
          { nameAr: { contains: query.search, mode: 'insensitive' } },
          { missingRequirements: { contains: query.search, mode: 'insensitive' } },
          { requiredMaterials: { contains: query.search, mode: 'insensitive' } },
          { requiredEquipment: { contains: query.search, mode: 'insensitive' } },
          { project: { code: { contains: query.search, mode: 'insensitive' } } },
          { project: { nameAr: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const activities = await this.prisma.operationActivity.findMany({
      where: { AND: whereParts },
      select: ACTIVITY_REPORT_SELECT,
      orderBy: [{ plannedStart: 'asc' }, { code: 'asc' }],
    });

    const rows = activities.flatMap((activity) =>
      procurementRequirements(activity).map((requirement) => ({
        projectId: activity.project.id,
        projectCode: activity.project.code,
        projectName: activity.project.nameAr,
        clientName:
          activity.project.tender?.client?.nameAr ??
          activity.project.tender?.client?.nameEn ??
          null,
        activityId: activity.id,
        activityCode: activity.code,
        activityName: activity.nameAr,
        category: activity.category,
        location: activity.location,
        assignee: activity.responsibleUser?.nameAr ?? activity.responsibleUser?.nameEn ?? null,
        requirementType: requirement.type,
        requirementItem: requirement.item,
        status: requirement.status,
        notes: requirement.notes,
        blocked: requirement.status === 'BLOCKED',
        missingRequirements: activity.missingRequirements,
      })),
    );

    const filtered = rows.filter((row) => {
      if (query.requirementType && row.requirementType !== query.requirementType) return false;
      if (query.requirementStatus && row.status !== query.requirementStatus) return false;
      if (query.blockedOnly && !row.blocked) return false;
      return true;
    });

    const byStatus = tally(filtered.map((row) => row.status));
    const typeMap = new Map<string, number>();
    const projectMap = new Map<string, number>();

    filtered.forEach((row) => {
      typeMap.set(row.requirementType, (typeMap.get(row.requirementType) ?? 0) + 1);
      projectMap.set(row.projectName, (projectMap.get(row.projectName) ?? 0) + 1);
    });

    return {
      summary: {
        totalRequirements: filtered.length,
        blockedRequirements: filtered.filter((row) => row.blocked).length,
        affectedProjects: new Set(filtered.map((row) => row.projectId)).size,
        blockedActivities: new Set(
          filtered.filter((row) => row.blocked).map((row) => row.activityId),
        ).size,
        byStatus,
      },
      breakdowns: {
        byType: sortBreakdown(typeMap),
        byProject: sortBreakdown(projectMap),
      },
      items: filtered,
    };
  }

  async getDailyReportsHistory(query: DailyReportsHistoryQueryDto, caller: AuthUser) {
    const dateWhere: Prisma.DateTimeFilter = {};
    const start = parseDateBoundary(query.startDate, 'start');
    const end = parseDateBoundary(query.endDate, 'end');
    if (start) dateWhere.gte = start;
    if (end) dateWhere.lte = end;

    const whereParts: Prisma.DailyLogWhereInput[] = [
      {
        project: this.buildProjectWhere(caller, {
          projectId: query.projectId,
          client: query.client,
        }),
      },
    ];

    if (start || end) whereParts.push({ date: dateWhere });
    if (query.blockersOnly) whereParts.push({ blockers: { not: null } });
    if (query.search?.trim()) {
      whereParts.push({
        OR: [
          { summary: { contains: query.search, mode: 'insensitive' } },
          { blockers: { contains: query.search, mode: 'insensitive' } },
          { tomorrowPlan: { contains: query.search, mode: 'insensitive' } },
          { workedActivitiesSummary: { contains: query.search, mode: 'insensitive' } },
          { project: { code: { contains: query.search, mode: 'insensitive' } } },
          { project: { nameAr: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const logs = await this.prisma.dailyLog.findMany({
      where: { AND: whereParts },
      select: DAILY_LOG_REPORT_SELECT,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    const projectMap = new Map<string, number>();
    const items = logs.map((log) => {
      projectMap.set(log.project.nameAr, (projectMap.get(log.project.nameAr) ?? 0) + 1);
      return {
        id: log.id,
        projectCode: log.project.code,
        projectName: log.project.nameAr,
        clientName:
          log.project.tender?.client?.nameAr ?? log.project.tender?.client?.nameEn ?? null,
        date: log.date,
        summary: log.summary,
        blockers: log.blockers,
        tomorrowPlan: log.tomorrowPlan,
        completedWork: log.completedWork,
        workedActivitiesSummary: log.workedActivitiesSummary,
        createdBy: log.creator?.nameAr ?? log.creator?.nameEn ?? null,
        linkedActivities: log.relatedActivities.map((entry) => ({
          id: entry.activity.id,
          code: entry.activity.code,
          nameAr: entry.activity.nameAr,
          status: entry.activity.status,
        })),
      };
    });

    return {
      summary: {
        totalLogs: items.length,
        projectsCovered: new Set(items.map((item) => item.projectCode)).size,
        logsWithBlockers: items.filter((item) => item.blockers).length,
        linkedActivityCount: items.reduce((sum, item) => sum + item.linkedActivities.length, 0),
      },
      breakdowns: {
        byProject: sortBreakdown(projectMap),
      },
      items,
    };
  }

  async getCostSummaryReport(query: CostSummaryReportQueryDto, caller: AuthUser) {
    const projects = await this.prisma.project.findMany({
      where: this.buildProjectWhere(caller, {
        projectId: query.projectId,
        client: query.client,
        search: query.search,
      }),
      select: PROJECT_REPORT_SELECT,
      orderBy: { code: 'asc' },
    });

    const categoryMap = new Map<string, { estimated: number; actual: number; itemCount: number }>();

    const items = projects
      .map((project) => {
        const filteredCostItems = query.category
          ? project.costItems.filter((item) => item.category === query.category)
          : project.costItems;
        if (query.category && filteredCostItems.length === 0) return null;

        const estimated = round(
          filteredCostItems.reduce((sum, item) => sum + toNumber(item.totalCost), 0),
        );

        const costItemCategories = new Set(filteredCostItems.map((item) => item.category));
        const actual = round(
          project.invoices
            .filter((invoice) => {
              if (!query.category) return true;
              return invoice.costItem?.category === query.category;
            })
            .reduce((sum, invoice) => sum + toNumber(invoice.grossAmount), 0),
        );

        filteredCostItems.forEach((item) => {
          const current = categoryMap.get(item.category) ?? { estimated: 0, actual: 0, itemCount: 0 };
          current.estimated = round(current.estimated + toNumber(item.totalCost));
          current.itemCount += 1;
          categoryMap.set(item.category, current);
        });

        project.invoices.forEach((invoice) => {
          const category = invoice.costItem?.category ?? 'UNALLOCATED';
          if (query.category && category !== query.category) return;
          const current = categoryMap.get(category) ?? { estimated: 0, actual: 0, itemCount: 0 };
          current.actual = round(current.actual + toNumber(invoice.grossAmount));
          categoryMap.set(category, current);
        });

        const extractsTotal = round(
          project.extracts.reduce((sum, extract) => sum + toNumber(extract.totalAmount), 0),
        );
        const variance = round(actual - estimated);
        const spendingRatio = percentage(actual, estimated);
        const topCostItem = filteredCostItems
          .map((item) => ({ code: item.code, category: item.category, totalCost: toNumber(item.totalCost) }))
          .sort((a, b) => b.totalCost - a.totalCost)[0];

        return {
          projectId: project.id,
          projectCode: project.code,
          projectName: project.nameAr,
          clientName:
            project.tender?.client?.nameAr ?? project.tender?.client?.nameEn ?? null,
          currency: project.currency,
          estimated,
          actual,
          variance,
          spendingRatio,
          invoicesTotal: actual,
          extractsTotal,
          contractValue: toNumber(project.contractValue),
          topCostItemCode: topCostItem?.code ?? null,
          topCostCategory: topCostItem?.category ?? null,
          categoryCount: costItemCategories.size,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const estimatedTotal = round(items.reduce((sum, item) => sum + item.estimated, 0));
    const actualTotal = round(items.reduce((sum, item) => sum + item.actual, 0));
    const extractsTotal = round(items.reduce((sum, item) => sum + item.extractsTotal, 0));

    return {
      summary: {
        totalProjects: items.length,
        estimatedTotal,
        actualTotal,
        varianceTotal: round(actualTotal - estimatedTotal),
        spendingRatio: percentage(actualTotal, estimatedTotal),
        extractsTotal,
      },
      categories: [...categoryMap.entries()]
        .map(([category, values]) => ({
          category,
          estimated: values.estimated,
          actual: values.actual,
          variance: round(values.actual - values.estimated),
          itemCount: values.itemCount,
        }))
        .sort((a, b) => b.estimated - a.estimated || a.category.localeCompare(b.category)),
      items,
    };
  }

  async getInvoiceReport(query: InvoiceReportQueryDto, caller: AuthUser) {
    const dateFilter: Prisma.DateTimeFilter = {};
    const start = parseDateBoundary(query.startDate, 'start');
    const end = parseDateBoundary(query.endDate, 'end');
    if (start) dateFilter.gte = start;
    if (end) dateFilter.lte = end;

    const whereParts: Prisma.InvoiceWhereInput[] = [
      {
        project: this.buildProjectWhere(caller, {
          projectId: query.projectId,
          client: query.client,
        }),
      },
    ];

    if (start || end) whereParts.push({ date: dateFilter });
    if (query.status) whereParts.push({ status: query.status });
    if (query.vendor?.trim()) {
      whereParts.push({ vendor: { contains: query.vendor, mode: 'insensitive' } });
    }
    if (query.costCode?.trim()) {
      whereParts.push({ costItem: { code: { contains: query.costCode, mode: 'insensitive' } } });
    }
    if (query.search?.trim()) {
      whereParts.push({
        OR: [
          { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
          { vendor: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { project: { code: { contains: query.search, mode: 'insensitive' } } },
          { project: { nameAr: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { AND: whereParts },
      select: INVOICE_REPORT_SELECT,
      orderBy: [{ date: 'desc' }, { invoiceNumber: 'desc' }],
    });

    const byStatus = tally(invoices.map((invoice) => invoice.status));
    const projectMap = new Map<string, number>();

    const items = invoices.map((invoice) => {
      projectMap.set(invoice.project.nameAr, (projectMap.get(invoice.project.nameAr) ?? 0) + 1);
      return {
        id: invoice.id,
        projectCode: invoice.project.code,
        projectName: invoice.project.nameAr,
        clientName:
          invoice.project.tender?.client?.nameAr ??
          invoice.project.tender?.client?.nameEn ??
          null,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        vendor: invoice.vendor,
        costCode: invoice.costItem?.code ?? null,
        costItemName: invoice.costItem?.nameAr ?? null,
        costCategory: invoice.costItem?.category ?? null,
        description: invoice.description,
        amountBeforeTax: toNumber(invoice.amountBeforeTax),
        tax: toNumber(invoice.taxAmount),
        gross: toNumber(invoice.grossAmount),
        currency: invoice.currency,
        status: invoice.status,
      };
    });

    return {
      summary: {
        totalInvoices: items.length,
        grossTotal: round(items.reduce((sum, item) => sum + item.gross, 0)),
        submittedCount: items.filter((item) => item.status === 'SUBMITTED').length,
        approvedCount: items.filter((item) => item.status === 'APPROVED').length,
        paidCount: items.filter((item) => item.status === 'PAID').length,
        byStatus,
      },
      breakdowns: {
        byProject: sortBreakdown(projectMap),
      },
      items,
    };
  }

  async getExtractsReport(query: ExtractsReportQueryDto, caller: AuthUser) {
    const dateFilter: Prisma.DateTimeFilter = {};
    const start = parseDateBoundary(query.startDate, 'start');
    const end = parseDateBoundary(query.endDate, 'end');
    if (start) dateFilter.gte = start;
    if (end) dateFilter.lte = end;

    const whereParts: Prisma.ExtractWhereInput[] = [
      {
        project: this.buildProjectWhere(caller, {
          projectId: query.projectId,
          client: query.client,
        }),
      },
    ];

    if (start || end) whereParts.push({ date: dateFilter });
    if (query.status) whereParts.push({ status: query.status });
    if (query.search?.trim()) {
      whereParts.push({
        OR: [
          { extractNumber: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { project: { code: { contains: query.search, mode: 'insensitive' } } },
          { project: { nameAr: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const extracts = await this.prisma.extract.findMany({
      where: { AND: whereParts },
      select: EXTRACT_REPORT_SELECT,
      orderBy: [{ date: 'desc' }, { extractNumber: 'desc' }],
    });

    const byStatus = tally(extracts.map((extract) => extract.status));
    const projectMap = new Map<string, number>();

    const items = extracts.map((extract) => {
      projectMap.set(extract.project.nameAr, (projectMap.get(extract.project.nameAr) ?? 0) + 1);
      return {
        id: extract.id,
        projectCode: extract.project.code,
        projectName: extract.project.nameAr,
        clientName:
          extract.project.tender?.client?.nameAr ??
          extract.project.tender?.client?.nameEn ??
          null,
        extractNumber: extract.extractNumber,
        date: extract.date,
        description: extract.description,
        amountBeforeTax: toNumber(extract.amountBeforeTax),
        tax: toNumber(extract.taxAmount),
        total: toNumber(extract.totalAmount),
        currency: extract.currency,
        status: extract.status,
      };
    });

    return {
      summary: {
        totalExtracts: items.length,
        totalAmount: round(items.reduce((sum, item) => sum + item.total, 0)),
        submittedCount: items.filter((item) => item.status === 'SUBMITTED').length,
        approvedCount: items.filter((item) => item.status === 'APPROVED').length,
        paidCount: items.filter((item) => item.status === 'PAID').length,
        byStatus,
      },
      breakdowns: {
        byProject: sortBreakdown(projectMap),
      },
      items,
    };
  }
}
