/*
  Warnings:

  - You are about to drop the column `is_deleted` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `is_edited` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `is_pinned` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `reply_to_id` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `room_id` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the `chat_rooms` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `channel_id` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_reply_to_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_room_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_rooms" DROP CONSTRAINT "chat_rooms_workspace_id_fkey";

-- DropIndex
DROP INDEX "chat_messages_room_id_created_at_idx";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "is_deleted",
DROP COLUMN "is_edited",
DROP COLUMN "is_pinned",
DROP COLUMN "reply_to_id",
DROP COLUMN "room_id",
ADD COLUMN     "channel_id" UUID NOT NULL;

-- DropTable
DROP TABLE "chat_rooms";

-- CreateTable
CREATE TABLE "chat_channels" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chat_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_channels_module_id_key" ON "chat_channels"("module_id");

-- CreateIndex
CREATE INDEX "idx_chat_channel_workspace_id" ON "chat_channels"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_chat_message_channel_id_created_at" ON "chat_messages"("channel_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "workspace_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "chat_messages_workspace_id_idx" RENAME TO "idx_chat_message_workspace_id";
