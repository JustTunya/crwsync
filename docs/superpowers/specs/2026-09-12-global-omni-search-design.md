# Global Omni-Search (`Cmd+K`) — Design

**Roadmap item**: Milestone 4, "Global Omni-Search (`Cmd+K`) — Upgrade search modal to index modules, tasks (`CRW-12`), chat messages, files, and workspace members."

## Scope

- Extend the existing `Cmd+K` modal (`l-sidebar.tsx:475-528`) with server-backed search across **Tasks**, **Chat messages**, **Files**, **Workspace members**.
- **Modules stay as-is**: the modal already does instant client-side filtering over the loaded nav module list (`modalFilteredGlobal`/`modalFilteredLocal`) — that already satisfies "index modules," no backend change needed there.
- Clicking a result deep-links into the app and auto-opens/highlights the target (task modal, chat message, file, member row).
- **Out of scope (YAGNI)**: a dedicated full-page search results view, cross-workspace search, search-result content highlighting/snippets, saved/recent searches, fuzzy typo-correction beyond trigram similarity, a `search:*` socket event (search here is pull/query, not a live feed).

## Why Postgres full-text + trigram, not `contains`

`board.service.searchTasks` and `user.service.searchByEmailOrUsername` both use plain Prisma `contains` (ILIKE) today — fine for a 10-row suggestion list, but it can't use an index (forces a seq scan) and has no relevance ranking. Given this feature is Milestone 4's explicit "harden performance" item and needs to scale across four entity types at once per keystroke, it gets real infra: generated `tsvector` columns + GIN indexes for prose fields (task/comment/message bodies), and `pg_trgm` GIN indexes for short-token fields (task codes, filenames, member names) where trigram similarity outperforms tsvector.

## Data model

One migration, additive + one backfill:

```prisma
model Task {
  ...existing fields...
  workspace_id String @db.Uuid   // denormalized, backfilled from column.board.workspace_id
  workspace    Workspace @relation(fields: [workspace_id], references: [id], onDelete: Cascade)

  @@index([workspace_id])
}

model TaskComment {
  ...existing fields...
  workspace_id String @db.Uuid   // denormalized, backfilled from task.column.board.workspace_id

  @@index([workspace_id])
}
```

Raw SQL (same migration, Prisma doesn't model generated columns/extensions natively — hand-written `.sql` migration file):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE tasks ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX idx_tasks_search_vector ON tasks USING GIN (search_vector);
CREATE INDEX idx_tasks_short_id_trgm ON tasks USING GIN (short_id gin_trgm_ops);

ALTER TABLE task_comments ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX idx_task_comments_search_vector ON task_comments USING GIN (search_vector);

ALTER TABLE chat_messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX idx_chat_messages_search_vector ON chat_messages USING GIN (search_vector);

CREATE INDEX idx_workspace_files_filename_trgm ON workspace_files USING GIN (file_name gin_trgm_ops);
CREATE INDEX idx_users_firstname_trgm ON users USING GIN (firstname gin_trgm_ops);
CREATE INDEX idx_users_lastname_trgm ON users USING GIN (lastname gin_trgm_ops);
CREATE INDEX idx_users_username_trgm ON users USING GIN (username gin_trgm_ops);
```

Backfill (same migration, before the `NOT NULL`... actually columns above declared non-nullable so this must run as: add nullable → backfill → set not null, in that order within the migration file):

```sql
UPDATE tasks t SET workspace_id = b.workspace_id
FROM columns c JOIN boards b ON b.id = c.board_id
WHERE c.id = t.column_id;

UPDATE task_comments tc SET workspace_id = t.workspace_id
FROM tasks t WHERE t.id = tc.task_id;
```

`Task`/`TaskComment` create paths (`board.service.ts`, `task-comment.service.ts`) must be updated to write `workspace_id` going forward — one line each where the row is created, workspace_id is already in scope in both services (route param / parent lookup).

## Backend

New `search` module (mirrors `board` module structure exactly):

```
src/search/
  search.module.ts       — imports PrismaModule; declares SearchController, SearchService
  search.controller.ts   — @Controller("workspaces/:workspaceId/search"), @UseGuards(IsMemberGuard)
  search.service.ts       — PrismaService injected
  dto/search.dto.ts       — SearchQueryDto (q: string, @IsString @Length(1,200))
  search.service.spec.ts
```

- `GET /workspaces/:workspaceId/search?q=` — `@Throttle({ default: { ttl: 10_000, limit: 20 } })` (live-typing endpoint: generous enough for debounced keystrokes, not open to abuse). `ParseUUIDPipe` on `workspaceId`.
- `SearchService.search(workspaceId, q)` runs four queries via `Promise.all`, each `Prisma.$queryRaw` with `Prisma.sql`-tagged parameters (never string-interpolate `q` — SQL injection boundary):
  - **Tasks**: `WHERE workspace_id = $1 AND (search_vector @@ websearch_to_tsquery('english', $2) OR short_id ILIKE $3)`, `ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', $2)) DESC`, `LIMIT 5`. Select `id, short_id, title, board_id, board_name, column_name` (join `columns`/`boards` for the two names, needed for result subtitle).
  - **Chat messages**: same `websearch_to_tsquery` shape scoped by `workspace_id`, join `chat_rooms` for `room_id, room_name`, `LIMIT 5`, select `content` truncated server-side (`substring(content, 1, 140)`) plus `created_at` (needed by the frontend as a fetch-anchor cursor for messages not yet loaded client-side).
  - **Files**: `similarity(file_name, $2) > 0.2 ORDER BY similarity(file_name, $2) DESC LIMIT 5`, scoped via `file_room_id IN (SELECT id FROM file_rooms WHERE workspace_id = $1)`, select `id, file_name, file_room_id, file_room_name`.
  - **Members**: `similarity(firstname || ' ' || lastname, $2) > 0.2 OR username ILIKE $3 OR email ILIKE $3`, joined through `workspace_members WHERE workspace_id = $1`, `LIMIT 5`, select `id, firstname, lastname, username, avatar_url, role`. New method on `SearchService`, not a reuse of `UserService.searchByEmailOrUsername` (that one's `NOT`-excludes existing members for invite flows — opposite intent here — but same query shape).
  - Response: `{ success: true, data: { tasks: [...], chats: [...], files: [...], members: [...] } }`.
- Cache: `CacheKeys.workspaceSearch(workspaceId, q)` → `` `workspace:${workspaceId}:search:${q.toLowerCase().trim()}` ``, `CacheTTL.SEARCH = 30` (seconds). No explicit invalidation on mutation — a few seconds of staleness on search results is an acceptable tradeoff (unlike auth/session caches), and invalidating per-query-string on every task/message/file/member write would require tracking every cached query, not worth it for this read path.

## Frontend

**Extraction**: move the existing Cmd+K `Dialog` block out of `l-sidebar.tsx` into `components/search/OmniSearchModal.tsx` (same pattern as the existing `SidebarModule`/`SidebarWorkspace`/`SidebarProfile` extractions). `l-sidebar.tsx` keeps the `useHotkey(["ctrl","k"], ...)` wiring and `searchModalOpen` state, passes `open`/`onOpenChange` down; the modules list/filter logic (`modalFilteredGlobal`/`modalFilteredLocal`, `getModuleIcon`, `getModuleHref`, `isModuleActive`) moves into the new component unchanged.

- `services/search.service.ts` — `searchWorkspace(workspaceId, q)`, same `{success, data?, message?}` shape as every other service.
- `hooks/use-search.ts` — `searchKeys = { all, query: (workspaceId, q) => [...] }` factory (mirrors `boardKeys`); `useOmniSearch(workspaceId, query)`: debounce via existing `use-debounce` (`useDebouncedCallback` or `useDebounce(query, 300)`), `useQuery({ enabled: debounced.length >= 2, staleTime: 10_000, queryKey: searchKeys.query(...) })`.
- `OmniSearchModal.tsx` renders, in order: Modules (unchanged, instant), then Tasks / Chats / Files / Members sections from `useOmniSearch` — each a small header label (semibold, tracked wide, per DESIGN.md section-header convention) + up to 5 rows. Each row: type icon (HugeIcons, matching existing module icon usage), primary text, muted secondary context line (board › column for tasks, room name for chats, file room for files, role for members), muted-neutral type badge (not the 8-hue tag palette — reserved for user content tags per DESIGN.md). Framer `m.div` stagger-fade on the results list, matching the existing motion idiom already in this file. Loading: simple "Searching…" muted row (no skeleton — small dataset, not worth the extra markup). Empty: `` No results for "{query}" `` mirroring the existing "No modules found." copy/style exactly.
- Keyboard nav: one `activeIndex` state over the flattened visible-row list, `onKeyDown` on the `Input` handles `ArrowUp`/`ArrowDown`/`Enter` — no new dependency, no `cmdk`.

**Shared highlight utility** — `hooks/use-highlight-target.ts`: `highlightTarget(id: string)` → `document.getElementById(id)?.scrollIntoView({behavior:"smooth", block:"center"})` + add `bg-primary/20` (or the existing `.message-highlight-target` class) for ~1.5s. Used by chat/file/member deep-link handlers below (3 real call sites — genuine dedup, not speculative). While touching this: fix the pre-existing bug in `MessageBubble.tsx`'s reply-jump (`getElementById("message-" + id)`) which doesn't match the actual DOM id set by `MessageList.tsx` (`` `msg-${message.id}` ``) — change the reply-jump to use `msg-${id}` so it (and the new search deep-link) both work.

**Deep links** (each destination reads its query param via `useSearchParams()`, acts once, then `router.replace(pathname, { scroll: false })` to strip it — idiom already established in `use-board-filters.ts`):

- **Task** → `router.push(\`/${slug}/board/${boardId}?taskId=${id}\`)`. `BoardPage`: once `useBoard` data is loaded, find the task across `columns[].tasks`, `dispatch({ type: "SET_EDITING_TASK", payload: task })`, clear param.
- **Chat message** → `router.push(\`/${slug}/chat/${roomId}?messageId=${id}\`)`. `ChatRoom`: if `` document.getElementById(`msg-${id}`) `` exists, `highlightTarget` immediately. Else (message predates the initial load, `useChatMessages` isn't paginated in) call the existing `getChatMessages(workspaceId, roomId, cursor, 50, "before")` from `chat.service.tsx`, using the search result's `created_at` as `cursor`, prepend the page into `useChatStore`, then `highlightTarget` on next tick.
- **File** → `router.push(\`/${slug}/files/${fileRoomId}?fileId=${id}\`)`. File row gains `id={\`file-${file.id}\`}` (doesn't exist today); page calls `highlightTarget` on mount if the param is present.
- **Member** → `router.push(\`/${slug}/settings/members?memberId=${id}\`)`. Member row gains `id={\`member-${member.id}\`}`; same `highlightTarget` on mount.
- **Module** → `router.push(getModuleHref(slug, mod))` directly — already a full nav target, no param/highlight needed.

## Testing

- Backend: `search.service.spec.ts` — one case per entity type asserting workspace scoping (a match in another workspace is excluded) and the `LIMIT 5` cap; a SQL-injection-shaped query string (`' OR 1=1--`) returns zero results rather than throwing or leaking rows, confirming parameterization.
- No automated UI/E2E testing — manual test steps handed to the user step-by-step after implementation, per their request.

## Open items resolved with the user

- Search tech: Postgres `tsvector`/GIN + `pg_trgm`, not plain `contains` (performance/scale requirement).
- Schema: denormalize `workspace_id` onto `Task`/`TaskComment`.
- Result click behavior: deep-link + auto-open/highlight, not just navigate-to-container.
