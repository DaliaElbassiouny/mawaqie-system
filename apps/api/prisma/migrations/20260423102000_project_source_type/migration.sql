DO $$ BEGIN
  CREATE TYPE "ProjectSourceType" AS ENUM ('TENDER', 'DIRECT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sourceType" "ProjectSourceType" NOT NULL DEFAULT 'DIRECT';

UPDATE "projects"
SET "sourceType" = 'TENDER'
WHERE "tenderId" IS NOT NULL;
