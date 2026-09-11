-- CreateTable
CREATE TABLE "task_checklist_items" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_task_checklist_item_task_id_position" ON "task_checklist_items"("task_id", "position");

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
