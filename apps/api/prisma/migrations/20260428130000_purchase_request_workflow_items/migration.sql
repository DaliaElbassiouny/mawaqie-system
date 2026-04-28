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

DELETE FROM "pr_approval_steps" AS current_step
USING "pr_approval_steps" AS duplicate_step
WHERE current_step.ctid < duplicate_step.ctid
  AND current_step."prId" = duplicate_step."prId"
  AND current_step."stage" = duplicate_step."stage";

CREATE UNIQUE INDEX IF NOT EXISTS "pr_approval_steps_prId_stage_key"
  ON "pr_approval_steps"("prId", "stage");
