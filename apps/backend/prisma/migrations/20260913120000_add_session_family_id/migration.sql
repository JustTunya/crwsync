-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "family_id" UUID;

-- Backfill: every pre-existing session becomes its own single-member family
UPDATE "sessions" SET "family_id" = "id" WHERE "family_id" IS NULL;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "family_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "idx_session_family_id" ON "sessions"("family_id");
