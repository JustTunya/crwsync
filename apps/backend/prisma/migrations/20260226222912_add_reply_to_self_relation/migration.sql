/*
  Warnings:

  - You are about to drop the column `reply_to` on the `chat_messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "reply_to",
ADD COLUMN     "reply_to_id" UUID;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
