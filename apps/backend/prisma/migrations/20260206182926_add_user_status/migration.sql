-- CreateEnum
CREATE TYPE "user_status_enum" AS ENUM ('online', 'busy', 'away');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status_preference" "user_status_enum" NOT NULL DEFAULT 'online';
