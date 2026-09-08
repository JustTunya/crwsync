# Bugfix audit — design

## Context

A performance investigation (408/503 errors on the dashboard, traced to a
Windows loopback networking fault plus a Prisma pool config bug, both
already fixed) was followed by a deep audit of the rest of the codebase for
additional performance and functionality bugs. Four parallel audits covered:
backend DB/cache, backend auth/guards, backend realtime (sockets + BullMQ),
and frontend data layer (TanStack Query + sockets). This spec covers fixing
the 27 findings from that audit.

Deployment state: pre-launch, no real user data at risk. Solo developer,
no PR review gate. No test suite exists anywhere in the repo currently
(zero `.spec.ts`/`.test.ts` files despite Jest being configured).

## Approach

Group fixes by file/subsystem cluster rather than by severity tier alone,
ordering each cluster's own fixes worst-first. Rationale: several fixes
across different severity tiers land in the same file (e.g.
`board.service.ts` has one Critical, two High, one Medium, one Low finding)
— fixing by file cluster means touching each file exactly once instead of
revisiting it across multiple severity-ordered phases. Each cluster is one
commit.

Testing: regression tests only for the three findings where a silent future
regression would reopen a real security hole (cross-workspace IDOR, socket
subscription auth bypass, JWT role-version bypass). These are added as
lightweight unit tests against mocked Prisma clients — no e2e/DB test
harness is built, since none exists and building one is out of scope for
this fix wave. Everything else (cache invalidation, N+1 fixes, frontend
waterfall, etc.) is verified manually.

## Fix passes

### Pass 1 — Backend authorization + board queries
**Files:** `apps/backend/src/board/board.service.ts`,
`apps/backend/src/workspace/guards/ws-roles.guard.ts`

1. **[Critical] Cross-workspace IDOR.** Every board/column/task/module
   mutation and read keys off a bare `id` with no check it belongs to the
   `workspaceId` in the URL. Fix: add the workspace relation into every
   `where` clause (`{ id: boardId, workspace_id: workspaceId }` for boards;
   nested through `column → board → workspace_id` for tasks/columns).
   Prisma's not-found-on-mismatch behavior is already handled by existing
   `NotFoundException` paths.
2. **[High] `WorkspaceRolesGuard` re-queries membership from Postgres**
   instead of reading `request.member`, which `IsMemberGuard` (which always
   runs first in the guard stack) already fetched from cache. Fix: read
   `request.member` instead of calling Prisma again.
3. **[High] N+1 in `getWorkspaceModules`** — 2 sequential queries per chat
   room. Fix: batch into one `findMany` (read receipts) + one `groupBy`
   (message counts) instead of per-room round trips.
4. **[Medium] Task position race** under concurrent create/move — no lock
   between reading max position and writing. Fix: short-lived Redis lock
   per `column_id` via the existing `CacheService` around the read+write.
5. **[Low] Sequential N+1 loop in `deleteProject`.** Fix:
   `Promise.all(modulesInProject.map(...))` instead of a `for` loop with
   sequential `await`.

**Test:** unit tests on the affected service methods with a mocked Prisma
client, asserting the `where` clause passed to Prisma includes
`workspace_id` (or the equivalent nested scope) for each mutation/read.

### Pass 2 — Realtime (sockets + queues)
**Files:** `apps/backend/src/chat/chat.gateway.ts`,
`apps/backend/src/status/status.gateway.ts`,
`apps/backend/src/chat/chat.module.ts`,
`apps/backend/src/email/email.module.ts`,
`apps/backend/src/chat/chat.processor.ts`

1. **[Critical] `sub_ws` has no membership check** — any authenticated
   socket can subscribe to any workspace's status room. Fix: mirror
   `chat.gateway.ts`'s `workspaceMember` lookup before `client.join`.
2. **[Critical] Chat/email queues have no retry policy** — a transient
   DB/SMTP failure silently drops the job. Fix:
   `defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1000 } }`
   on both queue registrations; on final chat-persist failure, emit
   `message_failed` to the room so the client can show a failed state
   instead of a message that silently vanishes on refresh.
3. **[Medium] Gateway CORS hardcodes `origin: "*"`**, bypassing the
   `CORS_ORIGIN` allowlist `main.ts` builds for HTTP. Fix: reuse that
   allowlist function for both gateways.
4. **[Medium] Status-update handler takes unvalidated enum input**, no
   try/catch, unlike sibling handlers. Fix: validate against the
   `UserStatus` enum, wrap in try/catch.
5. **[Low] Sockets never re-validate auth after connect** — a revoked
   session keeps live realtime access until disconnect. Fix: re-check
   session validity periodically or on each `@SubscribeMessage`.
6. **[Low] No per-socket rate limiting** on hot-path events. Fix: a
   lightweight sliding counter in Redis keyed by userId + event name, at
   minimum on `send_message`.
7. **[Low] Hand-rolled cookie parsing** in both gateways' `extractToken`.
   Fix: use the `cookie` package's parser instead.
8. **[Low] Dead no-op `@Process` decorator** in `chat.processor.ts`. Fix:
   delete it, keep the existing `switch (job.name)` dispatch.

**Test:** unit test on `status.gateway.ts`'s `handleSubscribeWorkspace`
mocking Prisma, asserting a non-member's `sub_ws` call is rejected.

### Pass 3 — Workspace cache correctness
**Files:** `apps/backend/src/workspace/workspace.service.ts`

1. **[High] `workspace:slug:*` cache key never invalidated** on
   rename/delete. Fix: add `cache.del(CacheKeys.workspaceSlug(slug))`
   alongside the existing `workspace(id)` invalidation in `update()` and
   `remove()`.
2. **[Medium] Stale embedded member/role data** in the cached workspace
   object after `updateMemberRole`/`transferOwnership` — these only
   invalidate the narrower `workspaceMember` key, not the workspace object
   that embeds the members array. Fix: call the existing
   `invMembershipCaches(workspaceId, memberId)` helper (already invalidates
   `workspace(id)` too) instead of the bare `cache.del`.

**Verify manually:** rename a workspace, confirm `findBySlug` reflects it
immediately; change a member's role, confirm `GET /workspaces/:id` reflects
it immediately.

### Pass 4 — Auth/session
**Files:** `apps/backend/src/common/guards/jwt-auth.guard.ts` (or
`roles.guard.ts`, whichever ends up cleanest), `apps/backend/src/session/session.service.ts`,
`apps/backend/src/auth/auth.cookie.ts`

1. **[Medium] `role_version` decoded from JWT but never checked** against
   the current DB value — a demoted/deactivated user keeps old permissions
   for the access token's full lifetime. Fix: compare `user.roleVersion`
   against the current `role_version` (already available via the cached
   `userService.findOne`) and reject on mismatch.
2. **[Low-Medium] Refresh-token rotation race** — `verify()` and
   `revoke(oldSession.id)` aren't atomic, so two concurrent requests
   replaying the same refresh token can both pass verification. Fix:
   `updateMany({ where: { id, revoked_at: null }, data: { revoked_at: ... } })`,
   check `count === 1` before proceeding to `create()`.
3. **[Low] Refresh cookie not path-scoped** — sent on every request instead
   of just the refresh endpoint. Fix: scope `path` on the `crw-rt` cookie.

**Test:** unit test asserting a JWT with a stale `roleVersion` is rejected.

### Pass 5 — Frontend data layer
**Files:** `apps/frontend/dash/providers/workspace.provider.tsx`,
`apps/frontend/dash/hooks/use-workspace-modules.ts`,
`apps/frontend/dash/hooks/use-workspace-projects.ts`,
`apps/frontend/dash/hooks/use-statistics.ts`,
`apps/frontend/dash/hooks/use-chat-socket.ts`,
`apps/frontend/dash/hooks/use-boards.ts`,
`apps/frontend/dash/hooks/use-invites.ts`

1. **[High] Waterfall fetch on every page load** — dependent hooks key off
   `activeWorkspace?.id` (only available after the workspace-detail fetch
   resolves) instead of `activeId` (already computed from the workspaces
   list one step earlier). Fix: expose `activeId` on the workspace context,
   repoint `useWorkspaceModules`, `useStatistics`, `useWorkspaceProjects` to
   use it so they run in parallel with the detail fetch instead of after it.
2. **[High] Chat opens a second WebSocket connection** (`forceNew: true`),
   bypassing the shared socket singleton. Fix: multiplex the `/chat`
   namespace off the same manager `SocketProvider` already owns.
3. **[High] Optimistic module-reorder mutates cached objects in place** —
   the `onError` rollback restores data that's already corrupted because
   the rollback snapshot shares object references with the mutated map.
   Fix: build new objects (`{ ...mod, position, project_id }`) instead of
   mutating in place, matching the correct pattern already used in
   `use-workspace-socket.ts`.
4. **[Medium] Missing `staleTime`** on modules/projects queries (defaults
   to 0). Fix: add `staleTime: 1000 * 60 * 5` to match the established
   convention. `useStatistics` explicitly sets `staleTime: 0` — raise it
   unless a real-time requirement is found.
5. **[Low] Ad hoc inline query keys** in three spots instead of the
   established factories. Fix: import and use `boardKeys`/`moduleKeys`; add
   a small `inviteKeys` factory for consistency.
6. **[Low] Task CRUD has no optimistic updates** unlike sibling mutations
   (`useMoveTask`, `useReorderColumns`). Fix: add `onMutate` optimistic
   patches to `useCreateTask`/`useUpdateTask`/`useDeleteTask`/`useArchiveTask`.

**Verify manually:** re-run the browser network-trace check from this
session — confirm parallel fetch instead of sequential waterfall, and one
socket connection instead of two.

## Out of scope

- Building an e2e/DB test harness (no existing infra; separate effort).
- The "services aren't uniformly a dedicated file with a discriminated
  result type" structural inconsistency noted by the frontend audit — flagged
  for a future pass, not a bug.
- Unbounded `findMany` in `getBoard` — flagged for future pagination work,
  not a problem at current data volumes.
