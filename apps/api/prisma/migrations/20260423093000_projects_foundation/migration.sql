-- Projects workspace foundation fields
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectType" TEXT;

CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");
CREATE INDEX IF NOT EXISTS "projects_tenderId_idx" ON "projects"("tenderId");
