/*
  Warnings:

  - You are about to drop the column `channel_id` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the `chat_channels` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `room_id` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chat_channels" DROP CONSTRAINT "chat_channels_module_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_channel_id_fkey";

-- DropIndex
DROP INDEX "idx_chat_message_channel_id_created_at";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "channel_id",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reply_to" UUID,
ADD COLUMN     "room_id" UUID NOT NULL;

-- DropTable
DROP TABLE "chat_channels";

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_chatroom_workspace_id" ON "chat_rooms"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_chatmsg_room_created" ON "chat_messages"("room_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_chat_message_workspace_id" RENAME TO "idx_chatmsg_workspace_id";
