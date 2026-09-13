# Auth Security Hardening — Design

**Date:** 2026-09-13
**Status:** Approved for planning
**Scope:** Critical + High severity findings from the auth-logic audit. Medium/low findings (cookie-clear dedup, dead code in `proxy.ts`, admin session-endpoint exposure, DTO decorator nit) are out of scope here — fixed separately as isolated one-file diffs, no spec needed.

## Background

A full audit of the auth system (backend `auth`/`session` modules, guards, JWT strategy, WebSocket gateways, frontend interceptor/middleware) surfaced three findings that need a coordinated design rather than a one-line patch:

1. **No dedicated rate limit on `signin`/`signup`/password-reset creation.** These endpoints only inherit the global default (`{ ttl: 60_000, limit: 100 }`, i.e. 100 req/min/IP) — brute-forceable.
2. **Refresh-token reuse isn't treated as theft.** `SessionService.rotate()` rejects a replayed (already-rotated) refresh token but takes no protective action — the session family that token belongs to stays live.
3. **WebSocket auth doesn't check `role_version`.** Unlike `JwtStrategy`, `ChatGateway`/`StatusGateway` verify the JWT and session revocation but never compare `payload.rver` to the user's live `role_version` — a demoted/banned user keeps a stale-privilege live socket until natural token expiry or reconnect.

Adjacent, out-of-scope discovery: `@nestjs/throttler` v6 (already installed) reads `ttl` in **milliseconds**, but several existing `@Throttle({ ttl: 3600, ... })` calls (`workspace.controller.ts`, `chat.controller.ts`, `user.controller.ts`) clearly intend seconds/hours — so those "5/hour" limits currently enforce roughly 5-per-3.6-seconds. Noted so the new decorators in this spec don't repeat the mistake; not fixed here.

## Goals

- Bring `signin`/`signup`/password-reset-creation rate limiting in line with the codebase's own "per-route throttling is tuned, not default" convention.
- Detect refresh-token replay and contain it by revoking the entire session family it belongs to, forcing re-authentication on every affected device.
- Make WebSocket connections respect role revocation with the same latency the REST layer already has (immediate on reconnect, ≤60s on an open connection).
- Zero regression risk to existing consumers: no signature changes to public service methods, no new fields exposed over existing API response shapes, no frontend changes required beyond what the auth-flow fix already shipped.

## Non-goals

- Email/SMS alerting on reuse detection (logging only for now; alerting is a future iteration).
- IP-based reuse geolocation/anomaly scoring.
- Fixing the pre-existing `ttl` unit bug in other controllers.
- The medium/low findings listed in Scope above.

## Design

### 1. Per-route throttling

`apps/backend/src/auth/auth.controller.ts`:

| Route | Throttle | Rationale |
|---|---|---|
| `POST /auth/signin` | `{ ttl: 300_000, limit: 10 }` (10 / 5 min / IP) | Cuts brute force from 144k/day to ~2,880/day/IP; generous enough for typo-prone real users. |
| `POST /auth/signup` | `{ ttl: 3_600_000, limit: 5 }` (5 / hour / IP) | Matches existing workspace-creation precedent; stops mass fake-account creation. |
| `POST /auth/refresh`, `POST /auth/session` | unchanged (global default / `@SkipThrottle()`) | Refresh tokens are 256-bit random hex, unguessable — tightening buys nothing and risks breaking legitimate multi-tab/reconnect traffic. `/auth/session` is the boot-time check called on every page load and must stay open. |

`apps/backend/src/password-reset/password-reset.controller.ts`:

| Route | Throttle | Rationale |
|---|---|---|
| `POST /password-resets` (create) | `{ ttl: 3_600_000, limit: 5 }` (5 / hour / IP) | Currently has no throttle decorator at all; prevents email-bombing a victim's inbox. |

`ThrottlerGuard` already keys by `req.ip`, and `main.ts` already sets `trust proxy: true`, so this works correctly behind the existing load balancer with no additional plumbing. All-additive change — no existing behavior modified, so no regression surface.

### 2. Refresh-token reuse → session-family revocation

**Schema change** (`apps/backend/prisma/schema.prisma`, `Session` model):

```prisma
model Session {
  id                 String    @id @db.Uuid
  user_id            String    @db.Uuid
  user               User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  family_id          String    @db.Uuid          // NEW
  refresh_token_hash String    @db.Text
  persistent         Boolean   @default(false)
  created_at         DateTime  @default(now()) @db.Timestamptz
  expires_at         DateTime? @db.Timestamptz
  revoked_at         DateTime? @db.Timestamptz
  ua                 String?   @db.Text
  ip                 String?   @db.Text

  @@index([user_id], map: "idx_session_user_id")
  @@index([family_id], map: "idx_session_family_id")   // NEW
  @@map("sessions")
}
```

Migration backfills `family_id = id` for every pre-existing row, so no pre-existing session is retroactively linked to an unrelated one — each becomes its own single-member family until it next rotates.

**`SessionService` changes** (`apps/backend/src/session/session.service.ts`):

- `create()`: accepts an optional `family_id` in its DTO. When omitted (fresh login via `AuthService.signin`), the new session's `family_id` defaults to its own `id` — it becomes a family root.
- `rotate()`: the newly created session now passes the **old** session's `family_id` through to `create()`, so every session descended from one login shares a single `family_id`, regardless of how many times it's been refreshed.
- `rotate()` failure path: when the atomic claim fails (`claimed.count === 0` — the presented refresh token was already consumed by a prior rotation, i.e. replay), look up the dead session's `family_id` (a plain `findUnique` — the row still exists, only `revoked_at` differs) and call the new `revokeFamily(familyId)` before throwing.
- New method `revokeFamily(familyId: string): Promise<void>` — same shape as the existing `revokeAll(userId, excludeSessionId?)`: bulk `updateMany({ where: { family_id: familyId, revoked_at: null }, data: { revoked_at: new Date() } })`, then `cache.del` for every affected session id (fetch ids first, same pattern `revokeAll` already uses).

**`AuthService.refresh()` error surface** (`apps/backend/src/auth/auth.controller.ts` / `auth.service.ts`): the replay-detected throw changes from `BadRequestException` to `UnauthorizedException`. This is the only externally-visible change in this section, and it's the *correct* status for "your session is dead" — it also means the fix from the earlier auth-redirect bug (backend clears cookies on refresh failure; frontend interceptor hard-redirects to signin on refresh failure) applies automatically. No frontend code changes needed.

**Blast radius:** confined to `session.service.ts` (implementation), `schema.prisma` + one migration (schema), and one exception type in `auth.service.ts`. `AuthService.refresh()`'s call signature into `sessionService.rotate()` is unchanged. `family_id` is deliberately excluded from `sessionPublicSelect`, so it never appears in any existing API response (workspace/session-list endpoints, `/auth/me`, etc. are unaffected).

### 3. WebSocket `role_version` parity

`apps/backend/src/chat/chat.gateway.ts` and `apps/backend/src/status/status.gateway.ts`, mirroring the check `jwt.strategy.ts` already does for REST:

- **At `handleConnection`:** after the existing session-revocation check, compare `user.role_version !== payload.rver` and `client.disconnect()` on mismatch. `ChatGateway` already fetches the user row here (for `client.data.user`) — just widen its `select` to include `role_version`. `StatusGateway` doesn't currently fetch a user row at connect; add one minimal `select: { role_version: true }` lookup.
- **In the existing 60s `revocationChecks` interval:** alongside the current `sessionService.findOne` check, add a `select: { role_version: true }` lookup on the user and disconnect if it no longer matches `payload.rver` (captured in the closure, same as today). One extra indexed PK lookup every 60s per open socket — negligible load.

No shared helper extracted — `extractToken` is already duplicated verbatim between the two gateways, so one more mirrored ~3-line check is more consistent with the codebase's existing convention here than introducing a new shared module for it.

## Data flow (session-family revocation)

```
Legit client                    Attacker (stolen old RT)         Backend
     |                                  |                            |
     |--- POST /auth/refresh (RT1) ---->|                            |
     |                                  |                    rotate(): claim RT1 OK
     |                                  |                    new session S2, family=F
     |<---------- 200, RT2 -------------|                            |
     |                                  |                            |
     |                                  |--- POST /auth/refresh(RT1, replayed) -->
     |                                  |                    rotate(): claim RT1 FAILS
     |                                  |                    (already revoked_at set)
     |                                  |                    lookup family_id=F for RT1's session
     |                                  |                    revokeFamily(F) -> revokes S2 too
     |                                  |<----- 401 Unauthorized -------|
     |
     |--- next API call (any) ---------------------------------------->
     |<---------------------------- 401 (session S2 now revoked) ------|
     |   (interceptor: refresh also fails -> hard redirect to signin)
```

Both the legitimate device and the attacker end up logged out — correct containment behavior for a detected-theft scenario, at the cost of the legitimate user needing to re-authenticate. This is the accepted tradeoff (confirmed in brainstorming) over weaker log-only detection.

## Error handling

- `revokeFamily` failures (DB error) propagate as a 500 via the existing `AllExceptionsFilter` — no new error-handling path needed, matches how `revokeAll` already behaves.
- Cache invalidation in `revokeFamily` follows the exact `revokeAll` pattern (already proven correct and covered by the "never a blanket cache flush" project convention) — fetch affected ids, targeted `cache.del`.
- Gateway disconnects on role mismatch fail closed (disconnect), consistent with the existing revocation-check behavior on that code path.

## Testing plan

- **New `session.service.spec.ts`** (no existing spec for this service — follows the `auth.service.spec.ts` mocking pattern already in the repo):
  - `create()` defaults `family_id` to own `id` when not supplied.
  - `rotate()` propagates the old session's `family_id` to the new session.
  - `rotate()` on a replayed token calls `revokeFamily` with the correct `family_id` and still throws.
  - `revokeFamily()` bulk-revokes every session sharing the family id and invalidates cache per affected id, leaving unrelated families untouched.
- **`status.gateway.spec.ts`** (existing) extended, and a new **`chat.gateway.spec.ts`** added, following the same fixture pattern:
  - Connect succeeds when `role_version` matches.
  - Connect is rejected when `role_version` has already diverged at connect time.
  - Advancing the fake 60s interval timer after a server-side `role_version` bump triggers `disconnect()`.
- **Throttle:** manual smoke test (N+1 rapid `signin` attempts against a local server → expect 429 on the (limit+1)th) — no e2e harness exists in this repo to automate this today; documented as a manual verification step in the implementation plan rather than a unit test.

## Migration plan

One Prisma migration: add `family_id UUID NOT NULL` to `sessions`, backfilled `family_id = id` for existing rows before the `NOT NULL` constraint is applied (standard Prisma "add column with default then drop default" pattern, or a raw backfill step in the generated migration — implementation plan will follow whichever the generated migration needs). Add the `idx_session_family_id` index in the same migration. No application code needs to handle a nullable transition window since this is a single migration applied before the new code paths deploy.

## Rollout order

1. Migration (additive, backward-compatible — old code ignores the new column).
2. `SessionService` changes (family tracking + `revokeFamily`).
3. `AuthService`/`AuthController` exception-type change.
4. Throttle decorators (independent, can ship anytime).
5. Gateway `role_version` checks (independent, can ship anytime).

Steps 1-3 should ship together; 4 and 5 are independent and can land in any order relative to the others.
