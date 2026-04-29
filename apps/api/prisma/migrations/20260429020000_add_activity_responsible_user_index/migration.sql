-- AddIndex: operation_activities.responsibleUserId
-- Safe additive migration — adds an index without modifying table data or column definitions.
CREATE INDEX IF NOT EXISTS "operation_activities_responsibleUserId_idx"
  ON "operation_activities"("responsibleUserId");
