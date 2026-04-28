ALTER TABLE "tenders"
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "projectType" TEXT,
  ADD COLUMN IF NOT EXISTS "leadSource" TEXT,
  ADD COLUMN IF NOT EXISTS "estimatedValue" DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "submittedValue" DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "bidReceiptDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bidResult" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedEngineer" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenders'
      AND column_name = 'value'
  ) THEN
    UPDATE "tenders"
    SET "estimatedValue" = "value"
    WHERE "estimatedValue" IS NULL
      AND "value" IS NOT NULL;
  END IF;
END $$;

UPDATE "tenders"
SET "status" = CASE "status"::text
  WHEN 'DRAFT' THEN 'PRICING_IN_PROGRESS'::"TenderStatus"
  WHEN 'SUBMITTED' THEN 'PRICED_SUBMITTED'::"TenderStatus"
  WHEN 'AWARDED' THEN 'CONTRACTED'::"TenderStatus"
  WHEN 'CANCELLED' THEN 'LOST'::"TenderStatus"
  ELSE "status"
END
WHERE "status"::text IN ('DRAFT', 'SUBMITTED', 'AWARDED', 'CANCELLED');

ALTER TABLE "tenders"
  ALTER COLUMN "status" SET DEFAULT 'PRICING_IN_PROGRESS';

CREATE INDEX IF NOT EXISTS "tenders_status_idx"
  ON "tenders"("status");
CREATE INDEX IF NOT EXISTS "tenders_clientId_idx"
  ON "tenders"("clientId");
CREATE INDEX IF NOT EXISTS "tenders_dueDate_idx"
  ON "tenders"("dueDate");
