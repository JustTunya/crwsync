-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN "is_direct" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dm_user_a_id" UUID,
ADD COLUMN "dm_user_b_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "idx_chatroom_dm_unique" ON "chat_rooms"("workspace_id", "dm_user_a_id", "dm_user_b_id");
