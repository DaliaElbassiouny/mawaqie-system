DO $$ BEGIN
  CREATE TYPE "PRApprovalStage" AS ENUM (
    'DRAFT',
    'PROCUREMENT_REVIEW',
    'COST_REVIEW',
    'PM_REVIEW',
    'FINAL_REVIEW',
    'COMPLETED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "PRStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "PRStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "PRStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_FULFILLED';
ALTER TYPE "PRStatus" ADD VALUE IF NOT EXISTS 'FULFILLED';
ALTER TYPE "PRStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';

ALTER TABLE "purchase_requests"
  ADD COLUMN IF NOT EXISTS "activityId" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "requirementType" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "priority" "LookaheadPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "currentStage" "PRApprovalStage" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "unit" TEXT,
  ADD COLUMN IF NOT EXISTS "vendor" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedDeliveryDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "actualDeliveryDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvalNote" TEXT;

CREATE INDEX IF NOT EXISTS "purchase_requests_status_idx"
  ON "purchase_requests"("status");
CREATE INDEX IF NOT EXISTS "purchase_requests_currentStage_idx"
  ON "purchase_requests"("currentStage");
CREATE INDEX IF NOT EXISTS "purchase_requests_priority_idx"
  ON "purchase_requests"("priority");

DO $$ BEGIN
  ALTER TABLE "purchase_requests"
    ADD CONSTRAINT "purchase_requests_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "operation_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "purchase_requests"
    ADD CONSTRAINT "purchase_requests_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "pr_items" (
  "id" TEXT NOT NULL,
  "prId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT,
  "description" TEXT,
  "quantity" DECIMAL(18, 4),
  "unit" TEXT,
  "unitPrice" DECIMAL(18, 4),
  "estimatedTotal" DECIMAL(18, 4),
  "approvedQuantity" DECIMAL(18, 4),
  "approvedUnitPrice" DECIMAL(18, 4),
  "approvedTotal" DECIMAL(18, 4),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pr_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pr_items_prId_idx"
  ON "pr_items"("prId");

CREATE UNIQUE INDEX IF NOT EXISTS "pr_items_prId_lineNumber_key"
  ON "pr_items"("prId", "lineNumber");

DO $$ BEGIN
  ALTER TABLE "pr_items"
    ADD CONSTRAINT "pr_items_prId_fkey"
    FOREIGN KEY ("prId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "pr_approval_steps" (
  "id" TEXT NOT NULL,
  "prId" TEXT NOT NULL,
  "stage" "PRApprovalStage" NOT NULL,
  "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
  "actorId" TEXT,
  "note" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pr_approval_steps_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pr_approval_steps"
  ADD COLUMN IF NOT EXISTS "id" TEXT,
  ADD COLUMN IF NOT EXISTS "prId" TEXT,
  ADD COLUMN IF NOT EXISTS "stage" "PRApprovalStage",
  ADD COLUMN IF NOT EXISTS "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "actorId" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "decidedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF to_regclass('public.pr_approval_steps') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'pr_approval_steps'
         AND column_name = 'prId'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'pr_approval_steps'
         AND column_name = 'stage'
     ) THEN
    DELETE FROM "pr_approval_steps" AS current_step
    USING "pr_approval_steps" AS duplicate_step
    WHERE current_step.ctid < duplicate_step.ctid
      AND current_step."prId" = duplicate_step."prId"
      AND current_step."stage" = duplicate_step."stage";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "pr_approval_steps_prId_stage_key"
  ON "pr_approval_steps"("prId", "stage");

CREATE INDEX IF NOT EXISTS "pr_approval_steps_prId_idx"
  ON "pr_approval_steps"("prId");
CREATE INDEX IF NOT EXISTS "pr_approval_steps_stage_idx"
  ON "pr_approval_steps"("stage");

DO $$ BEGIN
  ALTER TABLE "pr_approval_steps"
    ADD CONSTRAINT "pr_approval_steps_prId_fkey"
    FOREIGN KEY ("prId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "pr_approval_steps"
    ADD CONSTRAINT "pr_approval_steps_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
