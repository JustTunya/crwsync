-- CreateEnum
CREATE TYPE "TaskActivityTypeEnum" AS ENUM ('COLUMN_MOVED', 'PRIORITY_CHANGED', 'ASSIGNEE_CHANGED', 'DUE_DATE_CHANGED');

-- CreateTable
CREATE TABLE "task_activities" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "type" "TaskActivityTypeEnum" NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_task_activity_task_id_created" ON "task_activities"("task_id", "created_at");

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
