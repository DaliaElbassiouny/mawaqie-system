-- AddValue: PRStatus.COMPLETED
-- Safe additive migration — adds a new enum value without modifying existing data.
ALTER TYPE "PRStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
