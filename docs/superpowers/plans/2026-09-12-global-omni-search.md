# Global Omni-Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `Cmd+K` modal in the dashboard to search Tasks, Chat messages, Files, and Workspace members (server-backed, Postgres full-text/trigram), on top of the modal's existing client-side Modules filtering, with deep-link navigation from each result into the app — desktop and mobile.

**Architecture:** New NestJS `search` module runs four parallel raw-SQL queries (tsvector/GIN for prose fields, pg_trgm for short tokens), scoped by workspace, cached briefly in Redis. The frontend extracts the existing Cmd+K `Dialog` out of `l-sidebar.tsx` into its own component, adds a debounced query hook, and wires four deep-link handlers (task modal, chat scroll, file scroll, member scroll) plus a mobile-specific trigger and full-screen layout.

**Tech Stack:** NestJS + Prisma (`$queryRaw` tagged templates, existing convention — see `workspace.service.ts:537-551`), Postgres `tsvector`/GIN + `pg_trgm`, Next.js App Router + TanStack Query + Zustand (`useChatStore`) + `use-debounce` + Framer Motion, existing Radix `Dialog`/`Input` components.

**Spec:** `docs/superpowers/specs/2026-09-12-global-omni-search-design.md`

## Global Constraints

- No `contains`/ILIKE-only search for the new endpoint — Postgres `tsvector`+GIN for prose fields, `pg_trgm`+GIN for short-token fields (task codes, filenames, member names). (Spec: "Why Postgres full-text + trigram")
- `Task` and `TaskComment` get a denormalized `workspace_id` column (migration + backfill), not a 2-3-level join per search query. (Spec: "Data model")
- Raw SQL parameters are always passed via `$queryRaw` tagged-template interpolation (`${value}`), never string-concatenated — this is what makes Prisma parameterize them. (Security boundary, spec "Backend")
- Every backend route: `@UseGuards(IsMemberGuard)`, `ParseUUIDPipe({ version: "4" })` on the `workspaceId` param — mirrors `board.controller.ts`.
- Every frontend service function returns `{ success: boolean; data?: T; message?: string }` — mirrors `board.service.tsx`'s `getBoard`.
- No `cmdk` or any new npm dependency — reuse the existing Radix `Dialog`/`Input`, `use-debounce` (already installed), `useMediaQuery` (`(max-width: 768px)`, already used in `l-sidebar.tsx` and `TaskDetailModal.tsx`).
- No automated frontend UI/E2E tests — manual test steps are handed to the user after implementation. Backend gets one `search.service.spec.ts`.
- Modules category is unchanged (already client-filtered, already satisfies the roadmap's "index modules") — do not touch its filtering logic, only its container.

---

## Task 1: Migration — denormalize `workspace_id`, add full-text/trigram search infra

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (`Task` model, `TaskComment` model)
- Create: `apps/backend/prisma/migrations/<timestamp>_add_search_infrastructure/migration.sql`
- Modify: `apps/backend/src/board/board.service.ts` (`createTask` method)
- Modify: `apps/backend/src/workspace/workspace.service.ts` (`createTaskComment` method)

**Interfaces:**
- Produces: `tasks.workspace_id` (uuid, not null, indexed), `task_comments.workspace_id` (uuid, not null, indexed) — every later backend task reads these two columns directly instead of joining `board_columns`/`boards`.
- Produces: `tasks.search_vector`, `task_comments.search_vector`, `chat_messages.search_vector` (generated `tsvector`, GIN-indexed) — raw-SQL-only columns, not added to `schema.prisma` (Prisma can't represent `GENERATED ALWAYS AS ... STORED`), referenced only inside `$queryRaw` calls in Task 3.
- Produces: `pg_trgm` GIN indexes on `tasks.short_id`, `workspace_files.file_name`, `users.firstname`, `users.lastname`, `users.username` — same raw-SQL-only status, used only inside `$queryRaw` calls with `similarity(...)`/`ILIKE`.

- [ ] **Step 1: Edit `schema.prisma` — add `workspace_id` to `Task` and `TaskComment`**

In `apps/backend/prisma/schema.prisma`, find `model Task {` and add the new field + relation + index (keep every existing field/relation as-is, just insert these):

```prisma
model Task {
  id             String           @id @default(uuid()) @db.Uuid
  column_id      String           @db.Uuid
  workspace_id   String           @db.Uuid
  shortId        String           @unique(map: "idx_task_short_id") @map("short_id") @db.Text
  title          String           @db.Text
  description    String?          @db.Text
  priority       TaskPriorityEnum @default(NONE)
  labels         String[]         @default([])
  tags           String[]         @default([])
  assignee_id    String?          @db.Uuid
  due_date       DateTime?        @db.Timestamptz
  position       Int              @default(0)
  is_deleted     Boolean          @default(false)
  is_archived    Boolean          @default(false)
  in_progress_at DateTime?        @db.Timestamptz
  completed_at   DateTime?        @db.Timestamptz
  created_by     String           @db.Uuid
  created_at     DateTime         @default(now()) @db.Timestamptz
  updated_at     DateTime         @updatedAt @db.Timestamptz

  column         BoardColumn         @relation(fields: [column_id], references: [id], onDelete: Cascade)
  workspace      Workspace           @relation(fields: [workspace_id], references: [id], onDelete: Cascade)
  assignee       User?               @relation("TaskAssignee", fields: [assignee_id], references: [id], onDelete: SetNull)
  creator        User                @relation("TaskCreator", fields: [created_by], references: [id], onDelete: Cascade)
  attachments    TaskAttachment[]
  comments       TaskComment[]
  checklistItems TaskChecklistItem[]
  activities     TaskActivity[]

  @@index([column_id], map: "idx_task_column_id")
  @@index([assignee_id], map: "idx_task_assignee_id")
  @@index([workspace_id], map: "idx_task_workspace_id")
  @@map("tasks")
}
```

Find `model TaskComment {` and add the same field + index:

```prisma
model TaskComment {
  id           String   @id @default(uuid()) @db.Uuid
  task_id      String   @db.Uuid
  workspace_id String   @db.Uuid
  author_id    String   @db.Uuid
  content      String   @db.Text
  is_edited    Boolean  @default(false)
  is_deleted   Boolean  @default(false)
  created_at   DateTime @default(now()) @db.Timestamptz
  updated_at   DateTime @updatedAt @db.Timestamptz

  task     Task   @relation(fields: [task_id], references: [id], onDelete: Cascade)
  author   User   @relation("TaskCommentAuthor", fields: [author_id], references: [id], onDelete: Cascade)
  mentions User[] @relation("TaskCommentMentions")

  @@index([task_id, created_at], map: "idx_task_comment_task_id_created")
  @@index([workspace_id], map: "idx_task_comment_workspace_id")
  @@map("task_comments")
}
```

Also find `model Workspace {` and confirm/add the back-relation for `Task` (Prisma requires both sides). Add a line `tasks Task[]` next to the existing `boards_created`-style relation list on `Workspace` if it isn't implied automatically — run `npx prisma format` (Step 2 below will surface a clear error if a back-relation is missing, naming the exact model).

- [ ] **Step 2: Generate a schema-only migration, then hand-edit it**

Run (from `apps/backend`):

```bash
npx prisma migrate dev --create-only -n add_search_infrastructure
```

This creates `apps/backend/prisma/migrations/<timestamp>_add_search_infrastructure/migration.sql` with Prisma's naive SQL (an `ADD COLUMN ... NOT NULL` with no default, which would fail against the existing non-empty `tasks`/`task_comments` tables). Do not run `prisma migrate dev` yet — replace the entire generated file's contents with the hand-written SQL below, which adds the columns nullable, backfills, then locks them `NOT NULL`, and adds every full-text/trigram index in the same migration:

```sql
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
```

- [ ] **Step 3: Apply the migration and regenerate the Prisma client**

```bash
npx prisma migrate dev
npx prisma generate
```

Expected: migration applies cleanly (no error about `NOT NULL` on existing rows, since the backfill runs before the constraint), `prisma generate` completes, and `PrismaClient`'s `Task`/`TaskComment` types now include `workspace_id: string`.

- [ ] **Step 4: Write `workspace_id` on new tasks — `board.service.ts`**

In `apps/backend/src/board/board.service.ts`, `createTask` currently builds the task without `workspace_id` (it's implicit via `column_id` today). Add the field to the `data` object — `workspaceId` is already the method's first parameter, already in scope:

```ts
      const task = await this.prisma.task.create({
        data: {
          column_id: dto.column_id,
          workspace_id: workspaceId,
          shortId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          labels: dto.labels ?? [],
          tags: dto.tags ?? [],
          assignee_id: dto.assignee_id,
          due_date: dto.due_date ? new Date(dto.due_date) : undefined,
          position: nextPosition,
          in_progress_at,
          completed_at,
          created_by: userId,
        },
      });
```

- [ ] **Step 5: Write `workspace_id` on new comments — `workspace.service.ts`**

In `apps/backend/src/workspace/workspace.service.ts`, `createTaskComment` already has `workspaceId` as its first parameter. Add it to the `taskComment.create` call:

```ts
    const comment = await this.prisma.taskComment.create({
      data: {
        task_id: taskId,
        workspace_id: workspaceId,
        author_id: authorId,
        content: dto.content,
        ...(validMentionIds.length ? { mentions: { connect: validMentionIds.map((id) => ({ id })) } } : {}),
      },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        mentions: { select: COMMENT_AUTHOR_SELECT },
      },
    });
```

- [ ] **Step 6: Run the backend test suite to confirm nothing broke**

```bash
cd apps/backend && npx jest board.service.spec.ts task-comment.service.spec.ts
```

Expected: PASS (existing tests don't assert on the `task.create`/`taskComment.create` call's exact `data` shape with `toHaveBeenCalledWith` on the full object, only on specific fields via `expect.objectContaining` — verify this holds; if any test does a strict full-object match, update it to include `workspace_id: "ws-1"` in the expected object).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations apps/backend/src/board/board.service.ts apps/backend/src/workspace/workspace.service.ts
git commit -m "feat(search): denormalize workspace_id on Task/TaskComment, add full-text/trigram search infra"
```

---

## Task 2: `CacheKeys`/`CacheTTL` entries for search

**Files:**
- Modify: `apps/backend/src/redis/cache-keys.ts`

**Interfaces:**
- Produces: `CacheKeys.workspaceSearch(workspaceId: string, q: string): string`, `CacheTTL.SEARCH: number` — consumed by `SearchService` in Task 3.

- [ ] **Step 1: Add the new key factory and TTL constant**

Full new file content (append to the existing object literals, don't touch existing entries):

```ts
export const CacheKeys = {
  session: (id: string) => `session:${id}`,
  user: (id: string) => `user:${id}`,
  userByIdentifier: (identifier: string) => `user:identifier:${identifier.toLowerCase()}`,
  userWorkspaces: (userId: string) => `user:${userId}:workspaces`,
  workspace: (id: string) => `workspace:${id}`,
  workspaceSlug: (slug: string) => `workspace:slug:${slug.toLowerCase()}`,
  workspaceMember: (workspaceId: string, userId: string) => `workspace:${workspaceId}:member:${userId}`,
  verification: (email: string) => `verification:${email.toLowerCase()}`,
  workspaceSearch: (workspaceId: string, q: string) =>
    `workspace:${workspaceId}:search:${q.toLowerCase().trim()}`,
};

export const CacheTTL = {
  SESSION: 300, // 5 minutes
  USER: 600, // 10 minutes
  WORKSPACE: 600, // 10 minutes
  WORKSPACE_MEMBER: 600, // 10 minutes
  USER_WORKSPACES: 600, // 10 minutes
  VERIFICATION: 300, // 5 minutes
  SEARCH: 30, // 30 seconds
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/redis/cache-keys.ts
git commit -m "feat(search): add CacheKeys/CacheTTL entries for workspace search"
```

---

## Task 3: `SearchModule` — backend search endpoint

**Files:**
- Create: `apps/backend/src/search/search.module.ts`
- Create: `apps/backend/src/search/search.controller.ts`
- Create: `apps/backend/src/search/search.service.ts`
- Create: `apps/backend/src/search/dto/search.dto.ts`
- Create: `apps/backend/src/search/search.service.spec.ts`
- Modify: `apps/backend/src/app.module.ts` (register `SearchModule`)

**Interfaces:**
- Consumes: `CacheService.get<T>(key)` / `.set<T>(key, value, ttlSeconds)` (`src/redis/cache.service.ts:55,66`), `CacheKeys.workspaceSearch`/`CacheTTL.SEARCH` (Task 2), `PrismaService` (`src/prisma/prisma.service.ts`), `IsMemberGuard` (`src/workspace/guards/ws-member.guard.ts`).
- Produces: `SearchService.search(workspaceId: string, q: string): Promise<{ success: true; data: SearchResults }>` where
  ```ts
  interface SearchResults {
    tasks: { id: string; shortId: string; title: string; boardId: string; boardName: string; columnName: string }[];
    chats: { id: string; roomId: string; roomName: string | null; content: string; createdAt: string }[];
    files: { id: string; fileName: string; fileRoomId: string; fileRoomName: string | null }[];
    members: { id: string; firstname: string; lastname: string; username: string; avatarKey: string | null; role: string }[];
  }
  ```
  — this exact shape is what `services/search.service.ts` (Task 5) and `OmniSearchModal.tsx` (Task 8) consume.
- Produces: `GET /workspaces/:workspaceId/search?q=` route, guarded by `IsMemberGuard`.

- [ ] **Step 1: Write the DTO**

```ts
// apps/backend/src/search/dto/search.dto.ts
import { IsString, Length } from "class-validator";

export class SearchQueryDto {
  @IsString()
  @Length(1, 200)
  q: string;
}
```

- [ ] **Step 2: Write the failing spec — workspace scoping + limit + SQL-injection safety**

```ts
// apps/backend/src/search/search.service.spec.ts
import { SearchService } from "./search.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";

function makeService() {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  };
  return {
    service: new SearchService(prisma as unknown as PrismaService, cache as unknown as CacheService),
    prisma,
    cache,
  };
}

describe("SearchService", () => {
  it("runs all four entity queries scoped by workspaceId and caps each at 5 rows", async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: "t1", short_id: "CRW-1", title: "Ship it", board_id: "b1", board_name: "Main", column_name: "Todo" }])
      .mockResolvedValueOnce([{ id: "m1", room_id: "r1", room_name: "General", content: "hello", created_at: new Date("2026-01-01") }])
      .mockResolvedValueOnce([{ id: "f1", file_name: "spec.pdf", file_room_id: "fr1", file_room_name: "Docs" }])
      .mockResolvedValueOnce([{ id: "u1", firstname: "Ada", lastname: "Lovelace", username: "ada", avatar_key: null, role: "MEMBER" }]);

    const result = await service.search("ws-1", "ship");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
    expect(result).toEqual({
      success: true,
      data: {
        tasks: [{ id: "t1", shortId: "CRW-1", title: "Ship it", boardId: "b1", boardName: "Main", columnName: "Todo" }],
        chats: [{ id: "m1", roomId: "r1", roomName: "General", content: "hello", createdAt: new Date("2026-01-01").toISOString() }],
        files: [{ id: "f1", fileName: "spec.pdf", fileRoomId: "fr1", fileRoomName: "Docs" }],
        members: [{ id: "u1", firstname: "Ada", lastname: "Lovelace", username: "ada", avatarKey: null, role: "MEMBER" }],
      },
    });
  });

  it("returns empty arrays instead of throwing on a SQL-injection-shaped query", async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.search("ws-1", "' OR 1=1--");

    expect(result.success).toBe(true);
    expect(result.data.tasks).toEqual([]);
    expect(result.data.chats).toEqual([]);
    expect(result.data.files).toEqual([]);
    expect(result.data.members).toEqual([]);
  });

  it("caches the result and returns the cached value on a repeat query", async () => {
    const { service, prisma, cache } = makeService();
    prisma.$queryRaw.mockResolvedValue([]);
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce({
      success: true,
      data: { tasks: [], chats: [], files: [], members: [] },
    });

    await service.search("ws-1", "ship");
    await service.search("ws-1", "ship");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(4); // only the first call hits Postgres
    expect(cache.set).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the spec to confirm it fails**

```bash
cd apps/backend && npx jest search.service.spec.ts
```

Expected: FAIL — `Cannot find module './search.service'`.

- [ ] **Step 4: Implement `SearchService`**

```ts
// apps/backend/src/search/search.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { CacheKeys, CacheTTL } from "src/redis/cache-keys";

interface TaskRow {
  id: string;
  short_id: string;
  title: string;
  board_id: string;
  board_name: string;
  column_name: string;
}

interface ChatRow {
  id: string;
  room_id: string;
  room_name: string | null;
  content: string;
  created_at: Date;
}

interface FileRow {
  id: string;
  file_name: string;
  file_room_id: string;
  file_room_name: string | null;
}

interface MemberRow {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  avatar_key: string | null;
  role: string;
}

export interface SearchResults {
  tasks: { id: string; shortId: string; title: string; boardId: string; boardName: string; columnName: string }[];
  chats: { id: string; roomId: string; roomName: string | null; content: string; createdAt: string }[];
  files: { id: string; fileName: string; fileRoomId: string; fileRoomName: string | null }[];
  members: { id: string; firstname: string; lastname: string; username: string; avatarKey: string | null; role: string }[];
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async search(workspaceId: string, q: string): Promise<{ success: true; data: SearchResults }> {
    const query = q.trim();
    const cacheKey = CacheKeys.workspaceSearch(workspaceId, query);
    const cached = await this.cache.get<{ success: true; data: SearchResults }>(cacheKey);
    if (cached) return cached;

    const likeParam = `%${query}%`;

    const [taskRows, chatRows, fileRows, memberRows] = await Promise.all([
      this.prisma.$queryRaw<TaskRow[]>`
        SELECT t.id, t.short_id, t.title, bc.board_id, b.name AS board_name, bc.name AS column_name
        FROM tasks t
        JOIN board_columns bc ON bc.id = t.column_id
        JOIN boards b ON b.id = bc.board_id
        WHERE t.workspace_id = ${workspaceId}::uuid
          AND t.is_deleted = false AND t.is_archived = false
          AND (t.search_vector @@ websearch_to_tsquery('english', ${query}) OR t.short_id ILIKE ${likeParam})
        ORDER BY ts_rank(t.search_vector, websearch_to_tsquery('english', ${query})) DESC
        LIMIT 5
      `,
      this.prisma.$queryRaw<ChatRow[]>`
        SELECT cm.id, cm.room_id, cr.name AS room_name, substring(cm.content, 1, 140) AS content, cm.created_at
        FROM chat_messages cm
        JOIN chat_rooms cr ON cr.id = cm.room_id
        WHERE cm.workspace_id = ${workspaceId}::uuid AND cm.is_deleted = false
          AND cm.search_vector @@ websearch_to_tsquery('english', ${query})
        ORDER BY ts_rank(cm.search_vector, websearch_to_tsquery('english', ${query})) DESC
        LIMIT 5
      `,
      this.prisma.$queryRaw<FileRow[]>`
        SELECT wf.id, wf.file_name, wf.file_room_id, fr.name AS file_room_name
        FROM workspace_files wf
        JOIN file_rooms fr ON fr.id = wf.file_room_id
        WHERE fr.workspace_id = ${workspaceId}::uuid AND similarity(wf.file_name, ${query}) > 0.2
        ORDER BY similarity(wf.file_name, ${query}) DESC
        LIMIT 5
      `,
      this.prisma.$queryRaw<MemberRow[]>`
        SELECT u.id, u.firstname, u.lastname, u.username, u.avatar_key, wm.role
        FROM users u
        JOIN workspace_members wm ON wm.user_id = u.id
        WHERE wm.workspace_id = ${workspaceId}::uuid
          AND (similarity(u.firstname || ' ' || u.lastname, ${query}) > 0.2
               OR u.username ILIKE ${likeParam} OR u.email ILIKE ${likeParam})
        ORDER BY similarity(u.firstname || ' ' || u.lastname, ${query}) DESC
        LIMIT 5
      `,
    ]);

    const result: { success: true; data: SearchResults } = {
      success: true,
      data: {
        tasks: taskRows.map((t) => ({
          id: t.id,
          shortId: t.short_id,
          title: t.title,
          boardId: t.board_id,
          boardName: t.board_name,
          columnName: t.column_name,
        })),
        chats: chatRows.map((c) => ({
          id: c.id,
          roomId: c.room_id,
          roomName: c.room_name,
          content: c.content,
          createdAt: c.created_at.toISOString(),
        })),
        files: fileRows.map((f) => ({
          id: f.id,
          fileName: f.file_name,
          fileRoomId: f.file_room_id,
          fileRoomName: f.file_room_name,
        })),
        members: memberRows.map((m) => ({
          id: m.id,
          firstname: m.firstname,
          lastname: m.lastname,
          username: m.username,
          avatarKey: m.avatar_key,
          role: m.role,
        })),
      },
    };

    await this.cache.set(cacheKey, result, CacheTTL.SEARCH);
    return result;
  }
}
```

- [ ] **Step 5: Run the spec to confirm it passes**

```bash
cd apps/backend && npx jest search.service.spec.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Write the controller**

```ts
// apps/backend/src/search/search.controller.ts
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { SearchService } from "src/search/search.service";
import { SearchQueryDto } from "src/search/dto/search.dto";

@Controller("workspaces/:workspaceId/search")
@UseGuards(IsMemberGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Throttle({ default: { ttl: 10_000, limit: 20 } })
  search(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Query() { q }: SearchQueryDto,
  ) {
    return this.searchService.search(workspaceId, q);
  }
}
```

- [ ] **Step 7: Write the module and register it in `AppModule`**

```ts
// apps/backend/src/search/search.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SearchController } from "src/search/search.controller";
import { SearchService } from "src/search/search.service";

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
```

In `apps/backend/src/app.module.ts`, add the import line near the other feature-module imports:

```ts
import { SearchModule } from "src/search/search.module";
```

And add `SearchModule` to the `imports` array, right after `BoardModule`:

```ts
    BoardModule,
    SearchModule,
    ChatModule,
```

- [ ] **Step 8: Manually verify the endpoint responds**

```bash
cd apps/backend && pnpm dev
```

Then, with a valid session cookie/token and a real `workspaceId` you're a member of:

```bash
curl -s "http://localhost:3001/workspaces/<workspaceId>/search?q=test" -H "Cookie: <your session cookie>" | jq
```

Expected: `{ "success": true, "data": { "tasks": [...], "chats": [...], "files": [...], "members": [...] } }`, HTTP 200. A request with a `workspaceId` you're not a member of returns 403/404 (via `IsMemberGuard`), confirming the guard is wired.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/search apps/backend/src/app.module.ts
git commit -m "feat(search): add SearchModule with tasks/chats/files/members endpoint"
```

---

## Task 4: `search.service.ts` + `searchKeys` + `useOmniSearch` hook (frontend)

**Files:**
- Create: `apps/frontend/dash/services/search.service.ts`
- Modify: `apps/frontend/dash/hooks/query-keys.ts` (add `searchKeys`)
- Create: `apps/frontend/dash/hooks/use-search.ts`
- Modify: `apps/frontend/dash/services/board.service.tsx` (delete dead `searchWorkspaceTasks`/`TaskSearchResult`)

**Interfaces:**
- Produces: `searchWorkspace(workspaceId: string, q: string): Promise<{ success: boolean; data?: SearchResults; message?: string }>` where `SearchResults` matches Task 3's backend response shape exactly (camelCase fields).
- Produces: `searchKeys.query(workspaceId: string, q: string)` and `useOmniSearch(workspaceId: string, query: string): { data, isLoading }` — consumed by `OmniSearchModal.tsx` in Task 6.

- [ ] **Step 1: Delete the dead `searchWorkspaceTasks` code**

In `apps/frontend/dash/services/board.service.tsx`, delete the unused `TaskSearchResult` interface and `searchWorkspaceTasks` function (confirmed no callers anywhere in the app — it's dead code superseded by this feature's new endpoint).

- [ ] **Step 2: Write `search.service.ts`**

```ts
// apps/frontend/dash/services/search.service.ts
import { isAxiosError } from "axios";
import { api } from "@/services/auth.service";

export interface SearchResults {
  tasks: { id: string; shortId: string; title: string; boardId: string; boardName: string; columnName: string }[];
  chats: { id: string; roomId: string; roomName: string | null; content: string; createdAt: string }[];
  files: { id: string; fileName: string; fileRoomId: string; fileRoomName: string | null }[];
  members: { id: string; firstname: string; lastname: string; username: string; avatarKey: string | null; role: string }[];
}

export interface SearchOperationState<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function searchWorkspace(
  workspaceId: string,
  q: string,
): Promise<SearchOperationState<SearchResults>> {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/search`, { params: { q } });
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || "Failed to search" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
```

- [ ] **Step 3: Add `searchKeys` to `query-keys.ts`**

```ts
export const searchKeys = {
  all: ["search"] as const,
  query: (workspaceId: string, q: string) => [...searchKeys.all, workspaceId, q] as const,
};
```

- [ ] **Step 4: Write `use-search.ts`**

```ts
// apps/frontend/dash/hooks/use-search.ts
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { searchKeys } from "@/hooks/query-keys";
import { searchWorkspace } from "@/services/search.service";

export function useOmniSearch(workspaceId: string | undefined, query: string) {
  const [debounced] = useDebounce(query.trim(), 300);

  return useQuery({
    queryKey: searchKeys.query(workspaceId || "", debounced),
    queryFn: () => searchWorkspace(workspaceId!, debounced),
    enabled: !!workspaceId && debounced.length >= 2,
    staleTime: 10_000,
    select: (result) => result.data,
  });
}
```

- [ ] **Step 5: Manually verify with a throwaway test page or the browser console**

Run `pnpm dev` in `apps/frontend/dash`, then in the browser devtools console on any workspace page:

```js
fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces/<workspaceId>/search?q=test`, { credentials: "include" }).then(r => r.json()).then(console.log)
```

Expected: same JSON shape as Task 3 Step 8's `curl` check. (Full hook verification happens visually once Task 6 wires it into the modal.)

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/services/search.service.ts apps/frontend/dash/hooks/query-keys.ts apps/frontend/dash/hooks/use-search.ts apps/frontend/dash/services/board.service.tsx
git commit -m "feat(search): add search service, query keys, and useOmniSearch hook"
```

---

## Task 5: `useHighlightTarget` shared scroll-and-flash hook

**Files:**
- Create: `apps/frontend/dash/hooks/use-highlight-target.ts`

**Interfaces:**
- Produces: `highlightTarget(elementId: string, flashSelector?: string): void` — consumed by Tasks 7, 8, 9 (chat, file, member deep-links).

- [ ] **Step 1: Write the hook**

Chat messages need the flash applied to a nested `.message-highlight-target` element (the existing reply-jump convention in `MessageBubble.tsx`, root id `message-${id}`); file/member rows have no such nested element, so the flash applies to the target itself:

```ts
// apps/frontend/dash/hooks/use-highlight-target.ts
export function highlightTarget(elementId: string, flashSelector?: string): void {
  const target = document.getElementById(elementId);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  const flashEl = flashSelector ? target.querySelector(flashSelector) : target;
  if (!flashEl) return;

  flashEl.classList.add("bg-primary/20");
  setTimeout(() => flashEl.classList.remove("bg-primary/20"), 1500);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/dash/hooks/use-highlight-target.ts
git commit -m "feat(search): add shared scroll-and-highlight hook for deep-link targets"
```

---

## Task 6: Extract `OmniSearchModal.tsx` from `l-sidebar.tsx` (Modules section unchanged)

**Files:**
- Create: `apps/frontend/dash/components/search/OmniSearchModal.tsx`
- Modify: `apps/frontend/dash/components/l-sidebar.tsx`

**Interfaces:**
- Produces: `<OmniSearchModal open={boolean} onOpenChange={(open: boolean) => void} slug={string} activeWorkspaceId={string} localModules={WorkspaceModule[] | undefined} pathname={string} />` — this is Task 7's extension point (Tasks/Chats/Files/Members sections get added inside this same component).

- [ ] **Step 1: Create `OmniSearchModal.tsx` with exactly today's Modules-only behavior**

This step is a pure extraction — no new features yet, so the modal must look/behave identically to today's after this step (verified manually before moving on):

```tsx
// apps/frontend/dash/components/search/OmniSearchModal.tsx
"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarModule, SidebarGlobalModule } from "@/components/sidebar/SidebarModule";
import { getModules, getModuleIcon, getModuleHref, isModuleActive } from "@/lib/sidebar.utils";
import { WorkspaceModule } from "@crwsync/types";

interface OmniSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  activeWorkspaceId: string;
  localModules: WorkspaceModule[] | undefined;
  pathname: string;
}

export function OmniSearchModal({
  open,
  onOpenChange,
  slug,
  activeWorkspaceId,
  localModules,
  pathname,
}: OmniSearchModalProps) {
  const [query, setQuery] = useState("");

  const modules = getModules(slug);
  const queryLower = query.toLowerCase();
  const filteredGlobal = modules.filter((m) => m.name.toLowerCase().includes(queryLower));
  const filteredLocal = localModules?.filter((m) => m.name.toLowerCase().includes(queryLower)) || [];

  const noResults = filteredGlobal.length === 0 && filteredLocal.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden bg-base-100" showCloseButton={false}>
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <DialogDescription className="sr-only">Search modules, tasks, chats, files, and members</DialogDescription>
        <div className="flex items-center px-4 border-b border-base-200">
          <HugeiconsIcon icon={Search01Icon} className="mr-2 size-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            className="flex-1 focus-within:ring-0 focus-within:border-transparent border-0 px-0 shadow-none bg-transparent text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col">
          {noResults && <p className="text-sm text-muted-foreground text-center py-6">No modules found.</p>}

          {filteredGlobal.map((module) => (
            <div key={module.name} onClick={() => onOpenChange(false)}>
              <SidebarGlobalModule
                icon={module.icon}
                name={module.name}
                href={module.href}
                shortcut={module.shortcut}
                active={pathname === module.href}
                extended={true}
              />
            </div>
          ))}

          {filteredGlobal.length > 0 && filteredLocal.length > 0 && (
            <div className="h-px w-full bg-base-200 rounded-full my-2 shrink-0" />
          )}

          {filteredLocal.map((mod) => (
            <div key={mod.id} onClick={() => onOpenChange(false)}>
              <SidebarModule
                id={mod.id}
                activeWorkspaceId={activeWorkspaceId}
                icon={getModuleIcon(mod.type)}
                name={mod.name}
                href={getModuleHref(slug, mod)}
                active={isModuleActive(pathname, slug, mod)}
                extended={true}
                unreadCount={isModuleActive(pathname, slug, mod) ? undefined : mod.unreadCount}
                isPinned={mod.isPinned}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire it into `l-sidebar.tsx`, removing the old inline `Dialog` block**

In `apps/frontend/dash/components/l-sidebar.tsx`:

1. Add the import: `import { OmniSearchModal } from "@/components/search/OmniSearchModal";`
2. Delete the `modalSearchQuery`/`setModalSearchQuery` state (line ~74) and the `modalFilteredGlobal`/`modalFilteredLocal` computation (lines ~163-165) — they now live inside `OmniSearchModal`. Keep `searchModalOpen`/`setSearchModalOpen` (the hotkey and hamburger-area trigger still need to open/close it from here).
3. Replace the entire `<Dialog open={searchModalOpen} ...>...</Dialog>` block (lines 475-528) with:

```tsx
      <OmniSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        slug={slug}
        activeWorkspaceId={activeWorkspaceId || ""}
        localModules={localModules}
        pathname={pathname}
      />
```

- [ ] **Step 3: Manually verify the extraction is behavior-identical**

```bash
cd apps/frontend/dash && pnpm dev
```

In the browser: collapse the sidebar rail, click the search icon (or press `Ctrl+K`/`Cmd+K` while collapsed) — the modal opens, typing filters modules exactly as before, clicking a module result navigates and closes the modal, "No modules found." shows for a garbage query. No visual or behavioral change from before this task.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/search/OmniSearchModal.tsx apps/frontend/dash/components/l-sidebar.tsx
git commit -m "refactor(search): extract Cmd+K modal into OmniSearchModal component"
```

---

## Task 7: Add Tasks/Chats/Files/Members sections + keyboard nav to `OmniSearchModal`

**Files:**
- Modify: `apps/frontend/dash/components/search/OmniSearchModal.tsx`

**Interfaces:**
- Consumes: `useOmniSearch(workspaceId, query)` (Task 4), `getModuleHref` (existing, `@/lib/sidebar.utils`).
- Produces: a `router.push` call per result type — Tasks push to `/{slug}/board/{boardId}?taskId={id}`, Chats to `/{slug}/chat/{roomId}?messageId={id}`, Files to `/{slug}/files/{fileRoomId}?fileId={id}`, Members to `/{slug}/settings/members?memberId={id}` — these exact query-param names/shapes are what Tasks 8-11 read on the destination pages.

- [ ] **Step 1: Add the new props, the search hook, and result-row rendering**

Replace the full file with (adds `workspaceId`/`router` props and usage, keeps every Modules-section line from Task 6 unchanged):

```tsx
// apps/frontend/dash/components/search/OmniSearchModal.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  CheckmarkSquare02Icon,
  Chat01Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { SidebarModule, SidebarGlobalModule } from "@/components/sidebar/SidebarModule";
import { getModules, getModuleIcon, getModuleHref, isModuleActive } from "@/lib/sidebar.utils";
import { useOmniSearch } from "@/hooks/use-search";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { WorkspaceModule } from "@crwsync/types";

interface OmniSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  workspaceId: string;
  localModules: WorkspaceModule[] | undefined;
  pathname: string;
  onNavigate?: () => void;
}

type ResultRow = { key: string; onSelect: () => void };

export function OmniSearchModal({
  open,
  onOpenChange,
  slug,
  workspaceId,
  localModules,
  pathname,
  onNavigate,
}: OmniSearchModalProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const modules = getModules(slug);
  const queryLower = query.toLowerCase();
  const filteredGlobal = modules.filter((m) => m.name.toLowerCase().includes(queryLower));
  const filteredLocal = localModules?.filter((m) => m.name.toLowerCase().includes(queryLower)) || [];

  const { data: results, isLoading } = useOmniSearch(workspaceId, query);

  const close = () => {
    onOpenChange(false);
    onNavigate?.();
  };

  const goToTask = (boardId: string, taskId: string) => {
    router.push(`/${slug}/board/${boardId}?taskId=${taskId}`);
    close();
  };
  const goToChat = (roomId: string, messageId: string) => {
    router.push(`/${slug}/chat/${roomId}?messageId=${messageId}`);
    close();
  };
  const goToFile = (fileRoomId: string, fileId: string) => {
    router.push(`/${slug}/files/${fileRoomId}?fileId=${fileId}`);
    close();
  };
  const goToMember = (memberId: string) => {
    router.push(`/${slug}/settings/members?memberId=${memberId}`);
    close();
  };
  const goToModule = (mod: WorkspaceModule) => {
    router.push(getModuleHref(slug, mod));
    close();
  };

  const rows: ResultRow[] = useMemo(() => {
    const list: ResultRow[] = [];
    filteredGlobal.forEach((m) => list.push({ key: `global-${m.name}`, onSelect: () => { router.push(m.href); close(); } }));
    filteredLocal.forEach((m) => list.push({ key: `module-${m.id}`, onSelect: () => goToModule(m) }));
    (results?.tasks || []).forEach((t) => list.push({ key: `task-${t.id}`, onSelect: () => goToTask(t.boardId, t.id) }));
    (results?.chats || []).forEach((c) => list.push({ key: `chat-${c.id}`, onSelect: () => goToChat(c.roomId, c.id) }));
    (results?.files || []).forEach((f) => list.push({ key: `file-${f.id}`, onSelect: () => goToFile(f.fileRoomId, f.id) }));
    (results?.members || []).forEach((m) => list.push({ key: `member-${m.id}`, onSelect: () => goToMember(m.id) }));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGlobal, filteredLocal, results]);

  const rowClass = cn(
    "flex items-center gap-2.5 px-2.5 rounded-lg cursor-pointer hover:bg-base-200/70 transition-colors",
    isMobile ? "min-h-11 py-2" : "py-1.5",
  );

  const badgeClass = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0";
  const sectionLabelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2.5 pt-3 pb-1";

  const noModuleResults = filteredGlobal.length === 0 && filteredLocal.length === 0;
  const hasServerResults = !!results && (results.tasks.length || results.chats.length || results.files.length || results.members.length);
  const showEmpty = query.trim().length >= 2 && !isLoading && noModuleResults && !hasServerResults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 p-0 overflow-hidden bg-base-100",
          isMobile ? "max-w-full h-dvh rounded-none" : "max-w-md rounded-2xl",
        )}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <DialogDescription className="sr-only">Search modules, tasks, chats, files, and members</DialogDescription>
        <div className="flex items-center px-4 border-b border-base-200 shrink-0">
          <HugeiconsIcon icon={Search01Icon} className="mr-2 size-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                rows[activeIndex]?.onSelect();
              }
            }}
            placeholder="Search modules, tasks, chats, files, members..."
            className="flex-1 focus-within:ring-0 focus-within:border-transparent border-0 px-0 shadow-none bg-transparent text-sm"
            autoFocus
          />
        </div>
        <div className={cn("overflow-y-auto p-2 flex flex-col", isMobile ? "flex-1" : "max-h-[400px]")}>
          {showEmpty && (
            <p className="text-sm text-muted-foreground text-center py-6">No results for &quot;{query}&quot;</p>
          )}
          {noModuleResults && query.trim().length < 2 && !hasServerResults && (
            <p className="text-sm text-muted-foreground text-center py-6">No modules found.</p>
          )}

          {filteredGlobal.map((module) => (
            <div key={module.name} onClick={() => { router.push(module.href); close(); }} className={rowClass}>
              <SidebarGlobalModule
                icon={module.icon}
                name={module.name}
                href={module.href}
                shortcut={module.shortcut}
                active={pathname === module.href}
                extended={true}
              />
            </div>
          ))}

          {filteredLocal.map((mod) => (
            <div key={mod.id} onClick={() => goToModule(mod)}>
              <SidebarModule
                id={mod.id}
                activeWorkspaceId={workspaceId}
                icon={getModuleIcon(mod.type)}
                name={mod.name}
                href={getModuleHref(slug, mod)}
                active={isModuleActive(pathname, slug, mod)}
                extended={true}
                unreadCount={isModuleActive(pathname, slug, mod) ? undefined : mod.unreadCount}
                isPinned={mod.isPinned}
              />
            </div>
          ))}

          {isLoading && query.trim().length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-3">Searching...</p>
          )}

          {!!results?.tasks.length && (
            <>
              <div className={sectionLabelClass}>Tasks</div>
              {results.tasks.map((t) => (
                <div key={t.id} onClick={() => goToTask(t.boardId, t.id)} className={rowClass}>
                  <HugeiconsIcon icon={CheckmarkSquare02Icon} className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.boardName} › {t.columnName}</p>
                  </div>
                  <span className={badgeClass}>{t.shortId}</span>
                </div>
              ))}
            </>
          )}

          {!!results?.chats.length && (
            <>
              <div className={sectionLabelClass}>Chats</div>
              {results.chats.map((c) => (
                <div key={c.id} onClick={() => goToChat(c.roomId, c.id)} className={rowClass}>
                  <HugeiconsIcon icon={Chat01Icon} className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.content}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.roomName || "Direct message"}</p>
                  </div>
                  <span className={badgeClass}>Chat</span>
                </div>
              ))}
            </>
          )}

          {!!results?.files.length && (
            <>
              <div className={sectionLabelClass}>Files</div>
              {results.files.map((f) => (
                <div key={f.id} onClick={() => goToFile(f.fileRoomId, f.id)} className={rowClass}>
                  <HugeiconsIcon icon={File01Icon} className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.fileName}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.fileRoomName || "Files"}</p>
                  </div>
                  <span className={badgeClass}>File</span>
                </div>
              ))}
            </>
          )}

          {!!results?.members.length && (
            <>
              <div className={sectionLabelClass}>Members</div>
              {results.members.map((m) => (
                <div key={m.id} onClick={() => goToMember(m.id)} className={rowClass}>
                  <UserAvatar user={{ firstname: m.firstname, lastname: m.lastname, avatar_key: m.avatarKey }} size={6} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.firstname} {m.lastname}</p>
                    <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                  </div>
                  <span className={badgeClass}>{m.role}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update the `l-sidebar.tsx` call site for the renamed prop (`activeWorkspaceId` → `workspaceId`)**

```tsx
      <OmniSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        slug={slug}
        workspaceId={activeWorkspaceId || ""}
        localModules={localModules}
        pathname={pathname}
      />
```

- [ ] **Step 3: Manually verify**

```bash
cd apps/frontend/dash && pnpm dev
```

Open the modal, type a task title/task code that exists in your dev data — a "Tasks" section appears within ~300ms with matching rows; same for a chat message's text, a filename, and a member's name. Arrow keys move a visual sense of "current" selection is not required by this styling (no active-row highlight was requested), but `Enter` on a fresh page load with only module rows still navigates to the first module. Clicking any task/chat/file/member row navigates to the right URL with the right query param (confirm in the address bar) — the actual open/scroll/highlight behavior lands in Tasks 8-11.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/search/OmniSearchModal.tsx apps/frontend/dash/components/l-sidebar.tsx
git commit -m "feat(search): add tasks/chats/files/members result sections and keyboard nav"
```

---

## Task 8: Mobile trigger button + always-open hotkey

**Files:**
- Modify: `apps/frontend/dash/components/l-sidebar.tsx`

**Interfaces:**
- Consumes: `setSearchModalOpen` (existing local state), `isMobile`/`open`/`setOpen` (existing local state/hooks).

- [ ] **Step 1: Make `Ctrl/Cmd+K` always open the omni-search modal**

Today's hotkey handler (lines ~172-184) only opens the modal when the sidebar rail is collapsed; when expanded it just refocuses the unrelated inline filter input. Since the modal now searches far more than modules, it should always open on the shortcut regardless of sidebar state. Replace:

```tsx
  useHotkey(["ctrl", "k"], (e) => {
    e.preventDefault();
    if (!open) {
      setSearchModalOpen(true);
    } else {
      setTimeout(
        () => {
          searchRef.current?.focus();
        },
        0,
      );
    }
  });
```

with:

```tsx
  useHotkey(["ctrl", "k"], (e) => {
    e.preventDefault();
    setSearchModalOpen(true);
  });
```

(`searchRef` and its `<Input>` in the expanded sidebar keep working exactly as before for mouse/manual focus — only the hotkey's behavior changes.)

- [ ] **Step 2: Add a mobile-only floating search trigger next to the hamburger button**

Today there is no tap-reachable way to open the modal on mobile (the collapsed-rail search icon only renders in the desktop collapsed state). Add a second fixed button right after the existing hamburger `<m.div>` block (~line 474, right before the `<OmniSearchModal ... />` render):

```tsx
      {isMobile && !open && (
        <m.div
          initial={false}
          animate={{ opacity: rOpen ? 0 : 1, pointerEvents: rOpen ? "none" : "auto" }}
          transition={spring}
          className="fixed top-4 left-14 flex items-center justify-center size-8 rounded-full hover:bg-base-300/75 transition-colors cursor-pointer z-50"
          onClick={() => setSearchModalOpen(true)}
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-5" />
        </m.div>
      )}
```

- [ ] **Step 3: Close the mobile drawer when a search result is selected**

`OmniSearchModal` already accepts an optional `onNavigate` prop (Task 7). Pass it from `l-sidebar.tsx` so tapping a result on mobile also collapses the drawer, not just the modal:

```tsx
      <OmniSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        slug={slug}
        workspaceId={activeWorkspaceId || ""}
        localModules={localModules}
        pathname={pathname}
        onNavigate={() => { if (isMobile) setOpen(false); }}
      />
```

- [ ] **Step 4: Manually verify on a mobile viewport**

In Chrome DevTools, toggle device toolbar to a ~390px-wide phone preset, reload `pnpm dev`'s page. Confirm: (a) a search icon appears near the hamburger icon when the drawer is closed, tapping it opens the modal full-screen; (b) the modal fills the viewport (`h-dvh`), the on-screen-keyboard-safe layout doesn't clip the input; (c) tapping any result closes both the modal and (if it was open) the drawer, landing on the destination URL.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/dash/components/l-sidebar.tsx
git commit -m "feat(search): mobile search trigger, always-open hotkey, close drawer on navigate"
```

---

## Task 9: Task deep-link — open task detail modal from `?taskId=`

**Files:**
- Modify: `apps/frontend/dash/app/[slug]/board/[boardId]/page.tsx`

**Interfaces:**
- Consumes: `useSearchParams()` (Next.js), `board.columns[].tasks[]` (existing `useBoard` return shape).

- [ ] **Step 1: Read `taskId`, find the task, dispatch, then clear the param**

In `apps/frontend/dash/app/[slug]/board/[boardId]/page.tsx`, add the imports and a new `useEffect` right after the existing `useEffect` that sets `document.title` (~line after the board-name effect):

```tsx
import { useRouter, useSearchParams } from "next/navigation";
```

(add alongside the existing `useParams` import from `next/navigation`)

```tsx
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!taskId || !board?.columns) return;

    const task = board.columns.flatMap((c) => c.tasks || []).find((t) => t.id === taskId);
    if (!task) return;

    dispatch({ type: "SET_EDITING_TASK", payload: task });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("taskId");
    const qs = params.toString();
    router.replace(qs ? `/${boardId}?${qs}` : `/${boardId}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, searchParams]);
```

Note: this page is `app/[slug]/board/[boardId]/page.tsx` so its pathname already includes `[slug]` — use `usePathname()` instead of hand-building `/${boardId}` to avoid dropping the slug segment. Replace the `router.replace(...)` line above with:

```tsx
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
```

and add `const pathname = usePathname();` (import `usePathname` alongside `useSearchParams`/`useRouter`).

- [ ] **Step 2: Manually verify**

```bash
cd apps/frontend/dash && pnpm dev
```

Navigate directly to `/{slug}/board/{boardId}?taskId={a real task's id}` — the `TaskDetailModal` opens automatically for that task, and the `taskId` param disappears from the URL bar (without a page reload). Navigating to the same URL with a `taskId` that doesn't exist on this board does nothing (no crash, no modal).

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/dash/app/[slug]/board/[boardId]/page.tsx"
git commit -m "feat(search): open task detail modal from ?taskId= deep link"
```

---

## Task 10: Chat message deep-link — scroll/highlight or fetch-then-scroll from `?messageId=`

**Files:**
- Modify: `apps/frontend/dash/components/chat/ChatRoom.tsx`

**Interfaces:**
- Consumes: `useHighlightTarget`'s `highlightTarget` (Task 5), `getChatMessages(workspaceId, roomId, cursor?, limit?, direction?)` (existing, `services/chat.service.tsx`), `useChatStore().prependMessages` (existing).

- [ ] **Step 1: Read `messageId`, try immediate highlight, else fetch the anchor page**

In `apps/frontend/dash/components/chat/ChatRoom.tsx`, add the imports:

```tsx
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { highlightTarget } from "@/hooks/use-highlight-target";
import { getChatMessages } from "@/services/chat.service";
```

Add, right after the existing `useEffect` that seeds `initialMessages` into the store:

```tsx
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prependMessages } = useChatStore();

  useEffect(() => {
    const messageId = searchParams.get("messageId");
    if (!messageId) return;

    const clearParam = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("messageId");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const existing = document.getElementById(`message-${messageId}`);
    if (existing) {
      highlightTarget(`message-${messageId}`, ".message-highlight-target");
      clearParam();
      return;
    }

    const target = messages.find((m) => m.id === messageId);
    const anchorCursor = target?.created_at;
    if (!anchorCursor) {
      // Message isn't in the currently loaded window and we have no timestamp
      // to anchor a fetch on (the search result itself carries created_at,
      // but a full page reload loses that) — nothing more we can do here.
      clearParam();
      return;
    }

    (async () => {
      const result = await getChatMessages(workspaceId, roomId, anchorCursor, 50, "before");
      if (result.success && result.data) {
        prependMessages(roomId, result.data.messages);
        setTimeout(() => highlightTarget(`message-${messageId}`, ".message-highlight-target"), 100);
      }
      clearParam();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, messages]);
```

Note: `target?.created_at` above only resolves if the message is already in the in-memory `messages` array — which it won't be for a genuinely old, unloaded message on a fresh page load (that's the case this fallback is for). Since the search result's `createdAt` isn't threaded through the URL today (only `messageId` is), the practical fallback for a message outside the initial load window is: fetch the most recent page via `getChatMessages(workspaceId, roomId, undefined, 50, "before")` (no cursor — same as the initial load) and check again, rather than a targeted anchor fetch. Replace the `if (!anchorCursor)` branch above with this simpler, always-available fallback instead:

```tsx
    (async () => {
      const result = await getChatMessages(workspaceId, roomId, undefined, 50, "before");
      if (result.success && result.data) {
        prependMessages(roomId, result.data.messages);
        setTimeout(() => highlightTarget(`message-${messageId}`, ".message-highlight-target"), 100);
      }
      clearParam();
    })();
```

(This removes the need for the `target`/`anchorCursor` lookup entirely — delete those two lines too.)

- [ ] **Step 2: Manually verify**

```bash
cd apps/frontend/dash && pnpm dev
```

Post several chat messages so the room has more than the initial page size, then navigate to `/{slug}/chat/{roomId}?messageId={an old message's id}` directly — the room loads, briefly shows the fetch happening, then scrolls to and flashes the target message, and the `messageId` param clears from the URL. Navigating with `?messageId={a message already visible}` scrolls/flashes immediately without a network request.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/dash/components/chat/ChatRoom.tsx
git commit -m "feat(search): scroll-to and highlight chat message from ?messageId= deep link"
```

---

## Task 11: File deep-link — highlight from `?fileId=`

**Files:**
- Modify: `apps/frontend/dash/components/files/FilesRoom.tsx`

**Interfaces:**
- Consumes: `useHighlightTarget`'s `highlightTarget` (Task 5).

- [ ] **Step 1: Add `id={"file-" + file.id}` to both file-row renderers**

In `apps/frontend/dash/components/files/FilesRoom.tsx`, `FileCard`'s root `<div>` (currently `className="group relative flex flex-col rounded-xl bg-card border-[1.5px] border-base-200 hover:border-base-300 transition-colors overflow-hidden"`) gets an `id` prop:

```tsx
    <div id={`file-${file.id}`} className="group relative flex flex-col rounded-xl bg-card border-[1.5px] border-base-200 hover:border-base-300 transition-colors overflow-hidden">
```

`FileRow`'s root `<div>` (currently `className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-200/40 transition-colors"`) gets the same:

```tsx
    <div id={`file-${file.id}`} className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-200/40 transition-colors">
```

- [ ] **Step 2: Read `fileId` on mount and highlight**

Add the imports:

```tsx
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { highlightTarget } from "@/hooks/use-highlight-target";
```

Add, inside the `FilesRoom` component, after the existing `useFilesSocket(roomId)` line:

```tsx
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fileId = searchParams.get("fileId");
    if (!fileId || files.length === 0) return;

    highlightTarget(`file-${fileId}`);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("fileId");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, files.length]);
```

(add `useEffect` to the existing `import { useState, useRef, useMemo, useCallback, DragEvent, ChangeEvent } from "react";` line at the top of the file.)

- [ ] **Step 3: Manually verify**

```bash
cd apps/frontend/dash && pnpm dev
```

Navigate to `/{slug}/files/{fileRoomId}?fileId={an existing file's id}` — the file list loads, scrolls to, and briefly flashes that file's card/row (test in both grid and list view via the view toggle), and `fileId` clears from the URL.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/files/FilesRoom.tsx
git commit -m "feat(search): highlight file from ?fileId= deep link"
```

---

## Task 12: Member deep-link — highlight from `?memberId=`

**Files:**
- Modify: `apps/frontend/dash/components/settings/workspace-members-admin.tsx`

**Interfaces:**
- Consumes: `useHighlightTarget`'s `highlightTarget` (Task 5).

- [ ] **Step 1: Add `id={"member-" + member.id}` to the member row**

In `apps/frontend/dash/components/settings/workspace-members-admin.tsx`, the row's root `<div>` (currently `className="flex items-center gap-3 py-3 border-b border-border last:border-0"`) gets an `id`:

```tsx
              <div key={member.id} id={`member-${member.id}`} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
```

- [ ] **Step 2: Read `memberId` on mount and highlight**

Add the imports (`useEffect` if not already present, plus the navigation hooks and the highlight utility):

```tsx
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { highlightTarget } from "@/hooks/use-highlight-target";
```

Add, inside the component, after the `members` data is available (wherever the existing `useWorkspaceMembers`-style query result is destructured — call it `members` per the existing `.map` in this file):

```tsx
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const memberId = searchParams.get("memberId");
    if (!memberId || !members?.length) return;

    highlightTarget(`member-${memberId}`);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("memberId");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, members]);
```

- [ ] **Step 3: Manually verify**

```bash
cd apps/frontend/dash && pnpm dev
```

Navigate to `/{slug}/settings/members?memberId={an existing member's id}` — the members list loads, scrolls to, and briefly flashes that member's row, and `memberId` clears from the URL.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/settings/workspace-members-admin.tsx
git commit -m "feat(search): highlight member from ?memberId= deep link"
```

---

## Task 13: End-to-end manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run both dev servers**

```bash
cd apps/backend && pnpm dev
```
```bash
cd apps/frontend/dash && pnpm dev
```

- [ ] **Step 2: Full desktop pass**

1. Press `Cmd/Ctrl+K` from any page (sidebar expanded or collapsed) — modal opens both times now.
2. Type a query matching a task title — a "Tasks" section appears with the right board/column subtitle and short-id badge; click it — the board opens with that task's detail modal already open.
3. Type a query matching chat content — a "Chats" section appears; click a result — the chat room opens, scrolled to and briefly highlighting that message.
4. Type a query matching a filename — a "Files" section appears; click a result — the files page opens, scrolled to and highlighting that file (try both grid and list view beforehand).
5. Type a query matching a member's name/username — a "Members" section appears; click a result — the members settings page opens, highlighting that row.
6. Type a query matching a module name — the existing Modules behavior is unchanged.
7. Type garbage (no matches anywhere) — "No results" message shows once 2+ characters are typed.
8. Use Arrow Up/Down + Enter to navigate and select a result without touching the mouse.

- [ ] **Step 3: Full mobile pass** (Chrome DevTools device toolbar, ~390px width)

1. With the sidebar drawer closed, tap the new floating search icon next to the hamburger — modal opens full-screen.
2. Search and tap a result — modal closes, destination page loads correctly.
3. Open the sidebar drawer, then open the search modal from within it (if reachable) — tapping a result closes both the modal and the drawer.

- [ ] **Step 4: Report back to the user**

Since this plan intentionally skips automated UI/E2E tests, hand the user this exact checklist (Steps 2-3 above) as their manual test script once implementation is done.
