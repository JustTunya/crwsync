# Bugfix Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 27 findings from the backend/frontend bug audit — cross-workspace IDOR, cache-invalidation gaps, N+1 queries, socket auth/reliability holes, and a frontend fetch waterfall — without introducing regressions in a codebase that currently has zero tests.

**Architecture:** Group fixes by file/subsystem cluster (not by severity tier), fixing worst-bug-first within each cluster, so every touched file is opened and committed exactly once. Add unit tests only for the three security-critical fixes (cross-workspace IDOR, socket subscription auth bypass, JWT role-version bypass); everything else is verified manually with concrete commands given per task.

**Tech Stack:** NestJS 11 + Prisma 7 (`@prisma/adapter-pg`) + ioredis + BullMQ + Socket.IO on the backend; Next.js 16 + TanStack Query + socket.io-client on the frontend (`apps/frontend/dash`). Jest + ts-jest already configured for the backend (`apps/backend/package.json`), zero existing `.spec.ts` files.

**Spec:** `docs/superpowers/specs/2026-09-08-bugfix-audit-design.md`

## Global Constraints

- No new test framework or e2e/DB harness — use the existing Jest config, unit tests only, mocked Prisma/services (no live DB in tests).
- Every Prisma `update`/`delete`/`updateMany` that currently trusts a bare resource `id` must be preceded by a `findFirst` (or `count`, for array inputs) that scopes the lookup through the resource's workspace — this repo's own established idiom (see `workspace.service.ts:299-302`'s `revokeInvite`), not a new pattern.
- Double quotes, 2-space indent, semicolons — match existing file style exactly (per `CLAUDE.md`).
- No new abstractions beyond what's specified in a task (no interfaces for one implementation, no config objects for fixed values).
- Every task's commit message ends with the standard attribution trailer already in use this session:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
  ```

---

## Pass 1 — Backend authorization + board queries

### Task 1: Fix cross-workspace IDOR on boards, columns, and tasks

**Files:**
- Modify: `apps/backend/src/board/board.service.ts` (`getBoard`, `updateBoard`, `deleteBoard`, `createColumn`, `updateColumn`, `deleteColumn`, `reorderColumns`, `createTask`, `updateTask`, `moveTask`)
- Modify: `apps/backend/src/board/board.controller.ts:70-75` (`findOne` — currently doesn't even receive `workspaceId`)
- Test: `apps/backend/src/board/board.service.spec.ts` (new)

**Interfaces:**
- Consumes: `PrismaService`, `CacheService`, `StatusGateway` (existing constructor deps, unchanged).
- Produces: `BoardService.getBoard(workspaceId: string, boardId: string)` — **signature change**, was `getBoard(boardId: string)`. All other method signatures unchanged (they already take `workspaceId` as their first param; only their internal `where` clauses change).

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/board/board.service.spec.ts`:

```typescript
import { BoardService } from "./board.service";
import { NotFoundException } from "@nestjs/common";

function makeService() {
  const prisma = {
    board: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    boardColumn: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    task: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    workspace: { update: jest.fn() },
    $transaction: jest.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg({}))),
  } as any;
  const cache = { acquireLock: jest.fn().mockResolvedValue(true), releaseLock: jest.fn() } as any;
  const statusGateway = { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } } as any;
  return { service: new BoardService(prisma, cache, statusGateway), prisma };
}

describe("BoardService cross-workspace scoping", () => {
  it("getBoard scopes the lookup by workspace_id", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue({ id: "board-1", columns: [] });

    await service.getBoard("ws-1", "board-1");

    expect(prisma.board.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "board-1", workspace_id: "ws-1" } }),
    );
  });

  it("getBoard throws NotFoundException when the board belongs to another workspace", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue(null);

    await expect(service.getBoard("ws-1", "board-from-ws-2")).rejects.toThrow(NotFoundException);
  });

  it("updateBoard rejects a board that doesn't belong to the given workspace", async () => {
    const { service, prisma } = makeService();
    prisma.board.findFirst.mockResolvedValue(null);

    await expect(service.updateBoard("ws-1", "board-from-ws-2", { name: "x" } as any)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.board.update).not.toHaveBeenCalled();
  });

  it("createTask rejects a column that doesn't belong to the given board/workspace", async () => {
    const { service, prisma } = makeService();
    prisma.boardColumn.findFirst.mockResolvedValue(null);

    await expect(
      service.createTask("ws-1", "board-1", { column_id: "col-from-other-board", title: "t" } as any, "user-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("moveTask rejects a target column outside the given board", async () => {
    const { service, prisma } = makeService();
    prisma.task.findFirst.mockResolvedValue({ column_id: "col-1", in_progress_at: null, completed_at: null });
    prisma.boardColumn.findMany.mockResolvedValue([{ id: "col-1", type: "UPCOMING" }]);

    await expect(
      service.moveTask("ws-1", "board-1", "task-1", { column_id: "col-from-other-board", position: 0 } as any, "user-1"),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx jest board.service.spec.ts`
Expected: FAIL — `getBoard` doesn't accept a `workspaceId` param yet, `prisma.board.findFirst` isn't called at all (current code calls `findUnique`).

- [ ] **Step 3: Fix `getBoard` and the controller**

In `board.service.ts`, replace the `getBoard` method:

```typescript
async getBoard(workspaceId: string, boardId: string) {
  const board = await this.prisma.board.findFirst({
    where: { id: boardId, workspace_id: workspaceId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            where: {
              is_deleted: false,
              is_archived: false,
            },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  if (!board) {
    throw new NotFoundException("Board not found");
  }

  return { success: true, data: board };
}
```

In `board.controller.ts`, replace the `findOne` handler (lines 70-75):

```typescript
@Get(":boardId")
findOne(
  @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
  @Param("boardId", new ParseUUIDPipe({ version: "4" })) boardId: string,
) {
  return this.boardService.getBoard(workspaceId, boardId);
}
```

- [ ] **Step 4: Fix `updateBoard` and `deleteBoard`**

Replace `updateBoard`:

```typescript
async updateBoard(workspaceId: string, boardId: string, dto: UpdateBoardDto) {
  const existing = await this.prisma.board.findFirst({
    where: { id: boardId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Board not found");

  const board = await this.prisma.board.update({
    where: { id: boardId },
    data: dto,
  });

  if (dto.name) {
    await this.prisma.workspaceModule.updateMany({
      where: { workspace_id: workspaceId, reference_id: boardId },
      data: { name: dto.name },
    });
  }

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:updated", { boardId, data: dto });

  return { success: true, data: board };
}
```

Replace `deleteBoard`:

```typescript
async deleteBoard(workspaceId: string, boardId: string) {
  const existing = await this.prisma.board.findFirst({
    where: { id: boardId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Board not found");

  await this.prisma.$transaction(async (tx) => {
    await tx.board.delete({ where: { id: boardId } });
    await tx.workspaceModule.deleteMany({
      where: { workspace_id: workspaceId, reference_id: boardId },
    });
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("module:deleted", { referenceId: boardId });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:deleted", { boardId });

  return { success: true };
}
```

- [ ] **Step 5: Fix `createColumn`, `updateColumn`, `deleteColumn`, `reorderColumns`**

Replace `createColumn`:

```typescript
async createColumn(
  workspaceId: string,
  boardId: string,
  dto: CreateColumnDto,
) {
  const board = await this.prisma.board.findFirst({
    where: { id: boardId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!board) throw new NotFoundException("Board not found");

  const lastColumn = await this.prisma.boardColumn.findFirst({
    where: { board_id: boardId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const nextPosition = (lastColumn?.position ?? 0) + POSITION_GAP;

  const column = await this.prisma.boardColumn.create({
    data: {
      board_id: boardId,
      name: dto.name,
      color: dto.color,
      type: dto.type,
      position: nextPosition,
    },
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:column:created", { boardId, column });

  return { success: true, data: column };
}
```

Replace `updateColumn`:

```typescript
async updateColumn(
  workspaceId: string,
  boardId: string,
  columnId: string,
  dto: UpdateColumnDto,
) {
  const existing = await this.prisma.boardColumn.findFirst({
    where: { id: columnId, board: { id: boardId, workspace_id: workspaceId } },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Column not found");

  const column = await this.prisma.boardColumn.update({
    where: { id: columnId },
    data: dto,
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:column:updated", { boardId, columnId, data: dto });

  return { success: true, data: column };
}
```

Replace `deleteColumn`:

```typescript
async deleteColumn(workspaceId: string, boardId: string, columnId: string) {
  const existing = await this.prisma.boardColumn.findFirst({
    where: { id: columnId, board: { id: boardId, workspace_id: workspaceId } },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Column not found");

  await this.prisma.boardColumn.delete({ where: { id: columnId } });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:column:deleted", { boardId, columnId });

  return { success: true };
}
```

Replace `reorderColumns`:

```typescript
async reorderColumns(
  workspaceId: string,
  boardId: string,
  dto: ReorderColumnsDto,
) {
  const count = await this.prisma.boardColumn.count({
    where: { id: { in: dto.column_ids }, board: { id: boardId, workspace_id: workspaceId } },
  });
  if (count !== dto.column_ids.length) {
    throw new NotFoundException("One or more columns not found on this board");
  }

  await this.prisma.$transaction(
    dto.column_ids.map((id, index) =>
      this.prisma.boardColumn.update({
        where: { id },
        data: { position: (index + 1) * POSITION_GAP },
      }),
    ),
  );

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:columns:reordered", { boardId, columnIds: dto.column_ids });

  return { success: true };
}
```

- [ ] **Step 6: Fix `createTask`, `updateTask`, `moveTask`**

Replace `createTask` (note: this also removes the old duplicate `boardColumn.findUnique` call further down the original method — the ownership-checking `findFirst` at the top now serves both purposes):

```typescript
async createTask(
  workspaceId: string,
  boardId: string,
  dto: CreateTaskDto,
  userId: string,
) {
  const targetColumn = await this.prisma.boardColumn.findFirst({
    where: { id: dto.column_id, board: { id: boardId, workspace_id: workspaceId } },
    select: { type: true },
  });
  if (!targetColumn) {
    throw new NotFoundException("Column not found on this board");
  }

  const lastTask = await this.prisma.task.findFirst({
    where: { column_id: dto.column_id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const nextPosition = (lastTask?.position ?? 0) + POSITION_GAP;

  const updatedWorkspace = await this.prisma.workspace.update({
    where: { id: workspaceId },
    data: { taskSequenceCounter: { increment: 1 } },
    select: { workspaceKey: true, taskSequenceCounter: true },
  });

  const shortId = `${updatedWorkspace.workspaceKey}-${updatedWorkspace.taskSequenceCounter}`;

  const in_progress_at = targetColumn.type === "ONGOING" ? new Date() : null;
  const completed_at = targetColumn.type === "COMPLETE" ? new Date() : null;

  const task = await this.prisma.task.create({
    data: {
      column_id: dto.column_id,
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

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:task:created", { boardId, task });

  return { success: true, data: task };
}
```

Replace `updateTask`:

```typescript
async updateTask(
  workspaceId: string,
  boardId: string,
  taskId: string,
  dto: UpdateTaskDto,
) {
  const existing = await this.prisma.task.findFirst({
    where: { id: taskId, column: { board: { id: boardId, workspace_id: workspaceId } } },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Task not found");

  const data: Record<string, unknown> = {};
  if (dto.title !== undefined) data.title = dto.title;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.priority !== undefined) data.priority = dto.priority;
  if (dto.labels !== undefined) data.labels = dto.labels;
  if (dto.tags !== undefined) data.tags = dto.tags;
  if (dto.assignee_id !== undefined) data.assignee_id = dto.assignee_id;
  if (dto.due_date !== undefined)
    data.due_date = dto.due_date ? new Date(dto.due_date) : null;
  if (dto.is_deleted !== undefined) data.is_deleted = dto.is_deleted;
  if (dto.is_archived !== undefined) data.is_archived = dto.is_archived;
  if (dto.in_progress_at !== undefined)
    data.in_progress_at = dto.in_progress_at ? new Date(dto.in_progress_at) : null;
  if (dto.completed_at !== undefined)
    data.completed_at = dto.completed_at ? new Date(dto.completed_at) : null;

  const task = await this.prisma.task.update({
    where: { id: taskId },
    data,
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:task:updated", { boardId, taskId, data: dto });

  return { success: true, data: task };
}
```

Replace `moveTask` (also adds a `board_id: boardId` filter to the columns lookup and an explicit target-column check, both previously missing):

```typescript
async moveTask(
  workspaceId: string,
  boardId: string,
  taskId: string,
  dto: MoveTaskDto,
  userId: string,
) {
  const task = await this.prisma.task.findFirst({
    where: { id: taskId, column: { board: { id: boardId, workspace_id: workspaceId } } },
    select: { column_id: true, in_progress_at: true, completed_at: true },
  });

  if (!task) throw new NotFoundException("Task not found");

  const fromColumnId = task.column_id;

  const columns = await this.prisma.boardColumn.findMany({
    where: { id: { in: [fromColumnId, dto.column_id] }, board_id: boardId },
    select: { id: true, type: true },
  });

  const targetColumn = columns.find((c) => c.id === dto.column_id);
  if (!targetColumn) {
    throw new NotFoundException("Target column not found on this board");
  }
  const sourceColumn = columns.find((c) => c.id === fromColumnId);

  let in_progress_at = task.in_progress_at;
  let completed_at = task.completed_at;

  if (targetColumn.type === "ONGOING" && !in_progress_at) {
    in_progress_at = new Date();
  }
  if (targetColumn.type === "COMPLETE") {
    completed_at = new Date();
  }
  if (
    sourceColumn?.type === "COMPLETE" &&
    (targetColumn.type === "ONGOING" || targetColumn.type === "UPCOMING")
  ) {
    completed_at = null;
  }

  const tasksInTarget = await this.prisma.task.findMany({
    where: { column_id: dto.column_id, is_deleted: false, is_archived: false },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const filtered = tasksInTarget.filter((t) => t.id !== taskId);
  filtered.splice(dto.position, 0, { id: taskId });

  await this.prisma.$transaction([
    this.prisma.task.update({
      where: { id: taskId },
      data: {
        column_id: dto.column_id,
        in_progress_at,
        completed_at,
      },
    }),
    ...filtered.map((t, index) =>
      this.prisma.task.update({
        where: { id: t.id },
        data: { position: (index + 1) * POSITION_GAP },
      }),
    ),
  ]);

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:task:moved", {
      boardId,
      taskId,
      fromColumnId,
      toColumnId: dto.column_id,
      position: dto.position,
      userId,
    });

  return { success: true };
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd apps/backend && npx jest board.service.spec.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 8: Typecheck and manually smoke-test**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

Start the backend (`pnpm dev` from repo root or `cd apps/backend && npm run start:dev`), log in as a user in one workspace, and confirm:
- `GET /workspaces/<your-ws-id>/boards/<a-real-board-id-from-a-different-workspace>` now returns 404 instead of the board's data.
- Your own boards/columns/tasks still load and edit normally in the dashboard UI.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/board/board.service.ts apps/backend/src/board/board.controller.ts apps/backend/src/board/board.service.spec.ts
git commit -m "$(cat <<'EOF'
fix(backend): scope board/column/task queries to their workspace

Every board, column, and task mutation/read trusted a bare resource id
with no check that it actually belonged to the workspace in the URL.
Any authenticated member of any workspace could read, edit, or delete
another workspace's board data by guessing or knowing a UUID.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 2: Fix cross-workspace IDOR on modules and projects

**Files:**
- Modify: `apps/backend/src/board/board.service.ts` (`updateModule`, `deleteModule`, `togglePinModule`, `reorderModules`, `updateProject`, `deleteProject`)
- Test: `apps/backend/src/board/board.service.spec.ts` (extend from Task 1)

**Interfaces:**
- Consumes: same as Task 1 — no new dependencies (`WorkspaceModule` and `WorkspaceProject` both carry a direct `workspace_id` column, so no relation traversal is needed here, unlike Task 1's tasks/columns).
- Produces: no signature changes — all these methods already take `workspaceId` as their first parameter; only their internal `where` clauses change.

- [ ] **Step 1: Write the failing tests**

Append to `apps/backend/src/board/board.service.spec.ts`:

```typescript
describe("BoardService module/project workspace scoping", () => {
  it("updateModule rejects a module from another workspace", async () => {
    const { service, prisma } = makeService();
    prisma.boardColumn.count = jest.fn();
    (prisma as any).workspaceModule = { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() };

    await expect(service.updateModule("ws-1", "module-from-ws-2", { name: "x" } as any)).rejects.toThrow(
      NotFoundException,
    );
    expect((prisma as any).workspaceModule.update).not.toHaveBeenCalled();
  });

  it("deleteModule rejects a module from another workspace", async () => {
    const { service, prisma } = makeService();
    (prisma as any).workspaceModule = { findFirst: jest.fn().mockResolvedValue(null) };

    await expect(service.deleteModule("ws-1", "module-from-ws-2")).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx jest board.service.spec.ts`
Expected: FAIL — `updateModule`/`deleteModule` currently call `workspaceModule.update`/`findUnique` without checking `workspace_id`, so the mocked `findFirst` returning `null` isn't consulted yet.

- [ ] **Step 3: Fix `updateModule`, `deleteModule`, `togglePinModule`, `reorderModules`**

Replace `updateModule`:

```typescript
async updateModule(
  workspaceId: string,
  moduleId: string,
  dto: UpdateModuleDto,
) {
  const existing = await this.prisma.workspaceModule.findFirst({
    where: { id: moduleId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Module not found");

  const wsModule = await this.prisma.workspaceModule.update({
    where: { id: moduleId },
    data: { name: dto.name },
  });

  if (wsModule.type === ModuleTypeEnum.BOARD && wsModule.reference_id) {
    await this.prisma.board.update({
      where: { id: wsModule.reference_id },
      data: { name: dto.name },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:updated", { boardId: wsModule.reference_id, data: { name: dto.name } });
  }

  if (wsModule.type === ModuleTypeEnum.CHAT && wsModule.reference_id) {
    await this.prisma.chatRoom.update({
      where: { id: wsModule.reference_id },
      data: { name: dto.name },
    });
  }

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("module:updated", { moduleId, data: dto });

  return { success: true, data: wsModule };
}
```

Replace `deleteModule` (only the first block changes — `findUnique` becomes a workspace-scoped `findFirst`):

```typescript
async deleteModule(workspaceId: string, moduleId: string) {
  const wsModule = await this.prisma.workspaceModule.findFirst({
    where: { id: moduleId, workspace_id: workspaceId },
  });

  if (!wsModule) throw new NotFoundException("Module not found");

  if (wsModule.type === ModuleTypeEnum.BOARD && wsModule.reference_id) {
    await this.deleteBoard(workspaceId, wsModule.reference_id);
  } else if (wsModule.type === ModuleTypeEnum.CHAT && wsModule.reference_id) {
    await this.prisma.$transaction(async (tx) => {
      await tx.chatMessage.deleteMany({ where: { room_id: wsModule.reference_id } });
      await tx.chatRoom.delete({ where: { id: wsModule.reference_id } });
      await tx.workspaceModule.delete({ where: { id: moduleId } });
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:deleted", { moduleId });
  } else {
    await this.prisma.workspaceModule.delete({
      where: { id: moduleId },
    });

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("module:deleted", { moduleId });
  }

  return { success: true };
}
```

Replace `togglePinModule`:

```typescript
async togglePinModule(workspaceId: string, moduleId: string, userId: string, isPinned: boolean) {
  const module_ = await this.prisma.workspaceModule.findFirst({
    where: { id: moduleId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!module_) throw new NotFoundException("Module not found");

  if (isPinned) {
    await this.prisma.userPinnedModule.upsert({
      where: {
        user_id_module_id: {
          user_id: userId,
          module_id: moduleId,
        },
      },
      create: {
        user_id: userId,
        module_id: moduleId,
      },
      update: {},
    });
  } else {
    await this.prisma.userPinnedModule.deleteMany({
      where: {
        user_id: userId,
        module_id: moduleId,
      },
    });
  }

  return { success: true };
}
```

Replace `reorderModules`:

```typescript
async reorderModules(workspaceId: string, dto: ReorderModulesDto) {
  const ids = dto.updates.map((u) => u.id);
  const count = await this.prisma.workspaceModule.count({
    where: { id: { in: ids }, workspace_id: workspaceId },
  });
  if (count !== ids.length) {
    throw new NotFoundException("One or more modules not found in this workspace");
  }

  await this.prisma.$transaction(
    dto.updates.map((update) =>
      this.prisma.workspaceModule.update({
        where: { id: update.id },
        data: {
          position: update.position * POSITION_GAP,
          project_id: update.project_id || null,
        },
      }),
    ),
  );

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("module:reordered", { updates: dto.updates });

  return { success: true };
}
```

- [ ] **Step 4: Fix `updateProject` and `deleteProject`**

These weren't named in the original audit but have the exact same bug — found while editing the adjacent code in this same file, zero-cost to fix alongside it.

Replace `updateProject`:

```typescript
async updateProject(
  workspaceId: string,
  projectId: string,
  dto: { name?: string; position?: number },
) {
  const existing = await this.prisma.workspaceProject.findFirst({
    where: { id: projectId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Project not found");

  const project = await this.prisma.workspaceProject.update({
    where: { id: projectId },
    data: dto,
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("project:updated", { projectId, data: dto });

  return { success: true, data: project };
}
```

Replace `deleteProject` (this also folds in the Low-priority `Promise.all` fix from the audit — `deleteModule` calls were sequential, now parallel):

```typescript
async deleteProject(workspaceId: string, projectId: string) {
  const existing = await this.prisma.workspaceProject.findFirst({
    where: { id: projectId, workspace_id: workspaceId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundException("Project not found");

  const modulesInProject = await this.prisma.workspaceModule.findMany({
    where: { project_id: projectId },
    select: { id: true },
  });

  await Promise.all(modulesInProject.map((mod) => this.deleteModule(workspaceId, mod.id)));

  await this.prisma.workspaceProject.delete({
    where: { id: projectId },
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("project:deleted", { projectId });

  return { success: true };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/backend && npx jest board.service.spec.ts`
Expected: PASS (7 tests total)

- [ ] **Step 6: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/board/board.service.ts apps/backend/src/board/board.service.spec.ts
git commit -m "$(cat <<'EOF'
fix(backend): scope module/project queries to their workspace

Same cross-workspace IDOR class as the board/column/task fix, applied
to modules and projects. Also fixes updateProject/deleteProject, which
had the identical gap but weren't named in the original audit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 3: Fix cross-workspace IDOR on `deleteTask`/`archiveTask` in `workspace.service.ts`

These two methods live in a different file than the rest of the task CRUD (an existing inconsistency, not something to fix here) and have the same unscoped-`findUnique` bug.

**Files:**
- Modify: `apps/backend/src/workspace/workspace.service.ts:531-575` (`deleteTask`, `archiveTask`)

**Interfaces:**
- Consumes: `PrismaService` (existing).
- Produces: no signature changes.

- [ ] **Step 1: Fix `deleteTask` and `archiveTask`**

Replace `deleteTask`:

```typescript
async deleteTask(workspaceId: string, taskId: string) {
  const task = await this.prisma.task.findFirst({
    where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
    include: { column: { select: { board_id: true } } },
  });
  if (!task) throw new NotFoundException("Task not found");

  await this.prisma.task.update({
    where: { id: taskId },
    data: { is_deleted: true },
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:task:deleted", { boardId: task.column.board_id, taskId });

  return { success: true };
}
```

Replace `archiveTask`:

```typescript
async archiveTask(workspaceId: string, taskId: string) {
  const task = await this.prisma.task.findFirst({
    where: { id: taskId, column: { board: { workspace_id: workspaceId } } },
    include: { column: { select: { board_id: true, type: true } } },
  });
  if (!task) throw new NotFoundException("Task not found");

  if (task.column.type !== "COMPLETE") {
    throw new BadRequestException("Task can only be archived from a COMPLETE column");
  }

  const updatedTask = await this.prisma.task.update({
    where: { id: taskId },
    data: { is_archived: true },
  });

  this.statusGateway.server
    .to(`workspace_${workspaceId}`)
    .emit("board:task:updated", {
      boardId: task.column.board_id,
      taskId,
      data: { is_archived: true },
    });

  return { success: true, data: updatedTask };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify**

Start the backend, then:
```
DELETE /workspaces/<your-ws-id>/tasks/<a-real-task-id-from-a-different-workspace>
```
Expected: 404, not 200.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/workspace/workspace.service.ts
git commit -m "$(cat <<'EOF'
fix(backend): scope deleteTask/archiveTask to their workspace

Same cross-workspace IDOR pattern as board.service.ts, found in
workspace.service.ts's own task-deletion/archival methods.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 4: `WorkspaceRolesGuard` reads cached membership instead of re-querying

**Files:**
- Modify: `apps/backend/src/workspace/guards/ws-roles.guard.ts`

**Interfaces:**
- Consumes: `request.member` — set by `IsMemberGuard` (`apps/backend/src/workspace/guards/ws-member.guard.ts:46`), which always runs before `WorkspaceRolesGuard` in every controller's guard stack (`@UseGuards(IsMemberGuard, WorkspaceRolesGuard)`, confirmed in `board.controller.ts` and `workspace.controller.ts`).
- Produces: no change to the guard's public behavior (still throws `ForbiddenException` on insufficient role) — only removes its own redundant Prisma call.

- [ ] **Step 1: Replace the guard**

```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspaceRoleEnum, WorkspaceMember } from "@prisma/client";
import { ROLES_KEY } from "src/workspace/decorators/ws-roles.decorator";

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const member: WorkspaceMember | undefined = request.member;

    if (!member || !requiredRoles.includes(member.role)) {
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(", ")}`);
    }

    return true;
  }
}
```

Note `PrismaService` is no longer injected — this guard now has zero DB dependency, and `canActivate` no longer needs to be `async`.

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors. If any controller applies `WorkspaceRolesGuard` without `IsMemberGuard` running first in its guard stack, `request.member` will be `undefined` and every role-gated request there will 403 — grep to confirm this doesn't happen:

Run: `cd apps/backend && grep -rn "WorkspaceRolesGuard" src --include=*.controller.ts -A1 -B2`
Expected: every match is paired with `IsMemberGuard` earlier in the same `@UseGuards(...)` call or a class-level `@UseGuards(IsMemberGuard)` above it.

- [ ] **Step 3: Manually verify**

Start the backend, hit an endpoint that requires `@RequireWorkspaceRoles` (e.g. `PATCH /workspaces/:workspaceId`) as an OWNER — confirm it still succeeds — and as a MEMBER — confirm it still 403s.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/workspace/guards/ws-roles.guard.ts
git commit -m "$(cat <<'EOF'
perf(backend): stop double-querying workspace membership per request

WorkspaceRolesGuard re-fetched membership from Postgres on every
role-gated request even though IsMemberGuard (which always runs first)
had already fetched and cached it onto request.member.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 5: Fix the N+1 in `getWorkspaceModules`

**Files:**
- Modify: `apps/backend/src/board/board.service.ts` (`getWorkspaceModules`)

**Interfaces:**
- Consumes: `PrismaService` (existing).
- Produces: no signature change. Return shape unchanged (`{ success: true, data: [...] }` with the same per-module `isPinned`/`unreadCount` fields).

- [ ] **Step 1: Replace `getWorkspaceModules`**

```typescript
async getWorkspaceModules(workspaceId: string, userId: string) {
  const modules = await this.prisma.workspaceModule.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { position: "asc" },
    include: {
      pinned_by_users: {
        where: { user_id: userId },
        select: { id: true },
      },
    },
  });

  const chatModules = modules.filter(
    (m) => m.type === ModuleTypeEnum.CHAT && m.reference_id,
  );

  if (chatModules.length === 0) {
    return {
      success: true,
      data: modules.map(({ pinned_by_users, ...m }) => ({
        ...m,
        isPinned: pinned_by_users.length > 0,
      })),
    };
  }

  const roomIds = chatModules.map((m) => m.reference_id);

  const [receipts, unreadCounts] = await Promise.all([
    this.prisma.chatReadReceipt.findMany({
      where: { room_id: { in: roomIds }, user_id: userId },
      select: { room_id: true, last_read_at: true },
    }),
    this.prisma.chatMessage.groupBy({
      by: ["room_id"],
      where: { room_id: { in: roomIds } },
      _count: { _all: true },
    }),
  ]);

  const receiptMap = new Map(receipts.map((r) => [r.room_id, r.last_read_at]));

  const unreadPerRoom = await Promise.all(
    roomIds.map(async (roomId) => {
      const lastReadAt = receiptMap.get(roomId);
      const count = await this.prisma.chatMessage.count({
        where: {
          room_id: roomId,
          ...(lastReadAt ? { created_at: { gt: lastReadAt } } : {}),
        },
      });
      return { room_id: roomId, count };
    }),
  );

  const unreadMap = new Map(unreadPerRoom.map((uc) => [uc.room_id, uc.count]));

  const enrichedModules = modules.map(({ pinned_by_users, ...m }) => {
    const isPinned = pinned_by_users.length > 0;
    if (m.type === ModuleTypeEnum.CHAT && m.reference_id) {
      return {
        ...m,
        isPinned,
        unreadCount: unreadMap.get(m.reference_id) || 0,
      };
    }
    return { ...m, isPinned };
  });

  return { success: true, data: enrichedModules };
}
```

Note: this still issues one `chatMessage.count` per room (needed because each room's "unread" cutoff differs by that room's `last_read_at`), but the read-receipt lookup — previously N sequential `findFirst` calls — is now a single batched `findMany`. If `chatModules.length` is large enough that the remaining per-room counts become the bottleneck, that's a follow-up (a single `raw` query grouping by both `room_id` and a per-row cutoff) — not needed at this codebase's current scale, and out of scope for this fix.

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify**

Start the backend with `PRISMA_LOG_QUERY=true`, load a workspace with at least 2 chat modules in the dashboard, and confirm in the backend log that `GET /workspaces/:id/modules` now issues one `chatReadReceipt` query total instead of one per chat room.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/board/board.service.ts
git commit -m "$(cat <<'EOF'
perf(backend): batch read-receipt lookups in getWorkspaceModules

Replaced N sequential chatReadReceipt.findFirst calls (one per chat
room) with a single batched findMany. This is the endpoint that showed
up directly in the original slow-dashboard-load network trace.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 6: Fix the task-position race under concurrent create/move

**Files:**
- Modify: `apps/backend/src/redis/cache.service.ts` (add `acquireLock`/`releaseLock`)
- Modify: `apps/backend/src/board/board.service.ts` (`createTask`, `moveTask`)

**Interfaces:**
- Produces: `CacheService.acquireLock(key: string, ttlSeconds: number): Promise<boolean>` and `CacheService.releaseLock(key: string): Promise<void>` — new methods, used by `BoardService` in this task and available for any future caller needing short-lived mutual exclusion.

- [ ] **Step 1: Add lock methods to `CacheService`**

Add to `apps/backend/src/redis/cache.service.ts`, alongside the other public methods:

```typescript
async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const result = await this.redis.set(key, "1", "EX", ttlSeconds, "NX");
    return result === "OK";
  } catch (error) {
    this.logger.warn(`Cache acquireLock error for key ${key}: ${error}`);
    return false;
  }
}

async releaseLock(key: string): Promise<void> {
  await this.del(key);
}
```

- [ ] **Step 2: Guard `createTask`'s position computation with a lock**

In `board.service.ts`, add `ConflictException` to the existing `@nestjs/common` import, then wrap the position-read/write section of `createTask` (the version from Task 1):

```typescript
import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
```

```typescript
async createTask(
  workspaceId: string,
  boardId: string,
  dto: CreateTaskDto,
  userId: string,
) {
  const targetColumn = await this.prisma.boardColumn.findFirst({
    where: { id: dto.column_id, board: { id: boardId, workspace_id: workspaceId } },
    select: { type: true },
  });
  if (!targetColumn) {
    throw new NotFoundException("Column not found on this board");
  }

  const lockKey = `lock:column:${dto.column_id}:position`;
  const acquired = await this.cache.acquireLock(lockKey, 5);
  if (!acquired) {
    throw new ConflictException("This column is busy, please try again");
  }

  try {
    const lastTask = await this.prisma.task.findFirst({
      where: { column_id: dto.column_id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = (lastTask?.position ?? 0) + POSITION_GAP;

    const updatedWorkspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { taskSequenceCounter: { increment: 1 } },
      select: { workspaceKey: true, taskSequenceCounter: true },
    });

    const shortId = `${updatedWorkspace.workspaceKey}-${updatedWorkspace.taskSequenceCounter}`;

    const in_progress_at = targetColumn.type === "ONGOING" ? new Date() : null;
    const completed_at = targetColumn.type === "COMPLETE" ? new Date() : null;

    const task = await this.prisma.task.create({
      data: {
        column_id: dto.column_id,
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

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:task:created", { boardId, task });

    return { success: true, data: task };
  } finally {
    await this.cache.releaseLock(lockKey);
  }
}
```

- [ ] **Step 3: Guard `moveTask`'s position computation with a lock**

Wrap the target-column section of `moveTask` (the version from Task 1) from the `tasksInTarget` read through the `$transaction`:

```typescript
async moveTask(
  workspaceId: string,
  boardId: string,
  taskId: string,
  dto: MoveTaskDto,
  userId: string,
) {
  const task = await this.prisma.task.findFirst({
    where: { id: taskId, column: { board: { id: boardId, workspace_id: workspaceId } } },
    select: { column_id: true, in_progress_at: true, completed_at: true },
  });

  if (!task) throw new NotFoundException("Task not found");

  const fromColumnId = task.column_id;

  const columns = await this.prisma.boardColumn.findMany({
    where: { id: { in: [fromColumnId, dto.column_id] }, board_id: boardId },
    select: { id: true, type: true },
  });

  const targetColumn = columns.find((c) => c.id === dto.column_id);
  if (!targetColumn) {
    throw new NotFoundException("Target column not found on this board");
  }
  const sourceColumn = columns.find((c) => c.id === fromColumnId);

  let in_progress_at = task.in_progress_at;
  let completed_at = task.completed_at;

  if (targetColumn.type === "ONGOING" && !in_progress_at) {
    in_progress_at = new Date();
  }
  if (targetColumn.type === "COMPLETE") {
    completed_at = new Date();
  }
  if (
    sourceColumn?.type === "COMPLETE" &&
    (targetColumn.type === "ONGOING" || targetColumn.type === "UPCOMING")
  ) {
    completed_at = null;
  }

  const lockKey = `lock:column:${dto.column_id}:position`;
  const acquired = await this.cache.acquireLock(lockKey, 5);
  if (!acquired) {
    throw new ConflictException("This column is busy, please try again");
  }

  try {
    const tasksInTarget = await this.prisma.task.findMany({
      where: { column_id: dto.column_id, is_deleted: false, is_archived: false },
      orderBy: { position: "asc" },
      select: { id: true },
    });

    const filtered = tasksInTarget.filter((t) => t.id !== taskId);
    filtered.splice(dto.position, 0, { id: taskId });

    await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: {
          column_id: dto.column_id,
          in_progress_at,
          completed_at,
        },
      }),
      ...filtered.map((t, index) =>
        this.prisma.task.update({
          where: { id: t.id },
          data: { position: (index + 1) * POSITION_GAP },
        }),
      ),
    ]);

    this.statusGateway.server
      .to(`workspace_${workspaceId}`)
      .emit("board:task:moved", {
        boardId,
        taskId,
        fromColumnId,
        toColumnId: dto.column_id,
        position: dto.position,
        userId,
      });

    return { success: true };
  } finally {
    await this.cache.releaseLock(lockKey);
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify**

Start the backend, create two tasks in rapid succession in the same column from two browser tabs (or two curl calls fired back-to-back) — confirm both get distinct positions and the board renders both in a stable order with no duplicate-position glitches.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/redis/cache.service.ts apps/backend/src/board/board.service.ts
git commit -m "$(cat <<'EOF'
fix(backend): prevent duplicate task positions under concurrent writes

createTask and moveTask both read a column's current max position then
wrote a new one with no lock in between, so two near-simultaneous
requests could compute and write colliding positions. Added a short
Redis lock (CacheService.acquireLock/releaseLock) around the
read-then-write section of both.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

## Pass 2 — Realtime (sockets + queues)

### Task 7: Add membership check to `sub_ws`

**Files:**
- Modify: `apps/backend/src/status/status.gateway.ts` (`handleSubscribeWorkspace`)
- Test: `apps/backend/src/status/status.gateway.spec.ts` (new)

**Interfaces:**
- Consumes: `PrismaService` (already injected in `StatusGateway`).
- Produces: no signature change to `handleSubscribeWorkspace` — same socket event name and payload shape, just rejects non-members before joining the room.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/status/status.gateway.spec.ts`:

```typescript
import { StatusGateway } from "./status.gateway";

function makeGateway() {
  const prisma = {
    workspaceMember: { findUnique: jest.fn(), findMany: jest.fn() },
  } as any;
  const gateway = new StatusGateway({} as any, prisma);
  return { gateway, prisma };
}

describe("StatusGateway.handleSubscribeWorkspace", () => {
  it("rejects a socket whose user is not a member of the workspace", async () => {
    const { gateway, prisma } = makeGateway();
    prisma.workspaceMember.findUnique.mockResolvedValue(null);

    const join = jest.fn();
    const emit = jest.fn();
    const client = { data: { userId: "user-1" }, join, emit } as any;

    await gateway.handleSubscribeWorkspace(client, "ws-not-a-member-of");

    expect(join).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: expect.any(String) }));
  });

  it("joins the room when the user is a member", async () => {
    const { gateway, prisma } = makeGateway();
    prisma.workspaceMember.findUnique.mockResolvedValue({ user_id: "user-1", workspace_id: "ws-1" });
    prisma.workspaceMember.findMany.mockResolvedValue([]);

    const join = jest.fn();
    const emit = jest.fn();
    (gateway as any).server = { in: () => ({ fetchSockets: async () => [] }) };
    const client = { data: { userId: "user-1" }, join, emit } as any;

    await gateway.handleSubscribeWorkspace(client, "ws-1");

    expect(join).toHaveBeenCalledWith("workspace_ws-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest status.gateway.spec.ts`
Expected: FAIL — current `handleSubscribeWorkspace` joins the room unconditionally, so `join` is called even for a non-member.

- [ ] **Step 3: Fix `handleSubscribeWorkspace`**

```typescript
@SubscribeMessage("sub_ws")
async handleSubscribeWorkspace(client: Socket, workspaceId: string) {
  const userId = client.data.userId;
  if (!userId) return;

  const member = await this.prisma.workspaceMember.findUnique({
    where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
  });

  if (!member) {
    client.emit("error", { message: "Not a workspace member" });
    return;
  }

  await client.join(`workspace_${workspaceId}`);

  const members = await this.prisma.workspaceMember.findMany({
    where: { workspace_id: workspaceId },
    select: { user_id: true, user: { select: { status_preference: true } } },
  });

  const activeSockets = await this.server.in(`workspace_${workspaceId}`).fetchSockets();
  const activeUserIds = new Set(activeSockets.map(s => s.data.userId).filter(Boolean));

  const statuses: Record<string, string> = {};

  for (const m of members) {
    if (activeUserIds.has(m.user_id)) {
      statuses[m.user_id] = m.user.status_preference;
    }
  }

  client.emit("ws_statuses", statuses);

  return { event: "joined_ws", data: workspaceId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest status.gateway.spec.ts`
Expected: PASS

- [ ] **Step 5: Typecheck and manually verify**

Run: `cd apps/backend && npx tsc --noEmit`

Manually: connect to the `/status` namespace as a user who is NOT a member of some workspace X, emit `sub_ws` with X's id, confirm you receive an `error` event and never get `ws_statuses` or that workspace's `status:update` broadcasts.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/status/status.gateway.ts apps/backend/src/status/status.gateway.spec.ts
git commit -m "$(cat <<'EOF'
fix(backend): require workspace membership to subscribe to its status room

Any authenticated socket could call sub_ws with any workspaceId and
silently receive that workspace's member statuses plus every future
status/chat-unread/mention broadcast, with no membership check.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 8: Add retry/backoff to chat and email queues, emit `message_failed` on final failure

**Files:**
- Modify: `apps/backend/src/chat/chat.module.ts`
- Modify: `apps/backend/src/email/email.module.ts`
- Modify: `apps/backend/src/chat/chat.processor.ts`

**Interfaces:**
- Produces: `ChatProcessor` now emits a `message_failed` event (payload `{ roomId: string, preGeneratedId: string }`) to room `chat_${roomId}` when a persist job exhausts all retry attempts. Frontend consumption of this event is not part of this plan (no task currently listens for it) — flagged as a natural frontend follow-up, out of scope here since the spec only calls for the backend not silently losing the message.

- [ ] **Step 1: Add `defaultJobOptions` to both queues**

In `chat.module.ts`, replace the `BullModule.registerQueue` call:

```typescript
BullModule.registerQueue({
  name: "chat_messages",
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
}),
```

In `email.module.ts`, replace the `BullModule.registerQueue` call:

```typescript
BullModule.registerQueue({
  name: "email",
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
}),
```

- [ ] **Step 2: Emit `message_failed` when a chat-persist job exhausts retries**

Replace `chat.processor.ts` in full (this also removes the dead no-op `Process` decorator flagged separately in the audit — the real dispatch is the `switch` in `process()`, the decorator did nothing):

```typescript
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ChatService } from "src/chat/chat.service";
import { ChatGateway } from "src/chat/chat.gateway";
import { SendMessageDto } from "src/chat/dto/chat.dto";

interface PersistMessageJobData {
  workspaceId: string;
  roomId: string;
  senderId: string;
  dto: SendMessageDto;
  preGeneratedId: string;
}

@Processor("chat_messages")
@Injectable()
export class ChatProcessor extends WorkerHost {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<PersistMessageJobData, unknown, string>): Promise<unknown> {
    switch (job.name) {
      case "persist_message":
        return this.persistMessage(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async persistMessage(job: Job<PersistMessageJobData, unknown, string>): Promise<void> {
    const { workspaceId, roomId, senderId, dto, preGeneratedId } = job.data;
    await this.chatService
      .createMessage(workspaceId, roomId, senderId, dto, preGeneratedId)
      .catch((error) => {
        this.logger.error(
          `Failed to persist message in room ${roomId}: ${error.message}`,
          error.stack,
        );
        throw error;
      });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<PersistMessageJobData, unknown, string>) {
    if (job.name !== "persist_message") return;

    const attemptsMax = job.opts.attempts ?? 1;
    if (job.attemptsMade < attemptsMax) return;

    this.chatGateway.server.to(`chat_${job.data.roomId}`).emit("message_failed", {
      roomId: job.data.roomId,
      preGeneratedId: job.data.preGeneratedId,
    });
  }
}
```

- [ ] **Step 3: Wire `ChatGateway` into `ChatProcessor`'s providers**

`chat.module.ts` already lists both `ChatGateway` and `ChatProcessor` as providers in the same module (`providers: [ChatService, ChatGateway, ChatProcessor, Logger]`) — Nest resolves the new constructor dependency automatically, no module change needed beyond Step 1's `registerQueue` edit.

- [ ] **Step 4: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify**

Stop the local Postgres service, send a chat message through the UI (it will show as sent optimistically), wait ~7 seconds (three attempts with exponential backoff), confirm the backend log shows three failed attempts and a `message_failed` event was emitted (log it temporarily with `this.logger.warn` if you want to see it directly, or check via a socket debug client). Restart Postgres afterward.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/chat/chat.module.ts apps/backend/src/email/email.module.ts apps/backend/src/chat/chat.processor.ts
git commit -m "$(cat <<'EOF'
fix(backend): retry chat/email jobs on failure instead of dropping them

Both queues had no defaultJobOptions, so BullMQ's default of 1 attempt
meant any transient DB/SMTP failure silently dropped the job forever.
Chat is worse: the message is broadcast live before persistence
succeeds, so it looked sent and then vanished on refresh with no
error. Added 3-attempt exponential backoff to both queues, and a
message_failed socket event on final chat-persist failure.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 9: Realtime hardening cleanup (CORS, input validation, cookie parsing)

Bundled because none of these need a dedicated test (Medium/Low severity, no security-critical regression risk) and they're all small same-shape edits to the same two gateway files.

**Files:**
- Create: `apps/backend/src/common/utils/socket-cors.util.ts`
- Modify: `apps/backend/src/chat/chat.gateway.ts` (CORS option, `extractToken`)
- Modify: `apps/backend/src/status/status.gateway.ts` (CORS option, `handleUpdateStatus`, `extractToken`)
- Modify: `apps/backend/package.json` (add `cookie` dependency)

**Interfaces:**
- Produces: `createSocketCorsOrigin(): (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void` — a factory returning a Socket.IO-compatible CORS origin handler, consumed by both gateways' `@WebSocketGateway({ cors: {...} })` decorator config.

- [ ] **Step 1: Add the `cookie` package**

Run: `cd apps/backend && pnpm add cookie`

(Modern `cookie` versions ship their own TypeScript types — no separate `@types/cookie` needed. If `npx tsc --noEmit` in Step 6 complains about missing types for `"cookie"`, then run `pnpm add -D @types/cookie` and retry.)

- [ ] **Step 2: Create the shared CORS origin util**

Create `apps/backend/src/common/utils/socket-cors.util.ts`:

```typescript
export function createSocketCorsOrigin() {
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);

    const allowed = (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);

    callback(null, allowed.includes(origin));
  };
}
```

This reads `process.env.CORS_ORIGIN` inside the callback body (evaluated per-connection, at runtime) rather than at module-load time, so it works correctly regardless of import order relative to `ConfigModule`'s `.env` loading — the same env var `main.ts` already validates and exits on if missing (`main.ts:29-34`).

- [ ] **Step 3: Wire it into both gateways' CORS config**

In `chat.gateway.ts`, add the import and replace the decorator:

```typescript
import { createSocketCorsOrigin } from "src/common/utils/socket-cors.util";
```

```typescript
@WebSocketGateway({
  cors: { origin: createSocketCorsOrigin(), methods: ["GET", "POST"], credentials: true },
  namespace: "chat",
})
```

In `status.gateway.ts`, add the same import and replace the decorator:

```typescript
import { createSocketCorsOrigin } from "src/common/utils/socket-cors.util";
```

```typescript
@WebSocketGateway({
  cors: { origin: createSocketCorsOrigin(), methods: ["GET", "POST"], credentials: true },
  namespace: "status",
})
```

- [ ] **Step 4: Validate `update_status` input and add error handling**

In `status.gateway.ts`, replace `handleUpdateStatus`:

```typescript
@SubscribeMessage("update_status")
async handleUpdateStatus(client: Socket, status: UserStatus) {
  const userId = client.data.userId;
  if (!userId) return;

  if (!Object.values(UserStatus).includes(status)) {
    client.emit("error", { message: "Invalid status" });
    return;
  }

  try {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status_preference: status },
    });

    await this.broadcastUserStatus(userId, status);
  } catch (error) {
    this.logger.error(`Update status error: ${error}`);
    client.emit("error", { message: "Failed to update status" });
  }
}
```

- [ ] **Step 5: Swap hand-rolled cookie parsing for the `cookie` package**

In `chat.gateway.ts`, add the import and replace `extractToken`:

```typescript
import { parse } from "cookie";
```

```typescript
private extractToken(client: Socket): string | null {
  if (client.handshake.auth?.token) {
    return client.handshake.auth.token;
  }
  if (client.handshake.headers?.authorization) {
    return client.handshake.headers.authorization.replace("Bearer ", "");
  }

  const cookieString = client.handshake.headers.cookie;
  if (!cookieString) return null;

  return parse(cookieString)["crw-at"] || null;
}
```

In `status.gateway.ts`, add the same import and replace `extractToken`:

```typescript
import { parse } from "cookie";
```

```typescript
private extractToken(client: Socket): string | null {
  if (client.handshake.auth?.token) {
    return client.handshake.auth.token;
  }
  if (client.handshake.headers?.authorization) {
    return client.handshake.headers.authorization.replace("Bearer ", "");
  }

  const cookieString = client.handshake.headers.cookie;
  if (!cookieString) return null;

  return parse(cookieString)["crw-at"] || null;
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manually verify**

Start the backend and dash frontend, confirm chat and status sockets still connect and function normally (send a message, change your status). Then confirm a connection from a disallowed origin is rejected: open the browser console on a page NOT in `CORS_ORIGIN` and attempt `io("http://localhost:8080/status", { withCredentials: true })` — the handshake should fail.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/common/utils/socket-cors.util.ts apps/backend/src/chat/chat.gateway.ts apps/backend/src/status/status.gateway.ts apps/backend/package.json apps/backend/pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
fix(backend): realtime hardening — CORS allowlist, status validation, cookie parsing

Both gateways hardcoded cors: origin "*", bypassing the CORS_ORIGIN
allowlist main.ts enforces for HTTP. update_status took an unvalidated
enum with no try/catch, unlike every sibling handler. Both gateways
hand-rolled cookie parsing instead of using the already-adjacent
cookie-parser's own dependency.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 10: Re-validate session on connect, add per-socket rate limiting

**Files:**
- Modify: `apps/backend/src/chat/chat.module.ts` (import `SessionModule`)
- Modify: `apps/backend/src/status/status.module.ts` (import `SessionModule`)
- Modify: `apps/backend/src/chat/chat.gateway.ts` (`handleConnection`, `handleDisconnect`, `handleSendMessage`)
- Modify: `apps/backend/src/status/status.gateway.ts` (`handleConnection`, `handleDisconnect`)

**Interfaces:**
- Consumes: `SessionService.findOne(sessionId: string): Promise<SessionPublic>` (existing, throws `NotFoundException` if the session row is gone; `session.revoked_at`/`session.expires_at` already on `SessionPublic`).
- Produces: no new public methods — both gateways gain an internal periodic re-check per connected socket, cleared on disconnect.

- [ ] **Step 1: Import `SessionModule` into both realtime modules**

In `chat.module.ts`, add to `imports`:

```typescript
import { SessionModule } from "src/session/session.module";
```

```typescript
imports: [
  PrismaModule,
  StatusModule,
  SessionModule,
  JwtModule.registerAsync({ /* unchanged */ }),
  BullModule.registerQueue({ /* unchanged from Task 8 */ }),
],
```

In `status.module.ts`, add to `imports`:

```typescript
import { SessionModule } from "src/session/session.module";
```

```typescript
imports: [
  SessionModule,
  JwtModule.registerAsync({ /* unchanged */ }),
],
```

- [ ] **Step 2: Check session validity at connect and periodically, in `status.gateway.ts`**

Add `SessionService` to the constructor and replace `handleConnection`/`handleDisconnect`:

```typescript
import { SessionService } from "src/session/session.service";
```

```typescript
constructor(
  private readonly jwtService: JwtService,
  private readonly prisma: PrismaService,
  private readonly sessionService: SessionService,
) {}

async handleConnection(client: Socket) {
  try {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect();
      return;
    }

    const payload = this.jwtService.verify(token);
    const session = await this.sessionService.findOne(payload.jti).catch(() => null);
    if (!session || session.revoked_at || (session.expires_at && session.expires_at < new Date())) {
      client.disconnect();
      return;
    }

    const userId = payload.sub;
    client.data.userId = userId;
    client.data.sessionId = payload.jti;

    const userRoom = `user_${userId}`;
    await client.join(userRoom);

    const sockets = await this.server.in(userRoom).fetchSockets();
    const count = sockets.length;

    if (count === 1) await this.broadcastUserStatus(userId, "ONLINE");

    client.data.revocationCheck = setInterval(async () => {
      const current = await this.sessionService.findOne(payload.jti).catch(() => null);
      if (!current || current.revoked_at) {
        client.disconnect();
      }
    }, 60_000);

    this.logger.debug(`Client connected: ${client.id} (User: ${userId}, Count: ${count})`);
  } catch (error) {
    this.logger.error(`Error during client connection: ${error}`);
    client.disconnect();
  }
}

async handleDisconnect(client: Socket) {
  clearInterval(client.data.revocationCheck);

  const userId = client.data.userId;
  if (!userId) return;

  const userRoom = `user_${userId}`;

  const sockets = await this.server.in(userRoom).fetchSockets();
  const count = sockets.length;

  if (count === 0) {
    await this.broadcastUserStatus(userId, "OFFLINE");
  }

  this.logger.debug(`Client disconnected: ${client.id} (User: ${userId}, Remaining: ${count})`);
}
```

- [ ] **Step 3: Same check in `chat.gateway.ts`, plus a rate limit on `send_message`**

Add `SessionService` and `CacheService` to the constructor and update `handleConnection`/`handleDisconnect`/`handleSendMessage`:

```typescript
import { SessionService } from "src/session/session.service";
import { CacheService } from "src/redis";
```

```typescript
constructor(
  private readonly jwtService: JwtService,
  private readonly prisma: PrismaService,
  private readonly chatService: ChatService,
  private readonly statusGateway: StatusGateway,
  private readonly sessionService: SessionService,
  private readonly cache: CacheService,
  @InjectQueue("chat_messages") private readonly messageQueue: Queue,
) {}

async handleConnection(client: Socket) {
  try {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect();
      return;
    }

    const payload = this.jwtService.verify(token);
    const session = await this.sessionService.findOne(payload.jti).catch(() => null);
    if (!session || session.revoked_at || (session.expires_at && session.expires_at < new Date())) {
      client.disconnect();
      return;
    }

    client.data.userId = payload.sub;
    client.data.sessionId = payload.jti;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, firstname: true, lastname: true, avatar_key: true },
    });
    client.data.user = user;

    client.data.revocationCheck = setInterval(async () => {
      const current = await this.sessionService.findOne(payload.jti).catch(() => null);
      if (!current || current.revoked_at) {
        client.disconnect();
      }
    }, 60_000);

    this.logger.debug(`Chat client connected: ${client.id} (User: ${payload.sub})`);
  } catch (error) {
    this.logger.error(`Chat connection error: ${error}`);
    client.disconnect();
  }
}

async handleDisconnect(client: Socket) {
  clearInterval(client.data.revocationCheck);
  this.logger.debug(`Chat client disconnected: ${client.id}`);
}
```

Add a rate-limit check at the top of `handleSendMessage` (right after the existing `if (!userId || !roomId || !workspaceId)` guard):

```typescript
@SubscribeMessage("send_message")
async handleSendMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() dto: SendMessageDto,
) {
  const userId = client.data.userId;
  const roomId = client.data.currentRoom;
  const workspaceId = client.data.workspaceId;

  if (!userId || !roomId || !workspaceId) {
    client.emit("error", { message: "Not in a room" });
    return;
  }

  const rateLimitKey = `ratelimit:send_message:${userId}`;
  const withinLimit = await this.cache.acquireLock(rateLimitKey, 1);
  if (!withinLimit) {
    client.emit("error", { message: "You're sending messages too fast" });
    return;
  }

  try {
    /* ...rest of the existing method body, unchanged... */
```

This caps a single user to one `send_message` per second per socket connection — `acquireLock`'s `SET ... NX EX` (added in Task 6) doubles as a cheap fixed-window rate limiter here: the first call in a given second acquires and proceeds, subsequent calls within that second fail to acquire and are rejected, and the key self-expires after 1 second with no cleanup needed.

- [ ] **Step 4: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify**

Start the backend, connect a chat socket, revoke that session from another tab (log out, or call the revoke-all-sessions endpoint if one exists), wait up to 60 seconds, confirm the socket disconnects. Separately, send `send_message` twice within the same second and confirm the second gets a rate-limit `error` event.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/chat/chat.module.ts apps/backend/src/status/status.module.ts apps/backend/src/chat/chat.gateway.ts apps/backend/src/status/status.gateway.ts
git commit -m "$(cat <<'EOF'
fix(backend): re-validate socket sessions periodically, rate-limit send_message

Gateways verified only the JWT's signature/expiry at connect and never
again — a revoked session kept live realtime access indefinitely.
Added a session-revocation check at connect and every 60s thereafter
on both gateways, plus a 1/sec per-user rate limit on send_message
(HTTP routes already get per-endpoint throttling; sockets had none).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

## Pass 3 — Workspace cache correctness

### Task 11: Fix cache invalidation gaps in `workspace.service.ts`

**Files:**
- Modify: `apps/backend/src/workspace/workspace.service.ts` (`update`, `remove`, `updateMemberRole`, `transferOwnership`)

**Interfaces:**
- Consumes: `CacheKeys.workspaceSlug(slug: string)` (already exists, `cache-keys.ts:7`, currently unused anywhere), `invMembershipCaches(workspaceId, userId)` (existing private helper, `workspace.service.ts:17-23`).
- Produces: no signature changes.

- [ ] **Step 1: Invalidate the slug cache on rename and delete**

Replace `update`:

```typescript
async update(id: string, dto: UpdateWorkspaceDto) {
  const existing = await this.prisma.workspace.findUnique({ where: { id }, select: { slug: true } });
  const result = await this.prisma.workspace.update({ where: { id }, data: dto });

  await this.cache.del(CacheKeys.workspace(id));
  if (existing?.slug) {
    await this.cache.del(CacheKeys.workspaceSlug(existing.slug));
  }
  if (dto.slug && dto.slug !== existing?.slug) {
    await this.cache.del(CacheKeys.workspaceSlug(dto.slug));
  }

  return result;
}
```

Replace `remove`:

```typescript
async remove(id: string) {
  const [existing, members] = await Promise.all([
    this.prisma.workspace.findUnique({ where: { id }, select: { slug: true } }),
    this.prisma.workspaceMember.findMany({
      where: { workspace_id: id },
      select: { user_id: true },
    }),
  ]);

  const result = await this.prisma.workspace.delete({ where: { id } });

  const cacheKeys = [
    CacheKeys.workspace(id),
    ...(existing?.slug ? [CacheKeys.workspaceSlug(existing.slug)] : []),
    ...members.flatMap((m) => [
      CacheKeys.workspaceMember(id, m.user_id),
      CacheKeys.userWorkspaces(m.user_id),
    ]),
  ];
  await this.cache.del(cacheKeys);

  return result;
}
```

- [ ] **Step 2: Fully invalidate the embedded workspace object on role change and ownership transfer**

`findOne`/`findBySlug` cache the whole workspace object with an embedded `members` array (including roles) — `cache.del(CacheKeys.workspaceMember(...))` alone leaves that stale for up to 10 minutes. Replace `updateMemberRole`'s cache line:

```typescript
async updateMemberRole(workspaceId: string, memberId: string, newRole: WorkspaceRoleEnum) {
  if (newRole === WorkspaceRoleEnum.OWNER) {
    throw new BadRequestException("Cannot manually assign OWNER role. Use 'Transfer Ownership' instead.");
  }

  const member = await this.prisma.workspaceMember.findUnique({
    where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: memberId } },
  });

  if (!member) throw new NotFoundException("User is not a member of this workspace");

  if (member.role === WorkspaceRoleEnum.OWNER) {
    throw new BadRequestException("Cannot change the role of the workspace owner");
  }

  const result = await this.prisma.workspaceMember.update({
    where: { id: member.id },
    data: { role: newRole },
  });

  await this.invMembershipCaches(workspaceId, memberId);

  return result;
}
```

Replace `transferOwnership`'s cache lines:

```typescript
async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string) {
  const newOwnerMember = await this.prisma.workspaceMember.findUnique({
    where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: newOwnerId } },
  });

  if (!newOwnerMember) throw new NotFoundException("New owner must be a member of the workspace");

  const currentOwnerMember = await this.prisma.workspaceMember.findUnique({
    where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: currentOwnerId } },
  });

  if (!currentOwnerMember || currentOwnerMember.role !== WorkspaceRoleEnum.OWNER) {
    throw new BadRequestException("Only the current owner can transfer ownership");
  }

  await this.prisma.$transaction(async (tx) => {
    await tx.workspaceMember.update({
      where: { id: currentOwnerMember.id },
      data: { role: WorkspaceRoleEnum.ADMIN },
    });

    await tx.workspaceMember.update({
      where: { id: newOwnerMember.id },
      data: { role: WorkspaceRoleEnum.OWNER },
    });
  });

  await Promise.all([
    this.invMembershipCaches(workspaceId, currentOwnerId),
    this.invMembershipCaches(workspaceId, newOwnerId),
  ]);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify**

Start the backend. Rename a workspace via `PATCH /workspaces/:id` with a new `slug`, then immediately `GET /workspaces/slug/<old-slug>` — expect 404 (or the old cached copy gone) rather than the stale pre-rename data. Then change a member's role via `PATCH /workspaces/:id/members/:userId/role`, immediately `GET /workspaces/:id` — expect the returned `members` array to reflect the new role, not the cached pre-change one.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/workspace/workspace.service.ts
git commit -m "$(cat <<'EOF'
fix(backend): invalidate workspace slug and embedded-member caches correctly

findBySlug cached the whole workspace object under a workspace:slug:*
key that update()/remove() never invalidated — renaming or deleting a
workspace kept serving the stale copy for up to 10 minutes on every
edit. updateMemberRole/transferOwnership only invalidated the narrow
workspaceMember key, leaving the embedded members array on the cached
workspace object (used by findOne/findBySlug) stale too.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

## Pass 4 — Auth/session

### Task 12: Enforce `role_version` on every authenticated request

**Files:**
- Modify: `apps/backend/src/auth/jwt.strategy.ts`
- Test: `apps/backend/src/auth/jwt.strategy.spec.ts` (new)

**Interfaces:**
- Consumes: `UserService.findOne(id: string): Promise<UserPublic>` (existing, cached, `UserPublic` includes `role_version` per `apps/backend/src/prisma/selects.ts:12`).
- Produces: `JwtStrategy` constructor now also takes `UserService` — Nest resolves this automatically since `AuthModule` already provides/imports it (confirmed: `AuthService` already injects `UserService`).

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/auth/jwt.strategy.spec.ts`:

```typescript
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";

function makeStrategy() {
  const config = { get: jest.fn().mockReturnValue("test-secret") } as any;
  const sessionService = {
    findOne: jest.fn().mockResolvedValue({ revoked_at: null, expires_at: null }),
  } as any;
  const userService = { findOne: jest.fn() } as any;
  const strategy = new JwtStrategy(config, sessionService, userService);
  return { strategy, userService };
}

describe("JwtStrategy.validate", () => {
  it("rejects a token whose role_version is behind the user's current role_version", async () => {
    const { strategy, userService } = makeStrategy();
    userService.findOne.mockResolvedValue({ id: "user-1", role_version: 2 });

    await expect(
      strategy.validate({ sub: "user-1", jti: "session-1", email: "a@b.com", role: "USER", rver: 1 } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("accepts a token whose role_version matches", async () => {
    const { strategy, userService } = makeStrategy();
    userService.findOne.mockResolvedValue({ id: "user-1", role_version: 1 });

    const result = await strategy.validate({
      sub: "user-1",
      jti: "session-1",
      email: "a@b.com",
      role: "USER",
      rver: 1,
    } as any);

    expect(result.userId).toBe("user-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest jwt.strategy.spec.ts`
Expected: FAIL — `JwtStrategy`'s constructor doesn't accept a third `userService` argument yet, and `validate` never checks `role_version`.

- [ ] **Step 3: Fix `JwtStrategy`**

```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { JwtPayload } from "@crwsync/types"
import { SessionService } from "src/session/session.service";
import { UserService } from "src/user/user.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.["crw-at"] || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_TOKEN_SECRET")!,
    });
  }

  async validate(payload: JwtPayload) {
    const sessionId = payload.jti;
    if (!sessionId) {
      throw new UnauthorizedException("Missing session id");
    }

    const session = await this.sessionService.findOne(sessionId);
    if (session.revoked_at || (session.expires_at && session.expires_at < new Date())) {
      throw new UnauthorizedException("Session invalid or expired");
    }

    const user = await this.userService.findOne(payload.sub);
    if (user.role_version !== payload.rver) {
      throw new UnauthorizedException("Role has changed, please sign in again");
    }

    return { userId: payload.sub, sessionId, email: payload.email, role: payload.role, roleVersion: payload.rver };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest jwt.strategy.spec.ts`
Expected: PASS

- [ ] **Step 5: Typecheck and manually verify**

Run: `cd apps/backend && npx tsc --noEmit`

Manually: log in, change your own role in the DB directly (or via an admin action if one exists) without logging out, make any authenticated request within the access token's 15-minute lifetime — confirm it now 401s instead of succeeding with the stale role.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/auth/jwt.strategy.ts apps/backend/src/auth/jwt.strategy.spec.ts
git commit -m "$(cat <<'EOF'
fix(backend): enforce role_version check on every authenticated request

The JWT payload carried role_version (rver) and the user row tracked
its own role_version, but nothing ever compared them — a demoted or
deactivated user kept their old permissions for the full remaining
15-minute life of their access token with no way to cut it short.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 13: Atomic refresh-token rotation, scope the refresh cookie's path

**Files:**
- Modify: `apps/backend/src/session/session.service.ts` (`rotate`)
- Modify: `apps/backend/src/auth/auth.cookie.ts` (`setAuthCookies`)

**Interfaces:**
- Produces: no signature changes to `rotate` or `setAuthCookies`.

- [ ] **Step 1: Make the rotation claim atomic**

Replace `rotate`:

```typescript
async rotate(dto: RotateSessionDto, req: Request): Promise<{ session: SessionPublic; refreshToken: string }> {
  const oldHashedToken = createHash("sha256").update(dto.old_token).digest("hex");
  const oldSession = await this.prisma.session.findFirst({
    where: { user_id: dto.user_id, refresh_token_hash: oldHashedToken },
    select: { id: true, expires_at: true, revoked_at: true },
  });
  if (!oldSession) {
    throw new NotFoundException("Old session not found");
  }
  if (oldSession.expires_at && oldSession.expires_at < new Date()) {
    throw new BadRequestException("Old session has expired");
  }

  const claimed = await this.prisma.session.updateMany({
    where: { id: oldSession.id, revoked_at: null },
    data: { revoked_at: new Date() },
  });
  if (claimed.count === 0) {
    throw new BadRequestException("Old session has already been rotated");
  }
  await this.cache.del(CacheKeys.session(oldSession.id));

  const { session: newSession, token: refreshToken } = await this.create(
    { id: randomUUID(), user_id: dto.user_id, persistent: dto.persistent },
    req,
  );

  return { session: newSession, refreshToken };
}
```

This removes the old separate `if (oldSession.revoked_at)` check (superseded — the atomic `updateMany` now IS that check) and moves session creation to *after* the claim succeeds, so a losing concurrent request can never mint a duplicate new session from the same old token.

- [ ] **Step 2: Scope the refresh cookie to its own endpoint**

Replace `setAuthCookies`:

```typescript
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  persistent?: boolean,
) {
  const accessMaxAge = 15 * 60 * 1000;
  const refreshMaxAge = persistent
    ? 30 * 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  res.cookie("crw-at", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
    domain: accessCookieDomain,
  });

  res.cookie("crw-rt", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/auth",
    maxAge: refreshMaxAge,
    domain: refreshCookieDomain,
  });
}
```

Check where `crw-rt` is read server-side before finalizing the path — grep first:

Run: `cd apps/backend && grep -rn '"crw-rt"' src`

If any route reading `crw-rt` lives outside `/auth/*` (e.g. a signout endpoint at a different path), widen `path` to cover it, or move that route under `/auth`. Do not narrow further than what the grep shows is actually needed.

- [ ] **Step 3: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify**

Start the backend and dash frontend, log in, refresh the page a few times (exercises the refresh-token flow), confirm you stay logged in normally. Then open browser devtools → Application → Cookies, confirm `crw-rt`'s Path column now shows `/auth` instead of `/`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/session/session.service.ts apps/backend/src/auth/auth.cookie.ts
git commit -m "$(cat <<'EOF'
fix(backend): make refresh-token rotation atomic, scope refresh cookie path

Two concurrent requests replaying the same refresh token could both
pass verification before either revoked it, minting two new sessions
from one token use. The claim is now a single conditional updateMany;
a losing request is rejected before it can create anything. Also
narrowed the refresh cookie's path from "/" so it isn't sent on every
request, only ones that need it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

## Pass 5 — Frontend data layer

### Task 14: Fix the page-load waterfall

**Files:**
- Modify: `apps/frontend/dash/providers/workspace.provider.tsx`
- Modify: `apps/frontend/dash/app/[slug]/home-dashboard.tsx:119-122`
- Modify: `apps/frontend/dash/components/l-sidebar.tsx:59-60`

**Interfaces:**
- Produces: `WorkspaceContextType` gains `activeId: string | undefined` — the workspace id resolved from the (already-loaded) workspaces list, available before the workspace-detail (`activeWorkspace`) fetch resolves.

- [ ] **Step 1: Expose `activeId` on the workspace context**

In `workspace.provider.tsx`, add `activeId` to the interface and the provided value:

```typescript
interface WorkspaceContextType {
  activeId: string | undefined;
  activeWorkspace: Workspace | null;
  workspaces: WorkspaceMember[];
  loading: { list: boolean; active: boolean; mutation: boolean; };
  createWorkspace: (data: CreateWorkspacePayload) => Promise<void>;
  switchWorkspace: (workspaceSlug: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}
```

```typescript
const value = useMemo(
  () => ({
    workspaces,
    activeId,
    activeWorkspace,
    loading: {
      list: listLoading,
      active: activeLoading,
      mutation: createMutation.isPending
    },
    createWorkspace,
    switchWorkspace,
    refreshWorkspaces
  }),
  [workspaces, activeId, activeWorkspace, listLoading, activeLoading, createMutation.isPending, createWorkspace, switchWorkspace, refreshWorkspaces]
);
```

(`activeId` is already computed at line 46 — `const activeId = validMember?.workspace_id;` — nothing else in this file changes.)

- [ ] **Step 2: Repoint `home-dashboard.tsx`'s data hooks to `activeId`**

Replace lines 117-122:

```typescript
export function HomeDashboard({ slug }: { slug: string }) {
  const user = useUser();
  const { activeId, activeWorkspace } = useWorkspace();
  const { data: modules, isLoading: isModulesLoading } = useWorkspaceModules(activeId);
  const togglePinModule = useTogglePinModule(activeWorkspace?.id || "");
  const { data: stats, isLoading: isStatsLoading } = useStatistics(activeId, "2w");
```

(`togglePinModule` stays on `activeWorkspace?.id` — it's a mutation gated behind user interaction with the already-loaded modules list, not part of the initial-load waterfall.)

- [ ] **Step 3: Repoint `l-sidebar.tsx`'s data hooks to `activeId`**

Replace lines 48 and 59-60:

```typescript
const { activeId, activeWorkspace } = useWorkspace();
```

```typescript
const { data: wsModules } = useWorkspaceModules(activeId);
const { data: projects } = useWorkspaceProjects(activeId);
```

(`createProject`, `reorderModules`, and `useWorkspaceSocket` at lines 61-64 stay on `activeWorkspace?.id` — same reasoning as Step 2.)

- [ ] **Step 4: Typecheck**

Run: `cd apps/frontend/dash && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify with a browser network trace**

Start the dev servers (`pnpm dev` from repo root), open the dash app in Chrome devtools with the Network tab open, hard-reload the workspace home page, and confirm:
- `GET /workspaces/:id` (workspace detail), `GET /workspaces/:id/modules`, and `GET /workspaces/:id/statistics` now start at roughly the same timestamp instead of `modules`/`statistics` waiting for the detail request to finish first.
- The page still renders identical content once loaded.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/providers/workspace.provider.tsx apps/frontend/dash/app/\[slug\]/home-dashboard.tsx apps/frontend/dash/components/l-sidebar.tsx
git commit -m "$(cat <<'EOF'
perf(dash): fetch workspace modules/projects/statistics in parallel

These three queries keyed off activeWorkspace?.id, which only exists
after the workspace-detail fetch resolves, serializing three
round-trips into one after another on every page load. They only need
the workspace id (already known one step earlier from the workspaces
list), so they're repointed to a new activeId exposed on the workspace
context and now fire in parallel with the detail fetch.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 15: Fix the optimistic module-reorder mutation bug

**Files:**
- Modify: `apps/frontend/dash/hooks/use-workspace-modules.ts` (`useReorderModules`)

**Interfaces:**
- Produces: no signature change.

- [ ] **Step 1: Replace the mutating map with an immutable one**

Replace the `onMutate` body in `useReorderModules`:

```typescript
onMutate: async (data) => {
  await queryClient.cancelQueries({
    queryKey: moduleKeys.list(workspaceId),
  });
  const previous = queryClient.getQueryData(moduleKeys.list(workspaceId));

  queryClient.setQueryData(
    moduleKeys.list(workspaceId),
    (old: { data: WorkspaceModule[] } | undefined) => {
      if (!old?.data) return old;
      const moduleMap = new Map(old.data.map((m) => [m.id, m]));
      data.updates.forEach((update) => {
        const mod = moduleMap.get(update.id);
        if (mod) {
          moduleMap.set(update.id, { ...mod, position: update.position, project_id: update.project_id });
        }
      });
      const reordered = Array.from(moduleMap.values()).sort((a, b) => a.position - b.position);
      return { ...old, data: reordered };
    },
  );

  return { previous };
},
```

The only change is `moduleMap.set(update.id, { ...mod, ... })` instead of mutating `mod.position`/`mod.project_id` directly — `previous` (captured one line earlier from the same query data) shared object references with `old.data`, so the old code corrupted the rollback snapshot it was about to rely on in `onError`.

- [ ] **Step 2: Typecheck**

Run: `cd apps/frontend/dash && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify**

In the dashboard, temporarily stop the backend (or throttle the network to fail the request), drag-reorder a module in the sidebar, confirm the request fails and the module snaps back to its original position — restart the backend afterward.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/hooks/use-workspace-modules.ts
git commit -m "$(cat <<'EOF'
fix(dash): stop corrupting the rollback snapshot on module reorder

onMutate built moduleMap from the same object references as the
captured `previous` snapshot, then mutated mod.position/project_id
directly — corrupting `previous` too. onError's rollback restored data
that already reflected the failed change, so a failed reorder silently
kept the wrong order with no visible revert.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 16: Merge the chat and status sockets onto one connection

**Files:**
- Modify: `apps/frontend/dash/providers/socket.provider.tsx`
- Modify: `apps/frontend/dash/hooks/use-chat-socket.ts`

**Interfaces:**
- No interface changes — both sockets keep their existing namespaces (`/status`, `/chat`) and event names. Only the transport-level connection count changes.

- [ ] **Step 1: Remove `forceNew` from the status socket**

In `socket.provider.tsx`, replace the `io()` call:

```typescript
const socketInstance = io(`${SOCKET_URL}/status`, {
  withCredentials: true,
  transports: ["websocket"],
  autoConnect: true,
});
```

- [ ] **Step 2: Remove `forceNew` from the chat socket**

In `use-chat-socket.ts`, replace the module-level singleton:

```typescript
const chatSocket: Socket = io(`${SOCKET_URL}/chat`, {
  withCredentials: true,
  transports: ["websocket"],
  autoConnect: false,
});
```

`forceNew: true` on both sockets was forcing each `io()` call to skip socket.io-client's built-in manager cache (which multiplexes multiple namespaces over one underlying transport connection when the origin/options match, as they do here — both connect to `SOCKET_URL` with identical `withCredentials`/`transports`). Removing it from both lets the second one created (chat, since `SocketProvider` mounts before any chat-room component) reuse the first's already-open connection instead of opening a second one.

- [ ] **Step 3: Typecheck**

Run: `cd apps/frontend/dash && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify with a browser network trace**

Start the dev servers, open the dash app, open a chat room. In Chrome devtools' Network tab (filter: WS), confirm there is exactly one WebSocket connection to `localhost:8080`, not two — and that both status updates (e.g. another user's online/offline) and chat messages (send/receive in the open room) still work.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/dash/providers/socket.provider.tsx apps/frontend/dash/hooks/use-chat-socket.ts
git commit -m "$(cat <<'EOF'
perf(dash): multiplex chat and status sockets onto one connection

Both sockets passed forceNew: true, which explicitly opts out of
socket.io-client's manager-sharing cache — each session held two full
WebSocket connections (with independent handshake/heartbeat overhead)
instead of one connection carrying both namespaces.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 17: Add missing `staleTime` to modules/projects/statistics queries

**Files:**
- Modify: `apps/frontend/dash/hooks/use-workspace-modules.ts` (`useWorkspaceModules`)
- Modify: `apps/frontend/dash/hooks/use-workspace-projects.ts` (`useWorkspaceProjects`)
- Modify: `apps/frontend/dash/hooks/use-statistics.ts` (`useStatistics`)

**Interfaces:**
- No signature changes.

- [ ] **Step 1: Add `staleTime` to `useWorkspaceModules`**

```typescript
export function useWorkspaceModules(workspaceId?: string) {
  return useQuery({
    queryKey: moduleKeys.list(workspaceId!),
    queryFn: () => boardService.getWorkspaceModules(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
    select: (result) => result.data,
  });
}
```

- [ ] **Step 2: Add `staleTime` to `useWorkspaceProjects`**

```typescript
export function useWorkspaceProjects(workspaceId?: string) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId!),
    queryFn: () => projectService.getWorkspaceProjects(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
    select: (result) => result.data,
  });
}
```

- [ ] **Step 3: Raise `useStatistics`'s `staleTime`**

```typescript
export function useStatistics(workspaceId?: string, interval: string = "1m") {
  return useQuery({
    queryKey: statisticsKeys.detail(workspaceId || "unknown", interval),
    queryFn: () => getWorkspaceStatistics(workspaceId!, interval),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
  });
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/frontend/dash && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify**

In the dashboard with React Query devtools open, switch to another browser tab and back (triggers a window-focus refetch check) — confirm modules/projects/statistics queries no longer show as refetching every time, only after 5 minutes of staleness.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/hooks/use-workspace-modules.ts apps/frontend/dash/hooks/use-workspace-projects.ts apps/frontend/dash/hooks/use-statistics.ts
git commit -m "$(cat <<'EOF'
perf(dash): add staleTime to modules/projects/statistics queries

These three defaulted to staleTime: 0 (or set it explicitly for
statistics), refetching on every mount and window focus unlike every
sibling workspace query, which already sets 5 minutes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 18: Replace ad hoc query keys with the established factories

**Files:**
- Modify: `apps/frontend/dash/hooks/use-workspace-modules.ts` (`useUpdateModule`)
- Modify: `apps/frontend/dash/hooks/use-workspace-projects.ts` (`useDeleteProject`)
- Modify: `apps/frontend/dash/hooks/use-invites.ts` (add `inviteKeys`, use it)

**Interfaces:**
- Produces: `inviteKeys = { all: ["invites"] as const, list: (userId: string) => [...inviteKeys.all, userId] as const }` — new, exported from `use-invites.ts`.

- [ ] **Step 1: Import `boardKeys` in `use-workspace-modules.ts` and use it**

Add the import:

```typescript
import { boardKeys } from "@/hooks/use-boards";
```

Replace the two inline array keys in `useUpdateModule` (the `queryClient.setQueryData(["boards", "detail", referenceId], ...)` call in `onMutate`, and the `queryClient.invalidateQueries({ queryKey: ["boards", "detail", context.referenceId] })` call in `onSettled`):

```typescript
if (referenceId && data.name) {
  queryClient.setQueryData(
    boardKeys.detail(referenceId),
    (old: { data: Board } | undefined) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: { ...old.data, name: data.name },
      };
    }
  );
}
```

```typescript
onSettled: (_, __, ___, context) => {
  queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
  if (context?.referenceId) {
    queryClient.invalidateQueries({ queryKey: boardKeys.detail(context.referenceId) });
  }
},
```

Check for a circular import before running this: `use-boards.ts` already imports `moduleKeys` from `use-workspace-modules.ts` (line 14: `import { moduleKeys } from "@/hooks/use-workspace-modules";`). Having `use-workspace-modules.ts` import `boardKeys` back from `use-boards.ts` creates a require cycle. Since `moduleKeys` and `boardKeys` are the only things needed from each other, break the cycle by moving both key factories into a new small shared file instead:

Create `apps/frontend/dash/hooks/query-keys.ts`:

```typescript
export const boardKeys = {
  all: ["boards"] as const,
  list: (workspaceId: string) =>
    [...boardKeys.all, "list", workspaceId] as const,
  detail: (boardId: string) => [...boardKeys.all, "detail", boardId] as const,
};

export const moduleKeys = {
  all: ["modules"] as const,
  list: (workspaceId: string) =>
    [...moduleKeys.all, "list", workspaceId] as const,
};
```

In `use-boards.ts`, remove the local `boardKeys` definition (lines 16-21) and the `moduleKeys` import, replacing both with:

```typescript
import { boardKeys, moduleKeys } from "@/hooks/query-keys";
```

In `use-workspace-modules.ts`, remove the local `moduleKeys` definition and add:

```typescript
import { boardKeys, moduleKeys } from "@/hooks/query-keys";
```

(re-export `moduleKeys` from `use-workspace-modules.ts` too, since other files import it from there — add `export { moduleKeys } from "@/hooks/query-keys";` at the top, alongside the new import, so existing `import { moduleKeys } from "@/hooks/use-workspace-modules"` call sites keep working unchanged).

- [ ] **Step 2: Use `moduleKeys` in `use-workspace-projects.ts`**

Replace the inline array in `useDeleteProject`'s `onSettled`:

```typescript
import { moduleKeys } from "@/hooks/query-keys";
```

```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
  queryClient.invalidateQueries({ queryKey: moduleKeys.list(workspaceId) });
},
```

- [ ] **Step 3: Add an `inviteKeys` factory and use it**

Replace `use-invites.ts` in full:

```typescript
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceInvite } from "@crwsync/types";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";
import { getInvites } from "@/services/user.service";

export const inviteKeys = {
  all: ["invites"] as const,
  list: (userId: string) => [...inviteKeys.all, userId] as const,
};

export function useInvites() {
  const user = useUser();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: inviteKeys.list(user?.id ?? ""),
    queryFn: async () => {
      if (!user?.id) return [];
      const { success, data } = await getInvites(user.id);
      return success && data ? data : [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!socket || !user) return;

    const handleInviteReceived = (newInvite: WorkspaceInvite) => {
      queryClient.setQueryData(inviteKeys.list(user.id), (old: WorkspaceInvite[] = []) => {
        if (old.find((i) => i.id === newInvite.id)) return old;
        return [newInvite, ...old];
      });
    };

    const handleInviteHandled = ({ inviteId, status }: { inviteId: string; status: string }) => {
      queryClient.setQueryData(inviteKeys.list(user.id), (old: WorkspaceInvite[] = []) => {
        return old.map((invite) =>
          invite.id === inviteId ? { ...invite, status } : invite
        );
      });
    };

    socket.on("invite:received", handleInviteReceived);
    socket.on("invite:handled", handleInviteHandled);

    return () => {
      socket.off("invite:received", handleInviteReceived);
      socket.off("invite:handled", handleInviteHandled);
    };
  }, [socket, user, queryClient]);

  return { invites, isLoading };
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/frontend/dash && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify**

In the dashboard, rename a board via its module in the sidebar — confirm the board detail page reflects the new name without a manual refresh (exercises the `boardKeys.detail` cache patch). Send/receive a workspace invite — confirm the invites list updates live (exercises `inviteKeys`).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/hooks/query-keys.ts apps/frontend/dash/hooks/use-boards.ts apps/frontend/dash/hooks/use-workspace-modules.ts apps/frontend/dash/hooks/use-workspace-projects.ts apps/frontend/dash/hooks/use-invites.ts
git commit -m "$(cat <<'EOF'
refactor(dash): replace ad hoc inline query keys with shared factories

Three call sites built literal ["boards","detail",id] / ["modules",
"list",id] arrays instead of importing boardKeys/moduleKeys, working
only because the literals happened to match the factories' output.
Moved both factories into a shared query-keys.ts to avoid a require
cycle between use-boards.ts and use-workspace-modules.ts, and added an
inviteKeys factory where none existed before.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

### Task 19: Add optimistic updates to task CRUD

**Files:**
- Modify: `apps/frontend/dash/hooks/use-boards.ts` (`useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useArchiveTask`)

**Interfaces:**
- No signature changes — mirrors the existing `onMutate`/`onError` shape already used by `useMoveTask` and `useReorderColumns` in the same file.

- [ ] **Step 1: Add optimistic delete (highest-value: makes deletion feel instant)**

Replace `useDeleteTask`:

```typescript
export function useDeleteTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      boardService.deleteTask(workspaceId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

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
                tasks: col.tasks ? col.tasks.filter((t) => t.id !== taskId) : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}
```

- [ ] **Step 2: Add optimistic update to `useUpdateTask`**

```typescript
export function useUpdateTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskPayload;
    }) => boardService.updateTask(workspaceId, boardId, taskId, data),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

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
                tasks: col.tasks
                  ? col.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t))
                  : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}
```

- [ ] **Step 3: Add optimistic update to `useArchiveTask`**

```typescript
export function useArchiveTask(workspaceId: string, boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      boardService.archiveTask(workspaceId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData(boardKeys.detail(boardId));

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
                tasks: col.tasks
                  ? col.tasks.map((t) => (t.id === taskId ? { ...t, is_archived: true } : t))
                  : [],
              })),
            },
          };
        },
      );

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}
```

`useCreateTask` is left on invalidate-only: an optimistic insert would need a client-generated placeholder id and reconciliation logic (matching the pattern `use-chat-socket.ts` already uses for optimistic chat messages) that doesn't fit this task's minimal-diff scope — flagged as a natural follow-up, not done here.

- [ ] **Step 4: Typecheck**

Run: `cd apps/frontend/dash && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify**

In the dashboard, edit a task's title, delete a task, and archive a completed task — confirm each reflects in the UI immediately rather than after a round-trip, and confirm each still rolls back correctly if you simulate a failure (stop the backend briefly).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/hooks/use-boards.ts
git commit -m "$(cat <<'EOF'
perf(dash): add optimistic updates to task update/delete/archive

These three only invalidated on success, showing a full round-trip
delay before the UI updated — inconsistent with useMoveTask and
useReorderColumns in the same file, which already patch the cache
optimistically. useCreateTask is left as-is; an optimistic insert
needs placeholder-id reconciliation out of scope for this fix.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VMBewjVjshaPd8Upuy5tA8
EOF
)"
```

---

## Post-implementation

After all 19 tasks: run the full backend test suite (`cd apps/backend && npx jest`) and both frontend/backend typechecks one more time, then do a final manual pass through the dashboard (load home, open a board, drag a task, open chat, send a message, check statistics) to confirm nothing regressed end-to-end.
