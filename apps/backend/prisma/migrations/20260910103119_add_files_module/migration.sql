-- AlterEnum
ALTER TYPE "module_type_enum" ADD VALUE 'files';

-- CreateTable
CREATE TABLE "file_rooms" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "file_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_files" (
    "id" UUID NOT NULL,
    "file_room_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_file_room_workspace_id" ON "file_rooms"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_workspace_file_room_id" ON "workspace_files"("file_room_id");

-- AddForeignKey
ALTER TABLE "file_rooms" ADD CONSTRAINT "file_rooms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_files" ADD CONSTRAINT "workspace_files_file_room_id_fkey" FOREIGN KEY ("file_room_id") REFERENCES "file_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_files" ADD CONSTRAINT "workspace_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
