-- Denormalize workspace_id onto tasks and task_comments
ALTER TABLE "tasks" ADD COLUMN "workspace_id" UUID;
ALTER TABLE "task_comments" ADD COLUMN "workspace_id" UUID;

UPDATE "tasks" t
SET "workspace_id" = b."workspace_id"
FROM "board_columns" bc
JOIN "boards" b ON b."id" = bc."board_id"
WHERE bc."id" = t."column_id";

UPDATE "task_comments" tc
SET "workspace_id" = t."workspace_id"
FROM "tasks" t
WHERE t."id" = tc."task_id";

ALTER TABLE "tasks" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "task_comments" ALTER COLUMN "workspace_id" SET NOT NULL;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_task_workspace_id" ON "tasks"("workspace_id");
CREATE INDEX "idx_task_comment_workspace_id" ON "task_comments"("workspace_id");

-- Full-text + trigram search infrastructure
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "tasks" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B')
  ) STORED;
CREATE INDEX "idx_tasks_search_vector" ON "tasks" USING GIN ("search_vector");
CREATE INDEX "idx_tasks_short_id_trgm" ON "tasks" USING GIN ("short_id" gin_trgm_ops);

ALTER TABLE "task_comments" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", ''))) STORED;
CREATE INDEX "idx_task_comments_search_vector" ON "task_comments" USING GIN ("search_vector");

ALTER TABLE "chat_messages" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", ''))) STORED;
CREATE INDEX "idx_chat_messages_search_vector" ON "chat_messages" USING GIN ("search_vector");

CREATE INDEX "idx_workspace_files_filename_trgm" ON "workspace_files" USING GIN ("file_name" gin_trgm_ops);
CREATE INDEX "idx_users_firstname_trgm" ON "users" USING GIN ("firstname" gin_trgm_ops);
CREATE INDEX "idx_users_lastname_trgm" ON "users" USING GIN ("lastname" gin_trgm_ops);
CREATE INDEX "idx_users_username_trgm" ON "users" USING GIN ("username" gin_trgm_ops);
