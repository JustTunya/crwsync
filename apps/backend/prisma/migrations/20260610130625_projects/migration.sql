-- AlterTable
ALTER TABLE "workspace_modules" ADD COLUMN     "project_id" UUID;

-- CreateTable
CREATE TABLE "workspace_projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workspace_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pinned_modules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pinned_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_workspace_project_workspace_id" ON "workspace_projects"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_user_pinned_module_user_id" ON "user_pinned_modules"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_user_pinned_module_unique" ON "user_pinned_modules"("user_id", "module_id");

-- AddForeignKey
ALTER TABLE "workspace_modules" ADD CONSTRAINT "workspace_modules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "workspace_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_projects" ADD CONSTRAINT "workspace_projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pinned_modules" ADD CONSTRAINT "user_pinned_modules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pinned_modules" ADD CONSTRAINT "user_pinned_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "workspace_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
