DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExtractStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ACTION_RESULT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "vendor" TEXT NOT NULL,
  "costItemId" TEXT,
  "description" TEXT,
  "amountBeforeTax" DECIMAL(18, 4) NOT NULL,
  "taxAmount" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "grossAmount" DECIMAL(18, 4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "extracts" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "extractNumber" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "description" TEXT,
  "amountBeforeTax" DECIMAL(18, 4) NOT NULL,
  "taxAmount" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(18, 4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "ExtractStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "extracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "title" TEXT,
  "description" TEXT,
  "uploadedById" TEXT,
  "storagePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "entityType" TEXT,
  "entityId" TEXT,
  "route" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_projectId_invoiceNumber_key"
  ON "invoices"("projectId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "invoices_projectId_idx"
  ON "invoices"("projectId");
CREATE INDEX IF NOT EXISTS "invoices_date_idx"
  ON "invoices"("date");
CREATE INDEX IF NOT EXISTS "invoices_status_idx"
  ON "invoices"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "extracts_projectId_extractNumber_key"
  ON "extracts"("projectId", "extractNumber");
CREATE INDEX IF NOT EXISTS "extracts_projectId_idx"
  ON "extracts"("projectId");
CREATE INDEX IF NOT EXISTS "extracts_date_idx"
  ON "extracts"("date");
CREATE INDEX IF NOT EXISTS "extracts_status_idx"
  ON "extracts"("status");

CREATE INDEX IF NOT EXISTS "documents_entityType_entityId_idx"
  ON "documents"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "documents_uploadedById_idx"
  ON "documents"("uploadedById");

CREATE INDEX IF NOT EXISTS "notifications_userId_idx"
  ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx"
  ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx"
  ON "notifications"("createdAt");

DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_costItemId_fkey"
    FOREIGN KEY ("costItemId") REFERENCES "cost_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "extracts"
    ADD CONSTRAINT "extracts_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "extracts"
    ADD CONSTRAINT "extracts_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "documents"
    ADD CONSTRAINT "documents_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
