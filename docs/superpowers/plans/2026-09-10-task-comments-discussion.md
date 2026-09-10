# Task Comments & Discussion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time, `@mention`-capable comment thread to tasks, surfaced inside `TaskDetailModal.tsx` and reflected as a live count badge on kanban cards.

**Architecture:** New `TaskComment` Prisma model (cascade-deleted with `Task`), CRUD lives in the existing `WorkspaceService`/`WorkspaceController` (same convention as `TaskAttachment` — no new NestJS module). Comments are fetched lazily and paginated per-task (own query key), never embedded in the board query — only a cheap `_count.comments` aggregate rides along with the board fetch for the kanban card badge. Real-time sync is synchronous persist-then-emit through the existing `StatusGateway`, mirroring `task:attachment:added/removed`. `@mentions` reuse the chat app's `@[Name](user:uuid)` token convention; the reusable parts of that logic are extracted from `ChatInput.tsx` into a shared hook so `TaskComments.tsx` doesn't duplicate ~70 lines of regex/dropdown logic.

**Tech Stack:** NestJS + Prisma (Postgres) backend, Next.js + TanStack Query + Socket.IO frontend, Tailwind + `@hugeicons/react` for UI, `date-fns` (already a dependency) for timestamps.

**Spec:** `docs/superpowers/specs/2026-09-10-task-comments-discussion-design.md`

## Global Constraints

- All new Prisma model IDs/foreign keys use `@db.Uuid` (never a bare `String @default(uuid())`) — matches every existing model in `schema.prisma`.
- Comment `content` is capped at 4000 chars (`@MaxLength(4000)`), matching `ChatMessage`/`SendMessageDto`.
- Delete/edit permission is **author-only** — this corrects the spec's "author OR ADMIN/OWNER" wording. Research during planning found `ChatMessage.editMessage`/`deleteMessage` (the precedent the spec cited) are author-only in the actual codebase (`chat.service.ts:276,313`); there is no moderation-delete convention anywhere else in this repo. Author-only keeps this consistent with the pattern it claims to follow. Use `ForbiddenException` (proper 403) instead of chat's bare `Error` (which chat's own code throws and is arguably a latent bug — not fixed here, out of scope, just not replicated).
- No new test framework is introduced. Backend gets Jest unit tests (existing convention, e.g. `chat.service.spec.ts`). The frontend has zero test infra today (`apps/frontend/dash` has no Jest/Vitest config, no `*.test.ts` files anywhere) — that's explicitly Milestone 4 scope (`ROADMAP.md` §Milestone 4 "Comprehensive Test Coverage"), not this task. Frontend tasks are verified manually via dev server + browser instead.
- No `@tiptap/extension-mention` or any new npm dependency is added — composer reuses the existing textarea+regex mention pattern.

---

### Task 1: Prisma schema — `TaskComment` model

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:262` (add `comments TaskComment[]` to `Task`)
- Modify: `apps/backend/prisma/schema.prisma:284` (insert new model after `TaskAttachment`, before `WorkspaceModule`)

**Interfaces:**
- Produces: `TaskComment` Prisma model — `id, task_id, author_id, content, is_edited, is_deleted, created_at, updated_at`, relations `task`, `author`, `mentions: User[]`.

- [ ] **Step 1: Add the `comments` back-relation to `Task`**

In `apps/backend/prisma/schema.prisma`, change:
```prisma
  column      BoardColumn      @relation(fields: [column_id], references: [id], onDelete: Cascade)
  assignee    User?            @relation("TaskAssignee", fields: [assignee_id], references: [id], onDelete: SetNull)
  creator     User             @relation("TaskCreator", fields: [created_by], references: [id], onDelete: Cascade)
  attachments TaskAttachment[]
```
to:
```prisma
  column      BoardColumn      @relation(fields: [column_id], references: [id], onDelete: Cascade)
  assignee    User?            @relation("TaskAssignee", fields: [assignee_id], references: [id], onDelete: SetNull)
  creator     User             @relation("TaskCreator", fields: [created_by], references: [id], onDelete: Cascade)
  attachments TaskAttachment[]
  comments    TaskComment[]
```

- [ ] **Step 2: Add the `TaskComment` model**

Immediately after the closing `}` of `model TaskAttachment { ... }`, insert:
```prisma
model TaskComment {
  id         String   @id @default(uuid()) @db.Uuid
  task_id    String   @db.Uuid
  author_id  String   @db.Uuid
  content    String   @db.Text
  is_edited  Boolean  @default(false)
  is_deleted Boolean  @default(false)
  created_at DateTime @default(now()) @db.Timestamptz
  updated_at DateTime @updatedAt @db.Timestamptz

  task     Task   @relation(fields: [task_id], references: [id], onDelete: Cascade)
  author   User   @relation("TaskCommentAuthor", fields: [author_id], references: [id], onDelete: Cascade)
  mentions User[] @relation("TaskCommentMentions")

  @@index([task_id, created_at], map: "idx_task_comment_task_id_created")
  @@map("task_comments")
}
```

- [ ] **Step 3: Generate and run the migration**

Run: `pnpm --filter @crwsync/backend prisma:migrate:dev --name add_task_comments`
Expected: migration file created under `apps/backend/prisma/migrations/`, Prisma Client regenerated, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "$(cat <<'EOF'
feat(backend): add TaskComment prisma model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 2: Backend DTOs

**Files:**
- Create: `apps/backend/src/workspace/dto/task-comment.dto.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CreateTaskCommentDto { content: string; mentionedUserIds?: string[] }`, `UpdateTaskCommentDto { content: string }` — consumed by Task 3 (service) and Task 4 (controller).

- [ ] **Step 1: Write the DTOs**

```typescript
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsArray, IsUUID } from "class-validator";

export class CreateTaskCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  mentionedUserIds?: string[];
}

export class UpdateTaskCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @crwsync/backend exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/workspace/dto/task-comment.dto.ts
git commit -m "$(cat <<'EOF'
feat(backend): add task comment DTOs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 3: Backend service methods + unit tests

**Files:**
- Modify: `apps/backend/src/workspace/workspace.service.ts` (add methods at end of class, before final `}`)
- Create: `apps/backend/src/workspace/task-comment.service.spec.ts`

**Interfaces:**
- Consumes: `CreateTaskCommentDto`, `UpdateTaskCommentDto` (Task 2); `PrismaService`, `StatusGateway` (existing constructor deps).
- Produces:
  - `createTaskComment(workspaceId: string, taskId: string, authorId: string, dto: CreateTaskCommentDto): Promise<{ success: true; data: TaskCommentWithRelations }>`
  - `listTaskComments(workspaceId: string, taskId: string, cursor?: string, limit?: number): Promise<{ success: true; data: { comments: TaskCommentWithRelations[]; next_cursor: string | null; has_more: boolean } }>`
  - `updateTaskComment(workspaceId: string, taskId: string, commentId: string, authorId: string, dto: UpdateTaskCommentDto): Promise<{ success: true; data: TaskCommentWithRelations }>`
  - `deleteTaskComment(workspaceId: string, taskId: string, commentId: string, authorId: string): Promise<{ success: true }>`
  - Emits `task:comment:created` / `task:comment:updated` / `task:comment:deleted` to `workspace_${workspaceId}` via `this.statusGateway.server`.
  - Emits `task_comment_mention_notification` to `user_${mentionedId}` for each id in `dto.mentionedUserIds` (excluding the author) on create.
  - Consumed by Task 4 (controller).

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/workspace/task-comment.service.spec.ts`:
```typescript
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { CreateTaskCommentDto, UpdateTaskCommentDto } from "./dto/task-comment.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import { StatusGateway } from "src/status/status.gateway";
import { StorageService } from "src/storage/storage.service";

describe("WorkspaceService task comments", () => {
  let service: WorkspaceService;
  let prisma: {
    task: { findFirst: jest.Mock };
    taskComment: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let statusGateway: { server: { to: jest.Mock } };
  let emit: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    statusGateway = { server: { to: jest.fn().mockReturnValue({ emit }) } };
    prisma = {
      task: { findFirst: jest.fn() },
      taskComment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new WorkspaceService(
      prisma as unknown as PrismaService,
      {} as unknown as CacheService,
      statusGateway as unknown as StatusGateway,
      {} as unknown as StorageService,
    );
  });

  describe("createTaskComment", () => {
    const dto: CreateTaskCommentDto = { content: "hello @Bob", mentionedUserIds: ["user-2"] };

    it("throws NotFoundException when the task does not resolve in this workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createTaskComment("ws-1", "task-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates the comment, emits task:comment:created, and notifies mentioned users", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        shortId: "CRW-1",
        title: "Ship it",
        column: {
          board_id: "board-1",
          board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } },
        },
      });
      const comment = { id: "comment-1", task_id: "task-1", author_id: "user-1", content: dto.content };
      prisma.taskComment.create.mockResolvedValue(comment);
      prisma.taskComment.count.mockResolvedValue(1);

      const result = await service.createTaskComment("ws-1", "task-1", "user-1", dto);

      expect(result).toEqual({ success: true, data: comment });
      expect(statusGateway.server.to).toHaveBeenCalledWith("workspace_ws-1");
      expect(emit).toHaveBeenCalledWith(
        "task:comment:created",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", comment, commentCount: 1 }),
      );
      expect(statusGateway.server.to).toHaveBeenCalledWith("user_user-2");
      expect(emit).toHaveBeenCalledWith("task_comment_mention_notification", expect.any(Object));
    });

    it("does not notify the author if they mention themselves", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        shortId: "CRW-1",
        title: "Ship it",
        column: { board_id: "board-1", board: { name: "Main board", workspace: { slug: "acme", name: "Acme" } } },
      });
      prisma.taskComment.create.mockResolvedValue({ id: "comment-1" });
      prisma.taskComment.count.mockResolvedValue(1);

      await service.createTaskComment("ws-1", "task-1", "user-1", { content: "note to self", mentionedUserIds: ["user-1"] });

      expect(statusGateway.server.to).not.toHaveBeenCalledWith("user_user-1");
    });
  });

  describe("updateTaskComment", () => {
    const dto: UpdateTaskCommentDto = { content: "edited" };

    it("throws NotFoundException when the comment does not resolve", async () => {
      prisma.taskComment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when the requester is not the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-2",
        task: { column: { board_id: "board-1" } },
      });

      await expect(
        service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("updates the comment and emits task:comment:updated when the requester is the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-1",
        task: { column: { board_id: "board-1" } },
      });
      const updated = { id: "comment-1", content: "edited", is_edited: true };
      prisma.taskComment.update.mockResolvedValue(updated);

      const result = await service.updateTaskComment("ws-1", "task-1", "comment-1", "user-1", dto);

      expect(result).toEqual({ success: true, data: updated });
      expect(emit).toHaveBeenCalledWith(
        "task:comment:updated",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", comment: updated }),
      );
    });
  });

  describe("deleteTaskComment", () => {
    it("throws ForbiddenException when the requester is not the author", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-2",
        task: { column: { board_id: "board-1" } },
      });

      await expect(
        service.deleteTaskComment("ws-1", "task-1", "comment-1", "user-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("soft-deletes the comment and emits task:comment:deleted with the fresh count", async () => {
      prisma.taskComment.findFirst.mockResolvedValue({
        id: "comment-1",
        author_id: "user-1",
        task: { column: { board_id: "board-1" } },
      });
      prisma.taskComment.count.mockResolvedValue(0);

      const result = await service.deleteTaskComment("ws-1", "task-1", "comment-1", "user-1");

      expect(result).toEqual({ success: true });
      expect(prisma.taskComment.update).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        data: { is_deleted: true, content: "This comment was deleted." },
      });
      expect(emit).toHaveBeenCalledWith(
        "task:comment:deleted",
        expect.objectContaining({ boardId: "board-1", taskId: "task-1", commentId: "comment-1", commentCount: 0 }),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @crwsync/backend test -- task-comment.service.spec.ts`
Expected: FAIL — `service.createTaskComment is not a function` (methods don't exist yet).

- [ ] **Step 3: Implement the service methods**

In `apps/backend/src/workspace/workspace.service.ts`, add this import alongside the existing DTO import:
```typescript
import { CreateTaskAttachmentDto } from "src/workspace/dto/task-attachment.dto";
import { CreateTaskCommentDto, UpdateTaskCommentDto } from "src/workspace/dto/task-comment.dto";
```
and change the `@nestjs/common` import to include `ForbiddenException`:
```typescript
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
```
Add this constant near the top of the file (after the `@Injectable()` class opens is fine, or alongside any existing module-level constants):
```typescript
const COMMENT_AUTHOR_SELECT = { id: true, firstname: true, lastname: true, avatar_key: true };
```
Add these four methods at the end of the `WorkspaceService` class, just before its closing `}`:
```typescript
  async createTaskComment(
    workspaceId: string,
    taskId: string,
    authorId: string,
    dto: CreateTaskCommentDto,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      include: {
        column: {
          select: {
            board_id: true,
            board: { select: { name: true, workspace: { select: { slug: true, name: true } } } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException("Task not found");

    const comment = await this.prisma.taskComment.create({
      data: {
        task_id: taskId,
        author_id: authorId,
        content: dto.content,
        ...(dto.mentionedUserIds?.length
          ? { mentions: { connect: dto.mentionedUserIds.map((id) => ({ id })) } }
          : {}),
      },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        mentions: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    const commentCount = await this.prisma.taskComment.count({
      where: { task_id: taskId, is_deleted: false },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:comment:created", {
        boardId: task.column.board_id,
        taskId,
        comment,
        commentCount,
      });

    if (dto.mentionedUserIds?.length) {
      const mentionPayload = {
        comment,
        task: { id: task.id, shortId: task.shortId, title: task.title },
        board: { id: task.column.board_id, name: task.column.board.name },
        workspace: { slug: task.column.board.workspace.slug, name: task.column.board.workspace.name },
      };
      for (const mentionedId of dto.mentionedUserIds) {
        if (mentionedId !== authorId) {
          this.statusGateway.server
            .to(`user_${mentionedId}`)
            .emit("task_comment_mention_notification", mentionPayload);
        }
      }
    }

    return { success: true, data: comment };
  }

  async listTaskComments(
    workspaceId: string,
    taskId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException("Task not found");

    const take = Math.min(Number(limit) || 50, 100);

    const comments = await this.prisma.taskComment.findMany({
      where: {
        task_id: taskId,
        ...(cursor ? { created_at: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { created_at: "desc" },
      take: take + 1,
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        mentions: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    const hasMore = comments.length > take;
    if (hasMore) comments.pop();
    const ordered = comments.reverse();

    return {
      success: true,
      data: {
        comments: ordered,
        next_cursor: hasMore && ordered.length > 0 ? ordered[0].created_at.toISOString() : null,
        has_more: hasMore,
      },
    };
  }

  async updateTaskComment(
    workspaceId: string,
    taskId: string,
    commentId: string,
    authorId: string,
    dto: UpdateTaskCommentDto,
  ) {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, task_id: taskId, task: { column: { board: { workspace_id: workspaceId } } } },
      include: { task: { include: { column: { select: { board_id: true } } } } },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.author_id !== authorId) throw new ForbiddenException("Not authorized to edit this comment");

    const updated = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content: dto.content, is_edited: true },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        mentions: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:comment:updated", { boardId: comment.task.column.board_id, taskId, comment: updated });

    return { success: true, data: updated };
  }

  async deleteTaskComment(workspaceId: string, taskId: string, commentId: string, authorId: string) {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, task_id: taskId, task: { column: { board: { workspace_id: workspaceId } } } },
      include: { task: { include: { column: { select: { board_id: true } } } } },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.author_id !== authorId) throw new ForbiddenException("Not authorized to delete this comment");

    await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { is_deleted: true, content: "This comment was deleted." },
    });

    const commentCount = await this.prisma.taskComment.count({
      where: { task_id: taskId, is_deleted: false },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("task:comment:deleted", { boardId: comment.task.column.board_id, taskId, commentId, commentCount });

    return { success: true };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @crwsync/backend test -- task-comment.service.spec.ts`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/workspace/workspace.service.ts apps/backend/src/workspace/task-comment.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(backend): add task comment CRUD with real-time sync

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 4: Backend controller endpoints

**Files:**
- Modify: `apps/backend/src/workspace/workspace.controller.ts:6-7` (import), `:256` (insert new routes after `deleteTaskAttachment`)

**Interfaces:**
- Consumes: `WorkspaceService.{createTaskComment,listTaskComments,updateTaskComment,deleteTaskComment}` (Task 3), `CreateTaskCommentDto`/`UpdateTaskCommentDto` (Task 2).
- Produces: `POST/GET /workspaces/:workspaceId/tasks/:taskId/comments`, `PATCH/DELETE /workspaces/:workspaceId/tasks/:taskId/comments/:commentId` — consumed by Task 7 (frontend service layer).

- [ ] **Step 1: Add the DTO import**

In `apps/backend/src/workspace/workspace.controller.ts`, change:
```typescript
import { CreateTaskAttachmentDto } from "src/workspace/dto/task-attachment.dto";
```
to:
```typescript
import { CreateTaskAttachmentDto } from "src/workspace/dto/task-attachment.dto";
import { CreateTaskCommentDto, UpdateTaskCommentDto } from "src/workspace/dto/task-comment.dto";
```

- [ ] **Step 2: Add the four endpoints**

Immediately after `deleteTaskAttachment` (right before the `@Get(":workspaceId/files/:key")` handler), insert:
```typescript
  @Post(":workspaceId/tasks/:taskId/comments")
  @Throttle({ default: { ttl: 3600, limit: 120 } })
  @UseGuards(IsMemberGuard)
  createTaskComment(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: CreateTaskCommentDto,
  ) {
    return this.workspaceService.createTaskComment(workspaceId, taskId, user.userId, dto);
  }

  @Get(":workspaceId/tasks/:taskId/comments")
  @SkipThrottle()
  @UseGuards(IsMemberGuard)
  listTaskComments(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.workspaceService.listTaskComments(workspaceId, taskId, cursor, limit);
  }

  @Patch(":workspaceId/tasks/:taskId/comments/:commentId")
  @UseGuards(IsMemberGuard)
  updateTaskComment(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
    @Param("commentId", new ParseUUIDPipe({ version: "4" })) commentId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: UpdateTaskCommentDto,
  ) {
    return this.workspaceService.updateTaskComment(workspaceId, taskId, commentId, user.userId, dto);
  }

  @Delete(":workspaceId/tasks/:taskId/comments/:commentId")
  @UseGuards(IsMemberGuard)
  deleteTaskComment(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
    @Param("commentId", new ParseUUIDPipe({ version: "4" })) commentId: string,
    @ActiveUserParam() user: ActiveUser,
  ) {
    return this.workspaceService.deleteTaskComment(workspaceId, taskId, commentId, user.userId);
  }

```

- [ ] **Step 3: Typecheck and run the full backend test suite**

Run: `pnpm --filter @crwsync/backend exec tsc --noEmit && pnpm --filter @crwsync/backend test`
Expected: no type errors, all existing + new tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/workspace/workspace.controller.ts
git commit -m "$(cat <<'EOF'
feat(backend): wire task comment REST endpoints

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 5: Kanban card comment count — board query aggregate

**Files:**
- Modify: `apps/backend/src/board/board.service.ts:78-105` (`getBoard`)

**Interfaces:**
- Consumes: `TaskComment` model (Task 1).
- Produces: `task._count.comments: number` on every task returned by `GET /workspaces/:id/boards/:boardId` — consumed by Task 6 (`Task` type) and Task 14 (kanban badge).

- [ ] **Step 1: Add the `_count` aggregate to the task include**

In `apps/backend/src/board/board.service.ts`, in `getBoard`, change:
```typescript
            include: {
                attachments: { orderBy: { created_at: "asc" } },
              },
```
to:
```typescript
            include: {
                attachments: { orderBy: { created_at: "asc" } },
                _count: { select: { comments: true } },
              },
```

- [ ] **Step 2: Run the existing board service tests**

Run: `pnpm --filter @crwsync/backend test -- board.service.spec.ts`
Expected: PASS (this is a pure additive field, no existing assertion should break).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/board/board.service.ts
git commit -m "$(cat <<'EOF'
feat(backend): include comment count in board task query

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 6: Shared types (`@crwsync/types`)

**Files:**
- Modify: `packages/types/src/board.ts` (add `TaskComment` + payload types, extend `Task`)

**Interfaces:**
- Produces: `TaskComment`, `TaskCommentAuthor`, `CreateTaskCommentPayload`, `UpdateTaskCommentPayload`, `TaskCommentPage`, `TaskCommentMentionNotification`, and `Task._count?: { comments: number }` — consumed by every frontend task from here on.

- [ ] **Step 1: Add the types**

In `packages/types/src/board.ts`, change the `Task` interface:
```typescript
export interface Task {
  id: string;
  shortId: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: TaskPriorityEnum;
  labels: string[];
  tags: string[];
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  is_deleted: boolean;
  is_archived: boolean;
  in_progress_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  attachments?: TaskAttachment[];
  _count?: { comments: number };
}
```
Then, right after the `TaskAttachment`/`CreateTaskAttachmentPayload` interfaces, add:
```typescript
export interface TaskCommentAuthor {
  id: string;
  firstname: string;
  lastname: string;
  avatar_key: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: TaskCommentAuthor;
  mentions?: TaskCommentAuthor[];
}

export interface CreateTaskCommentPayload {
  content: string;
  mentionedUserIds?: string[];
}

export interface UpdateTaskCommentPayload {
  content: string;
}

export interface TaskCommentPage {
  comments: TaskComment[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface TaskCommentMentionNotification {
  notificationId: string;
  comment: TaskComment;
  task: { id: string; shortId: string; title: string };
  board: { id: string; name: string };
  workspace: { slug: string; name: string };
  receivedAt: string;
}
```

- [ ] **Step 2: Build the types package**

Run: `pnpm --filter @crwsync/types build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/board.ts
git commit -m "$(cat <<'EOF'
feat(types): add TaskComment shared types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 7: Frontend service functions

**Files:**
- Modify: `apps/frontend/dash/services/board.service.tsx` (add 4 functions, extend the `@crwsync/types` import)

**Interfaces:**
- Consumes: `TaskComment, CreateTaskCommentPayload, UpdateTaskCommentPayload, TaskCommentPage, BoardOperationState` (Task 6).
- Produces: `getTaskComments`, `createTaskComment`, `updateTaskComment`, `deleteTaskComment` — consumed by Task 8 (hooks).

- [ ] **Step 1: Extend the type import**

In `apps/frontend/dash/services/board.service.tsx`, add to the existing `@crwsync/types` import block:
```typescript
  CreateTaskAttachmentPayload,
  PresignedAvatarUpload,
  BoardOperationState,
  TaskComment,
  CreateTaskCommentPayload,
  UpdateTaskCommentPayload,
  TaskCommentPage,
```

- [ ] **Step 2: Add the four service functions**

At the end of the file (after `deleteTaskAttachment`, before `getWorkspaceModules`), insert:
```typescript
export async function getTaskComments(
  workspaceId: string,
  taskId: string,
): Promise<BoardOperationState<TaskCommentPage>> {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/tasks/${taskId}/comments`);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || "Failed to fetch comments" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function createTaskComment(
  workspaceId: string,
  taskId: string,
  data: CreateTaskCommentPayload,
): Promise<BoardOperationState<TaskComment>> {
  try {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || "Failed to post comment" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function updateTaskComment(
  workspaceId: string,
  taskId: string,
  commentId: string,
  data: UpdateTaskCommentPayload,
): Promise<BoardOperationState<TaskComment>> {
  try {
    const response = await api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`, data);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || "Failed to update comment" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function deleteTaskComment(
  workspaceId: string,
  taskId: string,
  commentId: string,
): Promise<BoardOperationState> {
  try {
    await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`);
    return { success: true };
  } catch (error) {
    if (isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || "Failed to delete comment" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter dash exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/services/board.service.tsx
git commit -m "$(cat <<'EOF'
feat(dash): add task comment API service functions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 8: Query keys + React Query hooks

**Files:**
- Modify: `apps/frontend/dash/hooks/query-keys.ts` (add `commentKeys`)
- Create: `apps/frontend/dash/hooks/use-task-comments.ts`

**Interfaces:**
- Consumes: `boardService.{getTaskComments,createTaskComment,updateTaskComment,deleteTaskComment}` (Task 7), `boardKeys` (`apps/frontend/dash/hooks/use-boards.ts`).
- Produces: `commentKeys`, `useTaskComments(workspaceId, taskId)`, `useCreateTaskComment(workspaceId, boardId, taskId)`, `useEditTaskComment(workspaceId, taskId)`, `useDeleteTaskComment(workspaceId, boardId, taskId)` — consumed by Task 10 (`TaskComments.tsx`).

- [ ] **Step 1: Add `commentKeys`**

In `apps/frontend/dash/hooks/query-keys.ts`, add:
```typescript
export const commentKeys = {
  all: ["taskComments"] as const,
  list: (taskId: string) => [...commentKeys.all, "list", taskId] as const,
};
```

- [ ] **Step 2: Write the hooks**

Create `apps/frontend/dash/hooks/use-task-comments.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Board, TaskCommentPage, CreateTaskCommentPayload, UpdateTaskCommentPayload } from "@crwsync/types";
import * as boardService from "@/services/board.service";
import { commentKeys, boardKeys } from "@/hooks/query-keys";

export function useTaskComments(workspaceId?: string, taskId?: string) {
  return useQuery({
    queryKey: commentKeys.list(taskId!),
    queryFn: () => boardService.getTaskComments(workspaceId!, taskId!),
    enabled: !!workspaceId && !!taskId,
    select: (result) => result.data,
  });
}

export function useCreateTaskComment(workspaceId: string, boardId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskCommentPayload) =>
      boardService.createTaskComment(workspaceId, taskId, data),
    onSuccess: ({ success, data: comment }) => {
      if (!success || !comment) return;

      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          if (old.data.comments.some((c) => c.id === comment.id)) return old;
          return { ...old, data: { ...old.data, comments: [...old.data.comments, comment] } };
        },
      );

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: (col.tasks ?? []).map((t) =>
                  t.id === taskId
                    ? { ...t, _count: { comments: (t._count?.comments ?? 0) + 1 } }
                    : t,
                ),
              })),
            },
          };
        },
      );
    },
  });
}

export function useEditTaskComment(workspaceId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateTaskCommentPayload }) =>
      boardService.updateTaskComment(workspaceId, taskId, commentId, data),
    onSuccess: ({ success, data: comment }) => {
      if (!success || !comment) return;
      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: { ...old.data, comments: old.data.comments.map((c) => (c.id === comment.id ? comment : c)) },
          };
        },
      );
    },
  });
}

export function useDeleteTaskComment(workspaceId: string, boardId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => boardService.deleteTaskComment(workspaceId, taskId, commentId),
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(taskId) });
      const previous = queryClient.getQueryData(commentKeys.list(taskId));

      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              comments: old.data.comments.map((c) =>
                c.id === commentId ? { ...c, is_deleted: true, content: "This comment was deleted." } : c,
              ),
            },
          };
        },
      );

      queryClient.setQueryData(
        boardKeys.detail(boardId),
        (old: { data: Board } | undefined) => {
          if (!old?.data?.columns) return old;
          return {
            ...old,
            data: {
              ...old.data,
              columns: old.data.columns.map((col) => ({
                ...col,
                tasks: (col.tasks ?? []).map((t) =>
                  t.id === taskId
                    ? { ...t, _count: { comments: Math.max(0, (t._count?.comments ?? 1) - 1) } }
                    : t,
                ),
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commentKeys.list(taskId), context.previous);
      }
    },
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter dash exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/hooks/query-keys.ts apps/frontend/dash/hooks/use-task-comments.ts
git commit -m "$(cat <<'EOF'
feat(dash): add task comment query keys and mutation hooks

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 9: Extract `useMentionAutocomplete` — refactor `ChatInput.tsx`

**Files:**
- Create: `apps/frontend/dash/hooks/use-mention-autocomplete.ts`
- Modify: `apps/frontend/dash/components/chat/ChatInput.tsx:149-165` (replace `activeMentions` useMemo), `:233-268` (`filteredOptions`), `:367-377` (submit-time expansion), `:498-522` (`@` detection in `handleInputChange`)

**Interfaces:**
- Consumes: `WorkspaceMember[]` (from `useWorkspaceMembers`, already used by `ChatInput.tsx`).
- Produces: `useMentionAutocomplete(members)` → `{ activeMentions: {display,replaceWith}[], filterMembers(searchText): WorkspaceUser[], detectAtTrigger(textBeforeCursor): {text,startIndex} | null, expandMentions(content): string, extractMentionedUserIds(content): string[] }` — consumed by Task 10 (`TaskComments.tsx`).

This hook extracts only the pieces of `ChatInput.tsx`'s mention logic that are generic (the `@user` detection math, the token expand/extract regexes, member filtering) — not the `#task` mention or `@everyone` handling, which stay chat-specific and untouched in `ChatInput.tsx`.

- [ ] **Step 1: Write the hook**

Create `apps/frontend/dash/hooks/use-mention-autocomplete.ts`:
```typescript
import { useMemo } from "react";
import type { WorkspaceMember, WorkspaceUser } from "@crwsync/types";

export interface MentionMatch {
  display: string;
  replaceWith: string;
}

export function useMentionAutocomplete(members: WorkspaceMember[] | undefined) {
  const activeMentions = useMemo<MentionMatch[]>(() => {
    const list: MentionMatch[] = [];
    if (members) {
      members.forEach((m) => {
        if (m.user) {
          list.push({
            display: `@${m.user.firstname} ${m.user.lastname}`,
            replaceWith: `@[${m.user.firstname} ${m.user.lastname}](user:${m.user.id})`,
          });
        }
      });
    }
    return list.sort((a, b) => b.display.length - a.display.length);
  }, [members]);

  const filterMembers = (searchText: string): WorkspaceUser[] => {
    const search = searchText.toLowerCase();
    return (members || [])
      .filter((m) => m.user)
      .filter((m) => {
        const u = m.user!;
        const f = u.firstname?.toLowerCase() || "";
        const l = u.lastname?.toLowerCase() || "";
        const un = u.username?.toLowerCase() || "";
        const fullName = `${f} ${l}`;
        return f.includes(search) || l.includes(search) || un.includes(search) || fullName.includes(search);
      })
      .map((m) => m.user!);
  };

  const detectAtTrigger = (textBeforeCursor: string): { text: string; startIndex: number } | null => {
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtSymbolIndex === -1) return null;
    const charBefore = textBeforeCursor[lastAtSymbolIndex - 1];
    if (lastAtSymbolIndex !== 0 && !/[\s\n]/.test(charBefore)) return null;
    const textAfterAt = textBeforeCursor.slice(lastAtSymbolIndex + 1);
    if (textAfterAt.startsWith(" ") || /\n/.test(textAfterAt) || textAfterAt.length >= 50) return null;
    return { text: textAfterAt, startIndex: lastAtSymbolIndex };
  };

  const expandMentions = (content: string): string => {
    if (!activeMentions.length) return content;
    const escaped = activeMentions.map((m) => m.display.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(^|\\n|\\s)(${escaped.join("|")})(?=$|\\s|\\n|[.,!?;:])`, "g");
    return content.replace(regex, (match, p1, p2) => {
      const mention = activeMentions.find((m) => m.display === p2);
      return p1 + (mention ? mention.replaceWith : p2);
    });
  };

  const extractMentionedUserIds = (content: string): string[] =>
    [...content.matchAll(/@\[.*?\]\(user:([a-zA-Z0-9-]+)\)/g)].map((m) => m[1]);

  return { activeMentions, filterMembers, detectAtTrigger, expandMentions, extractMentionedUserIds };
}
```

`WorkspaceUser` is exported from `packages/types/src/workspace.ts:14` — this is the same type as `WorkspaceMember["user"]`, already used throughout `ChatInput.tsx`.

- [ ] **Step 2: Refactor `ChatInput.tsx` to use the hook**

Replace the `activeMentions` useMemo (right after `const { data: members } = useWorkspaceMembers(workspaceId);`):
```typescript
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { activeMentions, filterMembers, detectAtTrigger, expandMentions, extractMentionedUserIds } =
    useMentionAutocomplete(members);
```
removing the old:
```typescript
  const activeMentions = useMemo(() => {
    const list: { display: string; replaceWith: string }[] = [];
    list.push({ display: "@everyone", replaceWith: "@everyone" });
    if (members) {
      members.forEach((m) => {
        if (m.user) {
          list.push({
            display: `@${m.user.firstname} ${m.user.lastname}`,
            replaceWith: `@[${m.user.firstname} ${m.user.lastname}](user:${m.user.id})`,
          });
        }
      });
    }
    return list.sort((a, b) => b.display.length - a.display.length);
  }, [members]);
```
Note the `@everyone` entry moves into `expandMentions`'s caller — since `expandMentions` operates on `activeMentions` from the hook (which no longer contains `@everyone`), add a small local expansion step for `@everyone` at submit time (Step 4 below handles this).

Replace the member-filtering portion of `filteredOptions` (keep the `@everyone` and exact-match logic local, since those are chat-specific):
```typescript
  const filteredOptions = useMemo(() => {
    if (!mentionState.active) return [];

    const search = mentionState.text.toLowerCase();
    const opts: MentionOption[] = filterMembers(mentionState.text).map((user) => ({ type: "user", user }));

    if ("everyone".includes(search.trim())) {
      opts.push({ type: "everyone" });
    }

    const exactMatchExists = opts.some(opt => {
      const matchName = opt.type === "everyone" ? "everyone" : `${opt.user.firstname} ${opt.user.lastname}`.toLowerCase();
      return matchName === search.trim();
    });

    if (exactMatchExists) {
      return [];
    }

    return opts;
  }, [mentionState.active, mentionState.text, filterMembers]);
```

Replace the `@` detection block inside `handleInputChange` (everything from `// ── User mention detection (@) ──` to just before the closing `};` of the function):
```typescript
    // ── User mention detection (@) ────────────────────────────────────
    if (members) {
      const atTrigger = detectAtTrigger(textBeforeCursor);
      if (atTrigger) {
        setMentionState({ active: true, text: atTrigger.text, startIndex: atTrigger.startIndex });
        setTaskMentionState({ active: false, text: "", startIndex: -1 });
        setTaskResults([]);
        return;
      }
    }

    setMentionState({ active: false, text: "", startIndex: -1 });
    setTaskMentionState({ active: false, text: "", startIndex: -1 });
    setTaskResults([]);
  };
```

- [ ] **Step 3: Add the import**

At the top of `ChatInput.tsx`, add:
```typescript
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
```

- [ ] **Step 4: Update submit-time expansion to keep `@everyone` working**

Replace (in `handleSubmit`):
```typescript
    // 2. Process user mentions
    if (activeMentions.length > 0) {
      const escaped = activeMentions.map(m => m.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp(`(^|\\n|\\s)(${escaped.join("|")})(?=$|\\s|\\n|[.,!?;:])`, "g");
      processedContent = processedContent.replace(regex, (match, p1, p2) => {
        const mention = activeMentions.find(m => m.display === p2);
        return p1 + (mention ? mention.replaceWith : p2);
      });
    }

    const mentionedUserIds = [...processedContent.matchAll(/@\[.*?\]\(user:([a-zA-Z0-9-]+)\)/g)].map(m => m[1]);
```
with:
```typescript
    // 2. Process user mentions (the shared hook does not handle @everyone, so
    // that token is left as literal text here — isEveryoneMention below still
    // detects it via a plain substring check, unchanged from before).
    processedContent = expandMentions(processedContent);
    const mentionedUserIds = extractMentionedUserIds(processedContent);
```

- [ ] **Step 5: Manual verification**

Run: `pnpm --filter dash dev`
In a browser, open a chat room and verify:
1. Typing `@` still opens the member dropdown (and still includes "everyone").
2. Selecting a member inserts `@Firstname Lastname` at the cursor.
3. Sending the message resolves it to a mention (rendered highlighted, and the mentioned user would receive a `mention_notification` — check the Network/WS tab or `use-mentions.ts` state if easy to verify).
4. `@everyone` still works and still tags the whole workspace.
5. `#task` mentions are unaffected (untouched code path).

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter dash exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/dash/hooks/use-mention-autocomplete.ts apps/frontend/dash/components/chat/ChatInput.tsx
git commit -m "$(cat <<'EOF'
refactor(dash): extract shared mention-autocomplete hook from ChatInput

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 10: `TaskComments.tsx` component

**Files:**
- Create: `apps/frontend/dash/components/kanban/TaskComments.tsx`

**Interfaces:**
- Consumes: `useTaskComments`, `useCreateTaskComment`, `useEditTaskComment`, `useDeleteTaskComment` (Task 8); `useMentionAutocomplete` (Task 9); `useWorkspaceMembers` (existing); `useUser` (`apps/frontend/dash/providers/user.provider.tsx`, existing); `UserAvatar` (existing, `apps/frontend/dash/components/user-avatar.tsx`).
- Produces: `<TaskComments task={Task} workspaceId={string} boardId={string} />` — consumed by Task 11 (`TaskDetailModal.tsx`).

This is the primary visual-design task. Before writing the JSX, invoke the `impeccable` and `frontend-design` skills to work out composer layout, comment bubble styling, mention-chip rendering, and spacing/typography — matching `MessageBubble.tsx`'s and `TaskAttachments.tsx`'s established visual language (rounded `bg-base-200` cards, `border-[1.5px] border-base-300`, `HugeiconsIcon` from `@hugeicons/core-free-icons`, `UserAvatar` for authors) so the new section reads as native to the app, not bolted on. The structure below is functional scaffolding — the skills should drive the final spacing/color/motion polish within it.

- [ ] **Step 1: Load the design skills**

Invoke `impeccable` and `frontend-design` (via the `Skill` tool) scoped to: "Design the visual treatment for a task-comment thread (composer + comment list) inside `TaskDetailModal.tsx`, matching the existing `MessageBubble.tsx`/`TaskAttachments.tsx`/`ChatInput.tsx` visual language in this codebase." Use their output to inform the exact Tailwind classes in Steps 2-3 below (adjust spacing/typography/color choices as the skills recommend — the scaffolding below is a functional baseline, not a final visual spec).

- [ ] **Step 2: Write the component**

Create `apps/frontend/dash/components/kanban/TaskComments.tsx`:
```typescript
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { format } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Edit02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import type { Task, TaskComment } from "@crwsync/types";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
import { useTaskComments, useCreateTaskComment, useEditTaskComment, useDeleteTaskComment } from "@/hooks/use-task-comments";
import { useUser } from "@/providers/user.provider";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export interface TaskCommentsProps {
  task: Task;
  workspaceId: string;
  boardId: string;
}

function renderMentionText(content: string) {
  const parts: (string | { name: string })[] = [];
  const regex = /@\[(.*?)\]\(user:[a-zA-Z0-9-]+\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push({ name: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return parts.map((part, i) =>
    typeof part === "string" ? (
      <span key={i}>{part}</span>
    ) : (
      <span key={i} className="text-info font-medium">
        @{part.name}
      </span>
    ),
  );
}

export function TaskComments({ task, workspaceId, boardId }: TaskCommentsProps) {
  const user = useUser();
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { filterMembers, detectAtTrigger, expandMentions, extractMentionedUserIds } =
    useMentionAutocomplete(members);

  const { data: page } = useTaskComments(workspaceId, task.id);
  const createComment = useCreateTaskComment(workspaceId, boardId, task.id);
  const editComment = useEditTaskComment(workspaceId, task.id);
  const deleteComment = useDeleteTaskComment(workspaceId, boardId, task.id);

  const [content, setContent] = useState("");
  const [mentionState, setMentionState] = useState({ active: false, text: "", startIndex: -1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = mentionState.active ? filterMembers(mentionState.text) : [];

  const insertMention = (u: NonNullable<ReturnType<typeof filterMembers>>[number]) => {
    const mentionText = `@${u.firstname} ${u.lastname}`;
    const beforeMention = content.slice(0, mentionState.startIndex);
    const afterCursor = content.slice(textareaRef.current?.selectionStart || content.length);
    const newContent = beforeMention + mentionText + " " + afterCursor;
    setContent(newContent);
    setMentionState({ active: false, text: "", startIndex: -1 });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = beforeMention.length + mentionText.length + 1;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    const cursorPosition = e.target.selectionStart;
    const atTrigger = members ? detectAtTrigger(value.slice(0, cursorPosition)) : null;
    setMentionState(atTrigger ? { active: true, ...atTrigger } : { active: false, text: "", startIndex: -1 });
  };

  const handleSubmit = () => {
    if (!content.trim() || createComment.isPending) return;
    const expanded = expandMentions(content);
    const mentionedUserIds = extractMentionedUserIds(expanded);
    createComment.mutate(
      { content: expanded, mentionedUserIds },
      { onSuccess: () => setContent("") },
    );
    setMentionState({ active: false, text: "", startIndex: -1 });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !mentionState.active) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startEdit = (comment: TaskComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const saveEdit = (commentId: string) => {
    if (!editContent.trim()) return;
    editComment.mutate({ commentId, data: { content: editContent } }, { onSuccess: () => setEditingId(null) });
  };

  const comments = page?.comments ?? [];

  return (
    <div className="pt-4 mt-4 border-t border-base-200">
      <label className="text-xs text-muted-foreground mb-2 block">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </label>

      {comments.length > 0 && (
        <div className="flex flex-col gap-3 mb-3">
          {comments.map((comment) => {
            const isAuthor = comment.author_id === user?.id;
            return (
              <div key={comment.id} className="flex items-start gap-2.5">
                {comment.author && <UserAvatar user={comment.author} size={7} />}
                <div className="flex-1 min-w-0 bg-base-200 rounded-lg border-[1.5px] border-base-300 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {comment.author ? `${comment.author.firstname} ${comment.author.lastname}` : "Unknown"}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        {comment.is_edited && !comment.is_deleted ? " (edited)" : ""}
                      </span>
                      {isAuthor && !comment.is_deleted && editingId !== comment.id && (
                        <>
                          <button
                            type="button"
                            title="Edit comment"
                            onClick={() => startEdit(comment)}
                            className="size-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-base-100 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete comment"
                            onClick={() => deleteComment.mutate(comment.id)}
                            className="size-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-error hover:bg-base-100 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full text-sm bg-background rounded-md border border-base-300 px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={2}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-xs rounded-md hover:bg-base-100 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(comment.id)}
                          className="px-2 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "text-sm leading-snug mt-0.5 whitespace-pre-wrap break-words",
                        comment.is_deleted ? "italic text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {comment.is_deleted ? comment.content : renderMentionText(comment.content)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... use @ to mention someone"
          rows={2}
          className="w-full text-sm bg-base-100 rounded-lg border-[1.5px] border-base-300 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          title="Post comment"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
          className="absolute bottom-2 right-2 size-7 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-3.5" />
        </button>

        {mentionState.active && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-56 max-h-48 overflow-y-auto bg-background border-[1.5px] border-base-300 rounded-lg shadow-lg z-10">
            {filteredMembers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => insertMention(u)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-base-200 transition-colors cursor-pointer text-left"
              >
                <UserAvatar user={u} size={5} />
                <span className="truncate">{u.firstname} {u.lastname}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter dash exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `pnpm --filter dash lint`
Expected: no errors (fix the unused-variable note above if flagged).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/dash/components/kanban/TaskComments.tsx
git commit -m "$(cat <<'EOF'
feat(dash): add TaskComments composer and thread component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 11: Mount `TaskComments` in `TaskDetailModal.tsx`

**Files:**
- Modify: `apps/frontend/dash/components/kanban/TaskDetailModal.tsx:17` (import), `:370` (mount point)

**Interfaces:**
- Consumes: `TaskComments` (Task 10).

- [ ] **Step 1: Add the import**

In `apps/frontend/dash/components/kanban/TaskDetailModal.tsx`, change:
```typescript
import { TaskAttachments } from "./TaskAttachments";
```
to:
```typescript
import { TaskAttachments } from "./TaskAttachments";
import { TaskComments } from "./TaskComments";
```

- [ ] **Step 2: Mount the component**

Change:
```typescript
        <TaskAttachments task={liveTask} workspaceId={workspaceId} boardId={boardId} />

        <div className="flex justify-end gap-2 pt-5 mt-5 border-t border-base-200">
```
to:
```typescript
        <TaskAttachments task={liveTask} workspaceId={workspaceId} boardId={boardId} />

        <TaskComments task={liveTask} workspaceId={workspaceId} boardId={boardId} />

        <div className="flex justify-end gap-2 pt-5 mt-5 border-t border-base-200">
```

- [ ] **Step 3: Manual verification**

Run: `pnpm --filter dash dev` (and the backend if not already running).
In a browser: open a board, click a task card, confirm the "Comments" section renders below "Attachments" with the composer visible and no console errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/kanban/TaskDetailModal.tsx
git commit -m "$(cat <<'EOF'
feat(dash): mount TaskComments in the task detail modal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 12: Real-time sync — `use-board-socket.ts`

**Files:**
- Modify: `apps/frontend/dash/hooks/use-board-socket.ts`

**Interfaces:**
- Consumes: `task:comment:created/updated/deleted` socket events (Task 3); `commentKeys` (Task 8).
- Produces: live-patched `commentKeys.list(taskId)` and `boardKeys.detail(boardId)` (`task._count.comments`) caches on every connected client.

- [ ] **Step 1: Add payload types and imports**

Add near the other payload interfaces (after `TaskAttachmentRemovedPayload`):
```typescript
interface TaskCommentCreatedPayload {
  boardId: string;
  taskId: string;
  comment: TaskComment;
  commentCount: number;
}

interface TaskCommentUpdatedPayload {
  boardId: string;
  taskId: string;
  comment: TaskComment;
}

interface TaskCommentDeletedPayload {
  boardId: string;
  taskId: string;
  commentId: string;
  commentCount: number;
}
```
Change the type-only import at the top of the file:
```typescript
import type { Board, BoardColumn, Task, TaskAttachment } from "@crwsync/types";
```
to:
```typescript
import type { Board, BoardColumn, Task, TaskAttachment, TaskComment, TaskCommentPage } from "@crwsync/types";
import { commentKeys } from "@/hooks/query-keys";
```

- [ ] **Step 2: Add the handlers**

Inside `useBoardSocket`, after the `onTaskAttachmentRemoved` handler and before the `// ----- reconnect` block, add:
```typescript
    // ----- task:comment:created -------------------------------------------
    const onTaskCommentCreated = ({ boardId: bId, taskId, comment, commentCount }: TaskCommentCreatedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => ({
            ...board,
            columns: (board.columns ?? []).map((col) => ({
              ...col,
              tasks: (col.tasks ?? []).map((t) =>
                t.id === taskId ? { ...t, _count: { comments: commentCount } } : t,
              ),
            })),
          })),
      );

      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          if (old.data.comments.some((c) => c.id === comment.id)) return old;
          return { ...old, data: { ...old.data, comments: [...old.data.comments, comment] } };
        },
      );
    };

    // ----- task:comment:updated -------------------------------------------
    const onTaskCommentUpdated = ({ boardId: bId, taskId, comment }: TaskCommentUpdatedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: { ...old.data, comments: old.data.comments.map((c) => (c.id === comment.id ? comment : c)) },
          };
        },
      );
    };

    // ----- task:comment:deleted -------------------------------------------
    const onTaskCommentDeleted = ({ boardId: bId, taskId, commentId, commentCount }: TaskCommentDeletedPayload) => {
      if (bId !== boardId) return;

      queryClient.setQueryData<BoardCache>(
        boardKeys.detail(boardId),
        (old) =>
          patchBoardCache(old, (board) => ({
            ...board,
            columns: (board.columns ?? []).map((col) => ({
              ...col,
              tasks: (col.tasks ?? []).map((t) =>
                t.id === taskId ? { ...t, _count: { comments: commentCount } } : t,
              ),
            })),
          })),
      );

      queryClient.setQueryData(
        commentKeys.list(taskId),
        (old: { data: TaskCommentPage } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              comments: old.data.comments.map((c) =>
                c.id === commentId ? { ...c, is_deleted: true, content: "This comment was deleted." } : c,
              ),
            },
          };
        },
      );
    };
```

- [ ] **Step 3: Register and clean up the listeners**

Add to the `socket.on(...)` block:
```typescript
    socket.on("task:comment:created", onTaskCommentCreated);
    socket.on("task:comment:updated", onTaskCommentUpdated);
    socket.on("task:comment:deleted", onTaskCommentDeleted);
```
and the matching `socket.off(...)` block:
```typescript
    socket.off("task:comment:created", onTaskCommentCreated);
    socket.off("task:comment:updated", onTaskCommentUpdated);
    socket.off("task:comment:deleted", onTaskCommentDeleted);
```

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter dash dev` with two browser sessions logged in as different workspace members.
1. Open the same board in both; open the same task's modal in both.
2. Post a comment as User A — confirm it appears live in User B's modal without a refresh, and the kanban card's comment badge (once Task 14 lands) would update for User B even with the modal closed.
3. Edit and delete the comment as User A — confirm both propagate live to User B.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter dash exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/hooks/use-board-socket.ts
git commit -m "$(cat <<'EOF'
feat(dash): sync task comments live over the board socket

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 13: Mention notifications — `use-mentions.ts` + bell card

**Files:**
- Modify: `apps/frontend/dash/hooks/use-mentions.ts`
- Modify: `apps/frontend/dash/components/notifications.tsx` (add `TaskCommentMentionCard`)
- Modify: `apps/frontend/dash/components/r-sidebar.tsx` (render the new card, fold into the badge count)

**Interfaces:**
- Consumes: `task_comment_mention_notification` socket event (Task 3); `TaskCommentMentionNotification` type (Task 6).
- Produces: `useMentions()` returns additional `{ taskCommentMentions, dismissTaskCommentMention }` alongside its existing `{ mentions, dismissMention, clearAll }`.

Known scope cut: the card navigates to the task's board (`/${workspace.slug}/board/${board.id}`), not directly into the opened task modal — deep-linking a specific task via URL isn't supported by the board page today (no `?task=` param handling exists), and building that is Omni-Search/deep-link infrastructure explicitly slated for Milestone 4. Not building it here.

- [ ] **Step 1: Extend `use-mentions.ts`**

Replace the full contents of `apps/frontend/dash/hooks/use-mentions.ts` with:
```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import type { ChatMessage, MentionNotification, TaskComment, TaskCommentMentionNotification } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";

type RawMentionPayload = ChatMessage & {
  room: { id: string; name: string | null };
  workspace: { slug: string; name: string };
};

type RawTaskCommentMentionPayload = {
  comment: TaskComment;
  task: { id: string; shortId: string; title: string };
  board: { id: string; name: string };
  workspace: { slug: string; name: string };
};

export function useMentions() {
  const user = useUser();
  const { socket } = useSocket();
  const [mentions, setMentions] = useState<MentionNotification[]>([]);
  const [taskCommentMentions, setTaskCommentMentions] = useState<TaskCommentMentionNotification[]>([]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleMentionNotification = (payload: RawMentionPayload) => {
      const { room, workspace, ...message } = payload;
      const notification: MentionNotification = {
        notificationId: `mention_${message.id}_${Date.now()}`,
        message: message as ChatMessage,
        room,
        workspace,
        receivedAt: new Date().toISOString(),
      };

      setMentions((prev) => {
        // Deduplicate by message id (in case of re-delivery)
        if (prev.some((n) => n.message.id === message.id)) return prev;
        return [notification, ...prev];
      });
    };

    const handleTaskCommentMentionNotification = (payload: RawTaskCommentMentionPayload) => {
      const notification: TaskCommentMentionNotification = {
        notificationId: `task_comment_mention_${payload.comment.id}_${Date.now()}`,
        ...payload,
        receivedAt: new Date().toISOString(),
      };

      setTaskCommentMentions((prev) => {
        if (prev.some((n) => n.comment.id === payload.comment.id)) return prev;
        return [notification, ...prev];
      });
    };

    socket.on("mention_notification", handleMentionNotification);
    socket.on("task_comment_mention_notification", handleTaskCommentMentionNotification);

    return () => {
      socket.off("mention_notification", handleMentionNotification);
      socket.off("task_comment_mention_notification", handleTaskCommentMentionNotification);
    };
  }, [socket, user]);

  const dismissMention = useCallback((notificationId: string) => {
    setMentions((prev) => prev.filter((n) => n.notificationId !== notificationId));
  }, []);

  const dismissTaskCommentMention = useCallback((notificationId: string) => {
    setTaskCommentMentions((prev) => prev.filter((n) => n.notificationId !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setMentions([]);
    setTaskCommentMentions([]);
  }, []);

  return { mentions, dismissMention, taskCommentMentions, dismissTaskCommentMention, clearAll };
}
```

- [ ] **Step 2: Add `TaskCommentMentionCard`**

In `apps/frontend/dash/components/notifications.tsx`, add (near `MentionNotificationCard`, reusing its `stripTokens` helper):
```typescript
interface TaskCommentMentionCardProps {
  notification: TaskCommentMentionNotification;
  onDismiss: (id: string) => void;
}

export function TaskCommentMentionCard({ notification, onDismiss }: TaskCommentMentionCardProps) {
  const router = useRouter();
  const timeAgo = useTimeAgo(notification.receivedAt);
  const { comment, task, board, workspace } = notification;

  const authorName = comment.author ? `${comment.author.firstname} ${comment.author.lastname}` : "Someone";
  const previewText = stripTokens(comment.content);
  const targetPath = `/${workspace.slug}/board/${board.id}`;

  const handleNavigate = () => {
    router.push(targetPath);
    onDismiss(notification.notificationId);
  };

  return (
    <div onClick={handleNavigate} className="cursor-pointer">
      <GlassBox className="w-full! gap-3 p-4">
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0">
            <HugeiconsIcon icon={AtIcon} className="size-3.5 text-primary" strokeWidth={2} />
          </div>
          <span className="text-xs text-primary flex-1 truncate">
            Mentioned in <span className="font-semibold">{task.shortId}: {task.title}</span>
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
        </div>
        <div className="flex items-start gap-2.5 w-full">
          {comment.author && <UserAvatar user={comment.author} size={7} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{authorName}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{previewText}</p>
          </div>
        </div>
      </GlassBox>
    </div>
  );
}
```
Add `TaskCommentMentionNotification` to the existing `@crwsync/types` import at the top of the file.

- [ ] **Step 3: Render the card and fold it into the badge count**

In `apps/frontend/dash/components/r-sidebar.tsx`, in `SidebarNotifications`, change:
```typescript
  const { mentions, dismissMention } = useMentions();

  const isEmpty = invites.length === 0 && mentions.length === 0;
```
to:
```typescript
  const { mentions, dismissMention, taskCommentMentions, dismissTaskCommentMention } = useMentions();

  const isEmpty = invites.length === 0 && mentions.length === 0 && taskCommentMentions.length === 0;
```
and add, alongside the existing `mentions.map(...)`:
```typescript
      {taskCommentMentions.map((notification) => (
        <TaskCommentMentionCard
          key={notification.notificationId}
          notification={notification}
          onDismiss={dismissTaskCommentMention}
        />
      ))}
```
In `NotificationBellButton`, change:
```typescript
  const { mentions } = useMentions();

  const pendingInvites = invites.filter((i) => i.status === "pending").length;
  const totalBadge = pendingInvites + mentions.length;
```
to:
```typescript
  const { mentions, taskCommentMentions } = useMentions();

  const pendingInvites = invites.filter((i) => i.status === "pending").length;
  const totalBadge = pendingInvites + mentions.length + taskCommentMentions.length;
```
Add `TaskCommentMentionCard` to the existing import from `@/components/notifications` at the top of `r-sidebar.tsx`.

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter dash dev` with two browser sessions.
As User A, post a task comment mentioning User B. As User B, confirm the bell badge increments and the notification card appears in the bell dropdown; clicking it navigates to the task's board.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter dash exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/hooks/use-mentions.ts apps/frontend/dash/components/notifications.tsx apps/frontend/dash/components/r-sidebar.tsx
git commit -m "$(cat <<'EOF'
feat(dash): surface task comment mentions in the notification bell

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 14: Kanban card comment-count badge

**Files:**
- Modify: `apps/frontend/dash/components/kanban/KanbanTask.tsx`

**Interfaces:**
- Consumes: `task._count.comments` (Task 5/6).

- [ ] **Step 1: Add the badge**

In `apps/frontend/dash/components/kanban/KanbanTask.tsx`, add `Comment01Icon` to the `@hugeicons/core-free-icons` import:
```typescript
import { Calendar04Icon, Flag02Icon, Comment01Icon } from "@hugeicons/core-free-icons";
```
Change the left-side chip group:
```typescript
        <div className="flex items-center gap-2">
          {task.priority && task.priority !== "NONE" && (
            <Chip icon={Flag02Icon} label={task.priority} className={PRIORITY_STYLES[task.priority]} />
          )}
          {task.due_date && (
            <Chip icon={Calendar04Icon} label={formatChipDate(task.due_date)} className={DEADLINE_STYLES(task.due_date)} />
          )}
          {task.labels && task.labels.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {task.labels.length} label{task.labels.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
```
to:
```typescript
        <div className="flex items-center gap-2">
          {task.priority && task.priority !== "NONE" && (
            <Chip icon={Flag02Icon} label={task.priority} className={PRIORITY_STYLES[task.priority]} />
          )}
          {task.due_date && (
            <Chip icon={Calendar04Icon} label={formatChipDate(task.due_date)} className={DEADLINE_STYLES(task.due_date)} />
          )}
          {task.labels && task.labels.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {task.labels.length} label{task.labels.length > 1 ? "s" : ""}
            </span>
          )}
          {!!task._count?.comments && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <HugeiconsIcon icon={Comment01Icon} strokeWidth={2} className="size-3" />
              {task._count.comments}
            </span>
          )}
        </div>
```
And update the `className={cn(...)}` condition just above it to also trigger the `mt-4` spacing when a comment count exists:
```typescript
      <div className={cn(
        "flex items-center justify-between",
        (task.priority && task.priority !== "NONE" || task.due_date || task.labels?.length || task._count?.comments || (task.assignee_id && assignee)) && "mt-4"
      )}>
```

- [ ] **Step 2: Manual verification**

Run: `pnpm --filter dash dev`. Post a comment on a task, close the modal, confirm the kanban card shows the comment icon + count; delete the comment and confirm the count drops (and the icon disappears at 0).

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm --filter dash exec tsc --noEmit && pnpm --filter dash lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/kanban/KanbanTask.tsx
git commit -m "$(cat <<'EOF'
feat(dash): show comment count badge on kanban cards

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```

---

### Task 15: End-to-end manual verification

**Files:** none (verification only).

- [ ] **Step 1: Full-stack smoke test**

Run: `pnpm dev` (or the repo's usual root dev command starting backend + dash together) and, in a browser (Claude in Chrome or manual):
1. Open a task, post a comment with a plain message — confirm it appears immediately with your name/avatar/timestamp.
2. Type `@` and confirm the member dropdown appears; pick a member; send — confirm the mention renders highlighted in the comment.
3. Edit your own comment — confirm the "(edited)" marker appears.
4. Delete your own comment — confirm it becomes the "This comment was deleted." tombstone.
5. Confirm you cannot see edit/delete controls on another user's comment.
6. Close the modal — confirm the kanban card shows the correct comment count badge.
7. In a second browser session as a different workspace member, confirm all of the above propagate live (no manual refresh) via the socket handlers from Task 12, and that a mention triggers a bell notification (Task 13).

- [ ] **Step 2: Run the full test suites**

Run: `pnpm --filter @crwsync/backend test && pnpm --filter @crwsync/backend exec tsc --noEmit && pnpm --filter dash exec tsc --noEmit && pnpm --filter dash lint`
Expected: everything green.

- [ ] **Step 3: Update `ROADMAP.md`**

In `ROADMAP.md`, under Milestone 3, change:
```markdown
- [ ] **Task Comments & Discussion**:
```
to:
```markdown
- [x] **Task Comments & Discussion**:
```

- [ ] **Step 4: Commit**

```bash
git add ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: mark Task Comments & Discussion complete (M3)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gt4nnr6XW4iLxsBRsZYV8s
EOF
)"
```
