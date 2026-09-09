# Remaining bugs — fix plan

## Context

Follow-up review pass after the 2026-09-08 bugfix audit (27 findings, all
verified fixed except one completeness gap noted separately). This pass
found 10 new/remaining issues — some pre-existing and previously unaudited
(`user.service.ts` mass assignment, chat link-preview SSRF), one a direct
regression introduced by the Pass 5 frontend waterfall fix
(`l-sidebar.tsx` null-crash race).

This document is a plan only — no code changes made. Same deployment
context as the prior spec: pre-launch, no test suite, solo developer.

## Guiding principles

Applying these consistently rather than patching each symptom in isolation:

- **Fail closed, not open.** A lock/guard that errors should deny, not
  silently grant. (`acquireLock` currently does the opposite.)
- **Separate public-mutable fields from system-managed fields at the DTO
  boundary**, not with per-endpoint logic. Anything a client should never
  set (`email_verified_at`, `last_login`, `role_version`, ...) shouldn't
  exist on the same DTO class the client's JSON body deserializes into —
  it should be a distinct internal shape the service constructs itself.
  This is the root-cause fix for mass assignment; validating "don't send
  that field" per-controller doesn't scale and gets missed.
- **All externally-resolvable URLs are untrusted input**, full stop —
  outbound `fetch`/`ogs`/`axios` calls built from user input need an
  allowlist (scheme + resolved-IP range) before the request leaves the
  process, not after.
- **At-least-once delivery (BullMQ) requires idempotent handlers.**
  Anything that can be redelivered after a successful commit needs an
  upsert/dedup key, not a bare `create`.
- **Authorization must validate the full scope chain**, not just the
  primary resource id — a request that references a second resource by id
  (like `project_id` in a module-reorder payload) needs that second
  resource's ownership checked too.
- **Client loading state must not let a dependent view render ahead of
  the data it needs.** Two independently-resolving queries feeding one
  render tree is a race by construction; the fix is either a shared
  loading gate or making the dependent state optional-safe, not a
  non-null assertion.

## Fix clusters

Grouped by subsystem so each file is touched once. Ordered worst-first
within a cluster; cluster order given in Sequencing below.

### Cluster 1 — User mutation surface (mass assignment, password bug, signin lockout)
**Files:** `apps/backend/src/user/user.service.ts`,
`apps/backend/src/user/dto/*.ts` (whichever holds `CreateUserDto`/`UpdateUserDto`),
`apps/backend/src/auth/auth.service.ts`,
`apps/backend/src/email-verification/email-verification.service.ts`

1. **[Critical] Mass assignment via `UpdateUserDto`.** Split the DTO:
   keep only genuinely user-settable fields (`name`, `avatar_url`, etc.)
   on the class the controller binds to. Remove `email_verified_at`,
   `last_login`, `created_at`, `updated_at` from it entirely — with the
   global `ValidationPipe`'s `forbidNonWhitelisted: true` already on,
   removing the fields makes the API reject them outright instead of
   relying on service-layer discipline. Any code that legitimately needs
   to set these (email verification flow, login recording) should call a
   dedicated service method (`verifyEmail(userId)`, `recordLogin(userId)`)
   that builds its own Prisma `data` object, never the client DTO.
2. **[High] Stray `password` key in update payload.** Destructure it out
   before building `data`: `const { password, ...rest } = dto;` then hash
   `password` into `password_hash` separately if present. Don't spread
   `dto` directly into the Prisma payload at all once (1) removes DTO
   fields it shouldn't have had anyway — this becomes a smaller, explicit
   allowlist spread.
3. **[Critical] `findByEmail` throwing breaks signin after email change.**
   Change `findByEmail` to return `null` on no-match instead of throwing
   — this is a "might not exist" lookup, not a "must exist" one, so it
   shouldn't behave like `findByIdOrThrow`. Restores the existing
   `if (verification && ...)` check in `signin()` to reachable.
   Also close the actual gap this bug was masking: when email changes,
   the old `EmailVerification` row is orphaned and no new one is created,
   so even after this fix a user with a changed email is stuck
   unverified with no path to verify. Add an explicit email-change flow:
   invalidate old verification row, create a new pending one for the new
   address, block signin until that resolves (same pattern the initial
   signup verification already uses). This closes the loop opened by
   Cluster 1 item (1) — `email_verified_at` should only ever be set by
   this flow, never by client PATCH.

**Test:** unit tests against a mocked Prisma client — assert
`UpdateUserDto` has no `email_verified_at`/`last_login`/timestamp fields
(compile-time via type, plus a runtime 400 test); assert `update()` never
forwards a `password` key to Prisma; assert `findByEmail` returns `null`
(not a throw) for a non-existent email, and that `signin()` after an
email change routes into the new pending-verification flow instead of
crashing.

### Cluster 2 — Chat trust boundary (SSRF, silent data loss, duplicate-id retry)
**Files:** `apps/backend/src/chat/chat.service.ts`,
`apps/backend/src/chat/chat.controller.ts`,
`apps/backend/src/chat/chat.gateway.ts`,
`apps/backend/src/chat/chat.processor.ts`

1. **[Critical] SSRF in `getLinkPreview`.** Before calling `ogs()`:
   - Reject non-`http(s)` schemes.
   - Resolve the hostname (`dns.lookup` / `net.isIP` after resolution,
     not just string-matching the hostname — attackers can use DNS to
     point a public-looking hostname at a private IP, so check the
     *resolved* address) and reject loopback, link-local, and private
     ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`,
     `192.168.0.0/16`, `169.254.0.0/16`, IPv6 equivalents incl.
     `::1`/`fc00::/7`).
   - Keep the existing 5s timeout; also cap response size if `ogs`
     doesn't already.
   - Extract this into a small reusable `assertPublicUrl(url)` guard
     (`src/common/security/`) rather than inlining it in `chat.service.ts`
     — flagged in Out of scope for reuse by any future outbound-fetch
     feature, but write it as a standalone function now so that reuse is
     just an import, not a copy-paste.
2. **[Critical] Silent message loss on enqueue failure.** The gateway
   currently emits `message_ack` + broadcasts before the queue add is
   confirmed. Two valid fixes, pick based on desired latency/consistency
   tradeoff:
   - (a) Move `message_ack`/broadcast to *after* `messageQueue.add()`
     resolves — simplest, adds queue-add latency (usually sub-ms for
     BullMQ/Redis) to perceived send time.
   - (b) Keep optimistic ack, but on enqueue failure emit `message_failed`
     from the same catch block, reusing the exact event the processor's
     `onFailed` already emits — client-side handling doesn't need to
     branch on failure origin.
   Recommend (b): preserves current UX, and the fix is a few lines in the
   existing catch block versus reordering the handler.
3. **[Medium] Redelivery produces false `message_failed`.** Make
   `persistMessage` idempotent: `prisma.chatMessage.upsert({ where: { id },
   create: {...}, update: {} })` instead of `create`. A redelivered job
   after a successful first commit becomes a no-op instead of a P2002 that
   burns retries and eventually fires a false failure event.

**Test:** table-driven unit test for `assertPublicUrl` covering each
blocked CIDR range plus a couple of valid public IPs/hostnames;
integration-style test mocking `messageQueue.add()` to throw and
asserting `message_failed` is emitted to the room; unit test asserting
`persistMessage` run twice with the same id doesn't throw and doesn't
double-insert.

### Cluster 3 — Lock fail-open (`cache.service.ts`)
**Files:** `apps/backend/src/redis/cache.service.ts`

1. **[High] `acquireLock` returns `true` on Redis error.** Flip to
   fail-closed: return `false` on any error from the underlying `SET NX`
   call, and log the error (it's currently at least logged — keep that).
   Audit both current callers after the change:
   - Board task-position lock: caller should treat `false` as
     "could not lock, retry or reject the request" — check
     `board.service.ts` doesn't already assume `acquireLock` can't fail
     in a way that needs new error handling; it likely just needs the
     existing "lock not acquired" branch to now also cover the error
     case, which it should already have since `true`/`false` was always
     a possible return.
   - Chat rate limiter: `false` under a Redis outage means "reject the
     message" — confirm that's the desired degrade behavior (probably
     yes: an outage is exactly when you don't want an unbounded flood
     hitting an already-degraded dependency).

**Test:** unit test mocking the Redis client to throw inside
`acquireLock`, assert the method returns `false` (not `true`).

### Cluster 4 — Cross-workspace authorization (`board.service.ts`)
**Files:** `apps/backend/src/board/board.service.ts`

1. **[High] `reorderModules` doesn't scope `project_id` to the workspace.**
   Same shape as the prior audit's Pass 1 IDOR fix — before the
   transaction, collect the distinct non-null `project_id`s from the
   update payload and run one scoped query
   (`workspaceProject.findMany({ where: { id: { in }, workspace_id: workspaceId } })`)
   confirming the count matches; reject with `ForbiddenException` (not
   `NotFoundException`, since the id does exist, just not in scope) if
   not.

**Test:** unit test asserting a `reorderModules` call with a `project_id`
belonging to a different workspace throws, and that Prisma's
`updateMany`/transaction is never called in that case.

### Cluster 5 — Frontend loading-state race (regression from Pass 5)
**Files:** `apps/frontend/dash/providers/workspace.provider.tsx`,
`apps/frontend/dash/components/l-sidebar.tsx`,
`apps/frontend/dash/app/[slug]/home-dashboard.tsx`

1. **[High] `activeWorkspace!.id` crashes when `activeId` resolves first.**
   Don't just swap `!` for `?.` — that hides the symptom while leaving a
   render with missing workspace data. Two-part fix:
   - Render-guard: any JSX branch that needs `activeWorkspace` fields
     (not just its id) should have its own loading fallback
     (`if (!activeWorkspace) return <SidebarSkeleton />` at the point
     those fields are first used), consistent with how the rest of the
     dashboard already handles per-query loading states.
   - Where only the *id* is needed (routing, query keys, the mutations in
     item 2 below), use `activeId` directly instead of
     `activeWorkspace?.id` — it's already resolved faster and is the
     value Pass 5 introduced specifically so dependent queries wouldn't
     wait on the slower detail fetch. Using it consistently removes most
     of the reasons `activeWorkspace` needs to be read before it's ready.
2. **[Medium] Mutations bound to slow `activeWorkspace?.id || ""`.**
   Rebind `useTogglePinModule`, `useCreateProject`, `useReorderModules`
   (and any sibling mutation hooks with the same pattern) to `activeId`
   instead — matches the query hooks they act on, which already made
   this switch in Pass 5. Removes the `|| ""` fallback entirely: if
   `activeId` is meaningfully "not yet known," the mutating UI (pin
   button, create-project button) should be disabled/hidden until it is,
   rather than silently building a malformed request.

**Test:** manual — throttle network (Chrome DevTools "Slow 3G"), navigate
to a workspace cold, confirm no crash and no network requests with an
empty workspace id segment in the URL. No unit test infra exists for
this app yet per the prior spec's scope note; not adding one just for
this fix.

## Sequencing recommendation

Risk-reduction order (exposure × exploitability × blast radius), not file
convenience this time — these are mostly independent files:

1. **Cluster 1** — authenticated, zero-click privilege/state escalation
   (self-verify email, forge timestamps) plus an active production
   lockout bug (signin 404). Highest exploitability, currently shipping.
2. **Cluster 2** — SSRF is network-reachable by any authenticated member
   and can pivot into internal infrastructure recon; data-loss and
   duplicate-retry bugs are reliability issues but compound with it since
   all three live in the same gateway/processor pipeline.
3. **Cluster 4** — same IDOR class as the previous audit's Critical
   finding; smaller blast radius (module→project link) but same category
   of bug worth closing before it's forgotten.
4. **Cluster 3** — correctness/availability issue, lower likelihood
   (requires a Redis error, not just any request) but cheap to fix and
   touches security-adjacent code (rate limiter).
5. **Cluster 5** — user-facing crash, no data or security exposure;
   lowest priority of the five but worst user experience if left, so
   still worth doing this pass rather than deferring.

## Out of scope

- **Shared SSRF-guard utility beyond chat.** Writing `assertPublicUrl` as
  a standalone function is in-scope (Cluster 2), but auditing every other
  outbound-fetch call site in the codebase for the same issue is not —
  flag as a follow-up sweep once this function exists to import.
- **Full mass-assignment audit of every DTO.** Cluster 1 only covers the
  user DTO this pass found. Recommend a dedicated follow-up pass over
  every `@Body() dto` controller parameter checking for the same
  public/system field-separation issue before launch — this bug class
  (one bad DTO) is exactly the kind that tends to exist more than once.
- **Rate limiter redesign.** Cluster 3 restores the *intended* fail-closed
  behavior of the existing lock primitive; it doesn't change the rate
  limiting algorithm or thresholds themselves.
- **E2E/DB test harness.** Same note as the prior spec — none exists,
  building one is a separate effort. Tests above are unit-level against
  mocked Prisma/Redis clients, consistent with the existing convention.
