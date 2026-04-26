DO $$ BEGIN
  CREATE TYPE "ActivityStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "operation_schedules" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "title" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "operation_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "operation_activities" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT,
  "projectId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "location" TEXT,
  "status" "ActivityStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "lookaheadStatus" TEXT NOT NULL DEFAULT 'PLANNED',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "readyForExecution" BOOLEAN NOT NULL DEFAULT false,
  "missingRequirements" TEXT,
  "plannedStart" TIMESTAMP(3),
  "plannedEnd" TIMESTAMP(3),
  "actualStart" TIMESTAMP(3),
  "actualEnd" TIMESTAMP(3),
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "responsibleUserId" TEXT,
  "notes" TEXT,
  "blockerReason" TEXT,
  "delayDays" INTEGER NOT NULL DEFAULT 0,
  "requiredLabor" TEXT,
  "requiredMaterials" TEXT,
  "requiredEquipment" TEXT,
  "expectedCost" DECIMAL(18,4),
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvalNote" TEXT,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "operation_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_logs" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "summary" TEXT,
  "completedWork" TEXT,
  "workedActivitiesSummary" TEXT,
  "blockers" TEXT,
  "notes" TEXT,
  "tomorrowPlan" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_log_activities" (
  "dailyLogId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,

  CONSTRAINT "daily_log_activities_pkey" PRIMARY KEY ("dailyLogId", "activityId")
);

ALTER TABLE "operation_activities"
  ADD COLUMN IF NOT EXISTS "lookaheadStatus" TEXT NOT NULL DEFAULT 'PLANNED',
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "readyForExecution" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "missingRequirements" TEXT;

ALTER TABLE "daily_logs"
  ADD COLUMN IF NOT EXISTS "completedWork" TEXT,
  ADD COLUMN IF NOT EXISTS "workedActivitiesSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "tomorrowPlan" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "operation_schedules_projectId_year_month_key"
  ON "operation_schedules"("projectId", "year", "month");
CREATE INDEX IF NOT EXISTS "operation_schedules_projectId_idx"
  ON "operation_schedules"("projectId");

CREATE UNIQUE INDEX IF NOT EXISTS "operation_activities_projectId_code_key"
  ON "operation_activities"("projectId", "code");
CREATE INDEX IF NOT EXISTS "operation_activities_scheduleId_idx"
  ON "operation_activities"("scheduleId");
CREATE INDEX IF NOT EXISTS "operation_activities_projectId_idx"
  ON "operation_activities"("projectId");
CREATE INDEX IF NOT EXISTS "operation_activities_status_idx"
  ON "operation_activities"("status");
CREATE INDEX IF NOT EXISTS "operation_activities_lookaheadStatus_idx"
  ON "operation_activities"("lookaheadStatus");
CREATE INDEX IF NOT EXISTS "operation_activities_priority_idx"
  ON "operation_activities"("priority");
CREATE INDEX IF NOT EXISTS "operation_activities_approvalStatus_idx"
  ON "operation_activities"("approvalStatus");
CREATE INDEX IF NOT EXISTS "operation_activities_plannedStart_idx"
  ON "operation_activities"("plannedStart");

CREATE UNIQUE INDEX IF NOT EXISTS "daily_logs_projectId_date_key"
  ON "daily_logs"("projectId", "date");
CREATE INDEX IF NOT EXISTS "daily_logs_projectId_idx"
  ON "daily_logs"("projectId");
CREATE INDEX IF NOT EXISTS "daily_logs_date_idx"
  ON "daily_logs"("date");
CREATE INDEX IF NOT EXISTS "daily_log_activities_activityId_idx"
  ON "daily_log_activities"("activityId");

DO $$ BEGIN
  ALTER TABLE "operation_schedules"
    ADD CONSTRAINT "operation_schedules_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "operation_activities"
    ADD CONSTRAINT "operation_activities_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "operation_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "operation_activities"
    ADD CONSTRAINT "operation_activities_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "operation_activities"
    ADD CONSTRAINT "operation_activities_responsibleUserId_fkey"
    FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "operation_activities"
    ADD CONSTRAINT "operation_activities_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "daily_logs"
    ADD CONSTRAINT "daily_logs_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "daily_logs"
    ADD CONSTRAINT "daily_logs_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "daily_log_activities"
    ADD CONSTRAINT "daily_log_activities_dailyLogId_fkey"
    FOREIGN KEY ("dailyLogId") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "daily_log_activities"
    ADD CONSTRAINT "daily_log_activities_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "operation_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
