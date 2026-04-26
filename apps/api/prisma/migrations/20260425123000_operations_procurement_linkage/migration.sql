DO $$ BEGIN
  CREATE TYPE "LookaheadStatus" AS ENUM ('PLANNED', 'READY', 'IN_PROGRESS', 'BLOCKED', 'DONE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LookaheadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RequirementReadinessStatus" AS ENUM (
    'PENDING',
    'REQUESTED',
    'PARTIALLY_AVAILABLE',
    'AVAILABLE',
    'BLOCKED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'purchase_requests'
      AND column_name = 'requestedBy'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'purchase_requests'
      AND column_name = 'requestedById'
  ) THEN
    ALTER TABLE "purchase_requests" RENAME COLUMN "requestedBy" TO "requestedById";
  END IF;
END $$;

ALTER TABLE "purchase_requests"
  ALTER COLUMN "requestedById" DROP NOT NULL;

UPDATE "purchase_requests" AS pr
SET "requestedById" = NULL
WHERE "requestedById" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "users" AS u
    WHERE u."id" = pr."requestedById"
  );

UPDATE "operation_schedules" AS os
SET "createdById" = NULL
WHERE "createdById" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "users" AS u
    WHERE u."id" = os."createdById"
  );

ALTER TABLE "operation_activities"
  ADD COLUMN IF NOT EXISTS "laborRequirementStatus" "RequirementReadinessStatus",
  ADD COLUMN IF NOT EXISTS "laborRequirementNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "materialsRequirementStatus" "RequirementReadinessStatus",
  ADD COLUMN IF NOT EXISTS "materialsRequirementNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "equipmentRequirementStatus" "RequirementReadinessStatus",
  ADD COLUMN IF NOT EXISTS "equipmentRequirementNotes" TEXT;

ALTER TABLE "operation_activities"
  ALTER COLUMN "lookaheadStatus" DROP DEFAULT,
  ALTER COLUMN "priority" DROP DEFAULT;

ALTER TABLE "operation_activities"
  ALTER COLUMN "lookaheadStatus" TYPE "LookaheadStatus"
    USING ("lookaheadStatus"::text::"LookaheadStatus"),
  ALTER COLUMN "priority" TYPE "LookaheadPriority"
    USING ("priority"::text::"LookaheadPriority");

ALTER TABLE "operation_activities"
  ALTER COLUMN "lookaheadStatus" SET DEFAULT 'PLANNED',
  ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

UPDATE "operation_activities"
SET
  "laborRequirementStatus" = CASE
    WHEN COALESCE(BTRIM("requiredLabor"), '') = '' THEN NULL
    WHEN "laborRequirementStatus" IS NOT NULL THEN "laborRequirementStatus"
    WHEN "readyForExecution" THEN 'AVAILABLE'::"RequirementReadinessStatus"
    ELSE 'PENDING'::"RequirementReadinessStatus"
  END,
  "materialsRequirementStatus" = CASE
    WHEN COALESCE(BTRIM("requiredMaterials"), '') = '' THEN NULL
    WHEN "materialsRequirementStatus" IS NOT NULL THEN "materialsRequirementStatus"
    WHEN "readyForExecution" THEN 'AVAILABLE'::"RequirementReadinessStatus"
    ELSE 'PENDING'::"RequirementReadinessStatus"
  END,
  "equipmentRequirementStatus" = CASE
    WHEN COALESCE(BTRIM("requiredEquipment"), '') = '' THEN NULL
    WHEN "equipmentRequirementStatus" IS NOT NULL THEN "equipmentRequirementStatus"
    WHEN "readyForExecution" THEN 'AVAILABLE'::"RequirementReadinessStatus"
    ELSE 'PENDING'::"RequirementReadinessStatus"
  END;

CREATE INDEX IF NOT EXISTS "purchase_requests_requestedById_idx"
  ON "purchase_requests"("requestedById");
CREATE INDEX IF NOT EXISTS "operation_schedules_createdById_idx"
  ON "operation_schedules"("createdById");
CREATE INDEX IF NOT EXISTS "operation_activities_laborRequirementStatus_idx"
  ON "operation_activities"("laborRequirementStatus");
CREATE INDEX IF NOT EXISTS "operation_activities_materialsRequirementStatus_idx"
  ON "operation_activities"("materialsRequirementStatus");
CREATE INDEX IF NOT EXISTS "operation_activities_equipmentRequirementStatus_idx"
  ON "operation_activities"("equipmentRequirementStatus");

DO $$ BEGIN
  ALTER TABLE "purchase_requests"
    ADD CONSTRAINT "purchase_requests_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "operation_schedules"
    ADD CONSTRAINT "operation_schedules_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
