-- CreateEnum
CREATE TYPE "ColumnType" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETE');

-- AlterTable
ALTER TABLE "board_columns" ADD COLUMN     "type" "ColumnType" NOT NULL DEFAULT 'UPCOMING';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "completed_at" TIMESTAMPTZ,
ADD COLUMN     "in_progress_at" TIMESTAMPTZ,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "short_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "task_sequence_counter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workspace_key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "idx_task_short_id" ON "tasks"("short_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_workspace_key_unique" ON "workspaces"("workspace_key");
