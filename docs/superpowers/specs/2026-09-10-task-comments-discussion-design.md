# Task Comments & Discussion — Design

First checklist item of Milestone 3 (`ROADMAP.md` §5). Adds a dedicated
comment thread to tasks — content, `@mentions`, real-time sync — the first
piece of "Deep Collaboration & Task Enhancements." Subtasks/checklists,
activity trail, board filters, DMs, and persistent notifications are
separate roadmap items and out of scope here.

## Context

`TaskDetailModal.tsx` currently has no comment/discussion surface. The
closest existing precedent is `TaskAttachment` (Milestone 2): a
task-scoped model, embedded directly in the board query payload, synced via
`StatusGateway` events (`task:attachment:added/removed`) that
`use-board-socket.ts` patches into the nested
`board.columns[].tasks[].attachments` array.

Chat (`ChatMessage`) has the more complete mention/soft-delete/edit
precedent: `mentions: User[]` M:N relation, `is_edited`/`is_deleted` flags,
`@[Name](user:uuid)` token format parsed client-side in `ChatInput.tsx` via
regex (no TipTap mention extension is installed in this repo).

Two decisions diverge from a straight TaskAttachment mirror:

1. **Comments are unbounded growth, attachments aren't.** Embedding full
   comment bodies in every board fetch (like attachments) would bloat board
   load for data nobody's currently viewing. Comments are fetched lazily
   and paginated per-task instead, only when `TaskDetailModal` opens.
2. **Delivery is synchronous persist-then-emit** (TaskAttachment style),
   not optimistic-first + BullMQ (ChatMessage style) — comment volume per
   task doesn't warrant the queue.

No `Notification` model exists yet (confirmed absent from
`schema.prisma`) — it's a separate, not-yet-started M3 checklist item.
Comment `@mentions` reuse the existing ephemeral `mention_notification`
socket event (`chat.gateway.ts` → `user_${mentionedId}` room, consumed by
`use-mentions.ts`'s local `useState`) rather than building persistence now.

## Architecture

New `TaskComment` Prisma model, cascade-deleted with `Task`. Lives in
`apps/backend/src/workspace/` (service/controller), same convention as
`TaskAttachment` — no new NestJS module.

```prisma
model TaskComment {
  id         String   @id @default(uuid())
  task_id    String
  task       Task     @relation(fields: [task_id], references: [id], onDelete: Cascade)
  author_id  String
  author     User     @relation("TaskCommentAuthor", fields: [author_id], references: [id])
  content    String
  is_edited  Boolean  @default(false)
  is_deleted Boolean  @default(false)
  mentions   User[]   @relation("TaskCommentMentions")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([task_id, created_at])
}
```

`Task` gains a back-relation (`comments TaskComment[]`) — no new column;
comment count is read via Prisma `_count` aggregation, not a denormalized
counter.

Real-time events on `StatusGateway`, emitted to `workspace_${workspaceId}`
(same room convention as attachment events, filtered client-side by
`taskId`):

- `task:comment:created` — `{ boardId, taskId, comment, commentCount }`
- `task:comment:updated` — `{ boardId, taskId, comment }`
- `task:comment:deleted` — `{ boardId, taskId, commentId, commentCount }`

Mention delivery reuses the existing pattern: for each ID in
`mentionedUserIds`, emit `mention_notification` to `user_${mentionedId}`
with a payload shaped like the chat one (sender, task context instead of
room context) so `use-mentions.ts` can consume it with a small
source-discriminator addition.

## Data flow

**Load**: `TaskDetailModal` opens → `useTaskComments(taskId)` fires a
paginated `GET` (cursor-based, most-recent-first, same shape as chat
message pagination) — comments are not part of the board query response.

**Create**: composer submit → optimistic local insert (temp id, pending
state, same convention as `TaskAttachments`' pending-upload list) → `POST`
→ response reconciles the pending entry → `task:comment:created` emitted;
other clients patch `commentCount` on the kanban card immediately, and
additionally prepend the comment if that task's comment query is currently
mounted (checked via `queryClient.getQueryData(commentKeys.list(taskId))`
being defined) — guarded against self-echo the same way existing board
socket handlers dedupe by id.

**Edit**: author-only. `PATCH` sets `is_edited: true`, re-emits
`task:comment:updated`.

**Delete**: author OR workspace `ADMIN`/`OWNER` (moderation — matches
chat's delete permission model). Soft-delete: `is_deleted: true`, content
replaced with a fixed "This comment was deleted." string server-side (same
as `ChatMessage`), re-emits `task:comment:deleted` with the id so clients
can either remove or render the tombstone.

**Kanban card badge**: board query's task selection gains
`_count: { select: { comments: true } }`. Card renders a small icon+count
(Trello/Asana/Linear convention) only when count > 0. Socket handlers bump
this count in the nested board cache without needing the comment list
itself.

## Components

### Backend

- `dto/task-comment.dto.ts`: `CreateTaskCommentDto` (`content` — `@IsString @MaxLength(4000)`, `mentionedUserIds?: string[]` — `@IsOptional @IsArray @IsUUID("4", {each:true})`), `UpdateTaskCommentDto` (`content` only).
- `workspace.service.ts`: `createTaskComment`, `updateTaskComment`, `deleteTaskComment`, `listTaskComments(taskId, cursor?, limit?)`.
- `workspace.controller.ts`: `POST/GET /workspaces/:id/tasks/:taskId/comments`, `PATCH/DELETE /workspaces/:id/tasks/:taskId/comments/:commentId`.
- Per-route throttling: comment creation gets a sane per-user limit (mirrors the granularity already used for invites/workspace creation), reads stay `@SkipThrottle()`.

### Frontend

- Extract `useMentionAutocomplete` out of `ChatInput.tsx`'s inline `@`-detection/dropdown/token-insertion logic (currently duplicated-in-place, ~100 lines) into a shared hook. `ChatInput.tsx` is refactored to consume it; `TaskComments.tsx` consumes the same hook — avoids a second copy of the same regex/dropdown logic.
- `commentKeys` query-key factory (`all/list(taskId)/...`), following the existing `xKeys` shape used by `boardKeys`/`moduleKeys`.
- `use-task-comments.ts`: `useTaskComments(taskId)` (paginated), `useCreateTaskComment`, `useEditTaskComment`, `useDeleteTaskComment`.
- `TaskComments.tsx`: comment list (author avatar, name, timestamp, edited marker, tombstone for deleted) + composer (textarea + mention dropdown, reusing `useMentionAutocomplete`). Slots into `TaskDetailModal.tsx` as a new bordered section below `<TaskAttachments />`, matching the existing `pt-4 mt-4 border-t border-base-200` divider convention.
- `use-board-socket.ts` gains `onTaskCommentCreated/Updated/Deleted`, same idempotency-guard + `if (bId !== boardId) return` convention as the existing handlers; patches `_count.comments` always, patches the mounted comment-list query opportunistically.
- Kanban card (`KanbanCol.tsx` task card) gains a comment-count badge, rendered only when `task._count.comments > 0`.
- Visual execution (composer layout, comment bubble styling, mention chip rendering, spacing/typography matching `MessageBubble.tsx`'s established visual language) happens via the `impeccable` and `frontend-design` skills at implementation time — not decided in this spec, per the brainstorming skill's gate on implementation-skill invocation.

## Error handling

- class-validator on both DTOs (`content` length, UUID shape on
  `mentionedUserIds`) — invalid payloads rejected by the global
  `ValidationPipe` before reaching the service.
- `403` when a non-author attempts edit; `403` when a non-author,
  non-`ADMIN`/`OWNER` attempts delete.
- `404` when `taskId`/`commentId` doesn't resolve within the workspace
  (existing `NotFoundException` convention).
- No new global exception handling — `AllExceptionsFilter` covers the
  rest.

## Testing

- Backend: service-level unit tests for `createTaskComment` /
  `updateTaskComment` (author-only) / `deleteTaskComment`
  (author-or-admin) / permission-denied paths.
- One e2e flow: create comment → mention delivered → edit → delete
  (tombstone rendered).
- Matches the repo's current test posture — formal coverage targets are
  Milestone 4/5 scope, not this task.
