# Auth Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three auth-security gaps: no rate limit on signin/signup/password-reset, no refresh-token-reuse detection, and WebSocket connections that don't respect role revocation.

**Architecture:** Additive changes only. A new `family_id` column on `Session` links every session descended from one login so a replayed (already-rotated) refresh token can trigger revocation of the whole chain. Per-route `@Throttle` decorators tighten the three abuse-prone auth endpoints. Both WebSocket gateways gain the same `role_version` check `JwtStrategy` already does for REST, both at connect and in their existing 60s revocation-poll interval.

**Tech Stack:** NestJS 11, Prisma (PostgreSQL), `@nestjs/throttler` v6, `@nestjs/jwt`, Socket.IO, Jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-09-13-auth-security-hardening-design.md`

## Global Constraints

- `@nestjs/throttler` v6 reads `ttl` in **milliseconds**. Every `@Throttle` value in this plan is already correct — do not copy the `ttl: 3600`-style (seconds-shaped) values seen elsewhere in the codebase (`workspace.controller.ts`, `chat.controller.ts`, `user.controller.ts`); those are a pre-existing bug, out of scope here.
- `family_id` must NOT be added to `sessionPublicSelect` (`src/prisma/selects.ts`) — it is internal-only and must not leak into any existing API response shape.
- No signature changes to `AuthService.refresh()`, `AuthController`, or any frontend code. The exception-type change (`BadRequestException` → `UnauthorizedException`) happens at the single throw site inside `SessionService.rotate()`, which is enough for `AllExceptionsFilter` to return the correct status — nothing downstream needs to change.
- Run backend unit tests from `apps/backend`: `npx jest <relative/path/to/spec.ts>`. Full suite: `npx jest`.
- Follow existing file conventions: double quotes, 2-space indent, no comments except unit-clarifying trailing ones, absolute `src/...` imports.

---

### Task 1: `family_id` schema migration

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (`Session` model, ~lines 105-119)
- Create: `apps/backend/prisma/migrations/<TIMESTAMP>_add_session_family_id/migration.sql`

**Interfaces:**
- Produces: `Session.family_id: string` (Prisma Client field), available to Task 2 as `dto.family_id`, `oldSession.family_id`, `session.family_id`.

- [ ] **Step 1: Update the Prisma schema**

Edit `apps/backend/prisma/schema.prisma`. Current `Session` model:

```prisma
model Session {
  id                 String    @id @db.Uuid
  user_id            String    @db.Uuid
  user               User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  refresh_token_hash String    @db.Text
  persistent         Boolean   @default(false)
  created_at         DateTime  @default(now()) @db.Timestamptz
  expires_at         DateTime? @db.Timestamptz
  revoked_at         DateTime? @db.Timestamptz
  ua                 String?   @db.Text
  ip                 String?   @db.Text

  @@index([user_id], map: "idx_session_user_id")
  @@map("sessions")
}
```

Replace with:

```prisma
model Session {
  id                 String    @id @db.Uuid
  user_id            String    @db.Uuid
  user               User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  family_id          String    @db.Uuid
  refresh_token_hash String    @db.Text
  persistent         Boolean   @default(false)
  created_at         DateTime  @default(now()) @db.Timestamptz
  expires_at         DateTime? @db.Timestamptz
  revoked_at         DateTime? @db.Timestamptz
  ua                 String?   @db.Text
  ip                 String?   @db.Text

  @@index([user_id], map: "idx_session_user_id")
  @@index([family_id], map: "idx_session_family_id")
  @@map("sessions")
}
```

- [ ] **Step 2: Hand-author the migration file**

Get a timestamp newer than the latest existing migration (`20260912105635`):

Run: `date +%Y%m%d%H%M%S`

Create `apps/backend/prisma/migrations/<TIMESTAMP>_add_session_family_id/migration.sql` (replace `<TIMESTAMP>` with the value from the command above) with exactly:

```sql
-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "family_id" UUID;

-- Backfill: every pre-existing session becomes its own single-member family
UPDATE "sessions" SET "family_id" = "id" WHERE "family_id" IS NULL;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "family_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "idx_session_family_id" ON "sessions"("family_id");
```

This mirrors the three-step add-nullable/backfill/set-not-null pattern required whenever a `NOT NULL` column is added to a non-empty table — a plain `ADD COLUMN ... NOT NULL` with no default would fail against existing rows.

- [ ] **Step 3: Apply the migration and regenerate the client**

Run (from `apps/backend`):
```bash
npx prisma migrate dev
```
Expected: Prisma detects the new migration folder already on disk, applies it, reports schema now in sync with no drift, and regenerates the Prisma Client. If it instead offers to create a *new* migration, the schema edit in Step 1 doesn't match the SQL in Step 2 — stop and reconcile them before continuing.

- [ ] **Step 4: Verify the client picked up the new field**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no new type errors. (`SessionService`/tasks below don't exist yet, so this just confirms `Prisma.SessionGetPayload`/`Prisma.SessionSelect` now include `family_id` without breaking anything currently compiling.)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(db): add family_id to sessions for refresh-token-reuse detection"
```

---

### Task 2: `SessionService` — family tracking, reuse detection, `revokeFamily`

**Files:**
- Modify: `apps/backend/src/session/session.service.ts`
- Modify: `apps/backend/src/session/dto/create-session.dto.ts`
- Test: `apps/backend/src/session/session.service.spec.ts` (new)

**Interfaces:**
- Consumes: `Session.family_id` from Task 1; `CacheKeys.session(id: string): string`, `CacheTTL.SESSION: 300` from `src/redis`; `PrismaService`; `CacheService.get<T>()/set<T>()/del(keys)`.
- Produces:
  - `CreateSessionDto.family_id?: string` (new optional field)
  - `SessionService.create(dto, req)` — unchanged signature, `family_id` now defaults to `dto.family_id ?? dto.id`
  - `SessionService.rotate(dto, req)` — unchanged signature/return shape; on replay throws `UnauthorizedException` (was `BadRequestException`) and calls `revokeFamily` first
  - `SessionService.revokeFamily(familyId: string): Promise<void>` — new method, used by Task 2 only (internal to `rotate()`'s replay path)

- [ ] **Step 1: Add `family_id` to `CreateSessionDto`**

Edit `apps/backend/src/session/dto/create-session.dto.ts`:

```typescript
import { IsBoolean, IsOptional, IsUUID } from "class-validator";


export class CreateSessionDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  user_id!: string;

  @IsOptional()
  @IsUUID()
  family_id?: string;

  @IsOptional()
  @IsBoolean()
  persistent?: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

Create `apps/backend/src/session/session.service.spec.ts`:

```typescript
import { UnauthorizedException } from "@nestjs/common";
import { SessionService } from "./session.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CacheService } from "src/redis";
import type { Request } from "express";

function makeService() {
  const prisma = {
    user: { findUnique: jest.fn() },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SessionService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
  );
  return { service, prisma, cache };
}

const req = { headers: {}, ip: "127.0.0.1" } as unknown as Request;

describe("SessionService.create (family_id defaulting)", () => {
  it("defaults family_id to the session's own id when not supplied", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.session.create.mockImplementation(({ data }) => ({
      id: data.id,
      user_id: data.user.connect.id,
      family_id: data.family_id,
      persistent: data.persistent,
      created_at: data.created_at,
      expires_at: data.expires_at,
      revoked_at: null,
      ua: data.ua,
      ip: data.ip,
    }));

    const { session } = await service.create({ id: "session-1", user_id: "user-1" }, req);

    expect(session.family_id).toBe("session-1");
  });

  it("uses the supplied family_id when provided", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.session.create.mockImplementation(({ data }) => ({
      id: data.id,
      family_id: data.family_id,
    }));

    const { session } = await service.create(
      { id: "session-2", user_id: "user-1", family_id: "family-root" },
      req,
    );

    expect(session.family_id).toBe("family-root");
  });
});

describe("SessionService.rotate (family_id propagation + reuse detection)", () => {
  it("propagates the old session's family_id to the newly rotated session", async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: "old-session",
      family_id: "family-root",
      expires_at: null,
      revoked_at: null,
    });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    prisma.session.create.mockImplementation(({ data }) => ({
      id: data.id,
      family_id: data.family_id,
    }));

    const { session } = await service.rotate(
      { user_id: "user-1", old_token: "raw-token", persistent: false },
      req,
    );

    expect(session.family_id).toBe("family-root");
  });

  it("revokes the entire session family and throws Unauthorized when the token was already rotated", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: "old-session",
      family_id: "family-root",
      expires_at: null,
      revoked_at: null,
    });
    prisma.session.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.session.findMany.mockResolvedValue([{ id: "sibling-1" }, { id: "sibling-2" }]);
    prisma.session.updateMany.mockResolvedValueOnce({ count: 2 });

    await expect(
      service.rotate({ user_id: "user-1", old_token: "raw-token", persistent: false }, req),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ family_id: "family-root" }) }),
    );
    expect(cache.del).toHaveBeenCalledWith(["session:sibling-1", "session:sibling-2"]);
  });
});

describe("SessionService.revokeFamily", () => {
  it("revokes every unrevoked session in the family and invalidates their cache entries", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    prisma.session.updateMany.mockResolvedValue({ count: 2 });

    await service.revokeFamily("family-root");

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { family_id: "family-root", revoked_at: null },
      data: { revoked_at: expect.any(Date) },
    });
    expect(cache.del).toHaveBeenCalledWith(["session:a", "session:b"]);
  });

  it("does not call cache.del when the family has no active sessions", async () => {
    const { service, prisma, cache } = makeService();
    prisma.session.findMany.mockResolvedValue([]);
    prisma.session.updateMany.mockResolvedValue({ count: 0 });

    await service.revokeFamily("empty-family");

    expect(cache.del).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd apps/backend && npx jest session/session.service.spec.ts`
Expected: FAIL — `family_id` doesn't exist on `create`'s return, `revokeFamily` is not a function, replay still throws `BadRequestException`.

- [ ] **Step 4: Implement `family_id` defaulting in `create()`**

In `apps/backend/src/session/session.service.ts`, modify the `create` method:

```typescript
  async create(dto: CreateSessionDto, req: Request): Promise<{ session: SessionPublic; token: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.user_id }, select: { id: true } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const exp = dto.persistent
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        id: dto.id,
        user: { connect: { id: dto.user_id } },
        family_id: dto.family_id ?? dto.id,
        refresh_token_hash: hashedToken,
        persistent: dto.persistent ?? false,
        expires_at: exp,
        ip: getClientIp(req) || null,
        ua: getUserAgent(req) || null,
        created_at: new Date(),
      },
      select: sessionPublicSelect,
    });

    return { session, token };
  }
```

(Only the added `family_id: dto.family_id ?? dto.id,` line is new.)

- [ ] **Step 5: Implement family propagation + reuse detection in `rotate()`**

Modify the `rotate` method:

```typescript
  async rotate(dto: RotateSessionDto, req: Request): Promise<{ session: SessionPublic; refreshToken: string }> {
    const oldHashedToken = createHash("sha256").update(dto.old_token).digest("hex");
    const oldSession = await this.prisma.session.findFirst({
      where: { user_id: dto.user_id, refresh_token_hash: oldHashedToken },
      select: { id: true, family_id: true, expires_at: true, revoked_at: true },
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
      await this.revokeFamily(oldSession.family_id);
      throw new UnauthorizedException("Session already used — possible token reuse detected");
    }
    await this.cache.del(CacheKeys.session(oldSession.id));

    const { session: newSession, token: refreshToken } = await this.create(
      { id: randomUUID(), user_id: dto.user_id, persistent: dto.persistent, family_id: oldSession.family_id },
      req,
    );

    return { session: newSession, refreshToken };
  }
```

Changes from the current implementation: `select` on `oldSession` now includes `family_id`; the `claimed.count === 0` branch calls `revokeFamily` and throws `UnauthorizedException` instead of `BadRequestException`; the `create()` call now passes `family_id: oldSession.family_id`.

- [ ] **Step 6: Implement `revokeFamily`**

Add this method to `SessionService`, next to the existing `revokeAll` (same file):

```typescript
  async revokeFamily(familyId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { family_id: familyId, revoked_at: null },
      select: { id: true },
    });

    await this.prisma.session.updateMany({
      where: { family_id: familyId, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    const cacheKeys = sessions.map((s) => CacheKeys.session(s.id));
    if (cacheKeys.length > 0) {
      await this.cache.del(cacheKeys);
    }
  }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd apps/backend && npx jest session/session.service.spec.ts`
Expected: PASS (all 6 tests).

- [ ] **Step 8: Run the full backend unit suite to check for regressions**

Run: `cd apps/backend && npx jest`
Expected: PASS. `auth.service.spec.ts` mocks `sessionService.create` directly and doesn't assert on `family_id`, so it's unaffected. `jwt.strategy.spec.ts` doesn't touch `SessionService.rotate`/`create`, also unaffected.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/session
git commit -m "feat(auth): detect refresh-token reuse and revoke the whole session family"
```

---

### Task 3: Per-route throttling on signin, signup, password-reset creation

**Files:**
- Modify: `apps/backend/src/auth/auth.controller.ts`
- Modify: `apps/backend/src/password-reset/password-reset.controller.ts`

**Interfaces:**
- Consumes: `@Throttle` from `@nestjs/throttler` (already a project dependency; `@SkipThrottle` from the same package is already imported in `auth.controller.ts`).
- Produces: nothing consumed by other tasks — independent, can ship in any order relative to Tasks 1/2/4.

- [ ] **Step 1: Add throttling to `signin` and `signup`**

In `apps/backend/src/auth/auth.controller.ts`, change the import line:

```typescript
import { SkipThrottle } from "@nestjs/throttler";
```
to:
```typescript
import { SkipThrottle, Throttle } from "@nestjs/throttler";
```

Add `@Throttle` above the `signup` handler:

```typescript
  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }
```

Add `@Throttle` above the `signin` handler:

```typescript
  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(
    @Body() dto: SigninDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
```
(only the `@Throttle(...)` line is new above each handler; the rest of each method body is unchanged.)

- [ ] **Step 2: Add throttling to password-reset creation**

In `apps/backend/src/password-reset/password-reset.controller.ts`, add the import:

```typescript
import { Throttle } from "@nestjs/throttler";
```

Add `@Throttle` above the `create` handler:

```typescript
  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePasswordResetDto): Promise<PasswordResetPublic> {
    return this.passwordResetService.create(dto);
  }
```

- [ ] **Step 3: Type-check**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start the backend dev server (`pnpm --filter backend dev` from repo root, or the project's existing dev command), then run:

```bash
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"identifier":"nonexistent@example.com","password":"wrong"}'
done
```

Expected: the first 10 lines print `401` (invalid credentials), the 11th prints `429` (Too Many Requests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/auth/auth.controller.ts apps/backend/src/password-reset/password-reset.controller.ts
git commit -m "feat(auth): rate-limit signin, signup, and password-reset creation"
```

---

### Task 4: WebSocket `role_version` parity (ChatGateway + StatusGateway)

**Files:**
- Modify: `apps/backend/src/chat/chat.gateway.ts`
- Modify: `apps/backend/src/status/status.gateway.ts`
- Test: `apps/backend/src/chat/chat.gateway.spec.ts` (new)
- Test: `apps/backend/src/status/status.gateway.spec.ts` (extend existing)

**Interfaces:**
- Consumes: `payload.rver: number` (already present on the JWT payload — see `apps/backend/src/auth/auth.service.ts`'s `payload()` builder), `user.role_version: number` (Prisma `User` field, already used the same way in `apps/backend/src/auth/jwt.strategy.ts:38-41`).
- Produces: nothing consumed elsewhere — independent task.

- [ ] **Step 1: Write the failing test for `ChatGateway`**

Create `apps/backend/src/chat/chat.gateway.spec.ts`:

```typescript
import { ChatGateway } from "./chat.gateway";
import { PrismaService } from "src/prisma/prisma.service";
import { ChatService } from "src/chat/chat.service";
import { StatusGateway } from "src/status/status.gateway";
import { SessionService } from "src/session/session.service";
import { CacheService } from "src/redis";
import { NotificationService } from "src/notification/notification.service";
import { JwtService } from "@nestjs/jwt";
import { Queue } from "bullmq";
import { Socket } from "socket.io";

function makeGateway() {
  const prisma = { user: { findUnique: jest.fn() } };
  const jwtService = { verify: jest.fn() };
  const sessionService = { findOne: jest.fn() };
  const chatService = {};
  const statusGateway = {};
  const cache = {};
  const notificationService = {};
  const messageQueue = {};

  const gateway = new ChatGateway(
    jwtService as unknown as JwtService,
    prisma as unknown as PrismaService,
    chatService as unknown as ChatService,
    statusGateway as unknown as StatusGateway,
    sessionService as unknown as SessionService,
    cache as unknown as CacheService,
    notificationService as unknown as NotificationService,
    messageQueue as unknown as Queue,
  );
  return { gateway, prisma, jwtService, sessionService };
}

describe("ChatGateway.handleConnection (role_version check)", () => {
  it("disconnects when the token's role version no longer matches the user's current role_version", async () => {
    const { gateway, prisma, jwtService, sessionService } = makeGateway();
    jwtService.verify.mockReturnValue({ sub: "user-1", jti: "session-1", rver: 1 });
    sessionService.findOne.mockResolvedValue({ revoked_at: null, expires_at: null });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstname: "A",
      lastname: "B",
      avatar_key: null,
      role_version: 2,
    });

    const client = {
      id: "socket-1",
      data: {} as Record<string, unknown>,
      handshake: { auth: { token: "token" }, headers: {} },
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalled();
  });

  it("connects when the token's role version matches", async () => {
    const { gateway, prisma, jwtService, sessionService } = makeGateway();
    jwtService.verify.mockReturnValue({ sub: "user-1", jti: "session-1", rver: 1 });
    sessionService.findOne.mockResolvedValue({ revoked_at: null, expires_at: null });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstname: "A",
      lastname: "B",
      avatar_key: null,
      role_version: 1,
    });

    const client = {
      id: "socket-1",
      data: {} as Record<string, unknown>,
      handshake: { auth: { token: "token" }, headers: {} },
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(client.disconnect).not.toHaveBeenCalled();
    await gateway.handleDisconnect(client);
  });
});
```

- [ ] **Step 2: Write the failing test for `StatusGateway`**

Append to `apps/backend/src/status/status.gateway.spec.ts` (existing file — add this new `describe` block; do not modify the existing `makeGateway()` helper's signature since other tests use it):

```typescript
describe("StatusGateway.handleConnection (role_version check)", () => {
  it("disconnects when the token's role version no longer matches the user's current role_version", async () => {
    const { gateway, prisma, jwtService, sessionService } = makeGateway();
    jwtService.verify.mockReturnValue({ sub: "user-1", jti: "session-1", rver: 1 });
    sessionService.findOne.mockResolvedValue({ revoked_at: null, expires_at: null });
    prisma.user.findUnique.mockResolvedValue({ id: "user-1", role_version: 2 });
    (gateway as unknown as { server: unknown }).server = { in: () => ({ fetchSockets: async () => [] }) };

    const client = {
      id: "socket-1",
      data: {} as Record<string, unknown>,
      handshake: { auth: { token: "token" }, headers: {} },
      join: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run both gateway test files to verify they fail**

Run: `cd apps/backend && npx jest chat/chat.gateway.spec.ts status/status.gateway.spec.ts`
Expected: FAIL — `prisma.user.findUnique` is never called with a `role_version` select today in `StatusGateway`, and neither gateway disconnects on mismatch yet (`ChatGateway`'s first test fails because nothing currently disconnects it; `StatusGateway`'s new test fails the same way).

- [ ] **Step 4: Add the `role_version` check to `ChatGateway`**

In `apps/backend/src/chat/chat.gateway.ts`, modify `handleConnection` (the existing user-fetch already selects fields — widen the `select` and add the comparison right after it):

```typescript
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

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, firstname: true, lastname: true, avatar_key: true, role_version: true },
      });

      if (!user || user.role_version !== payload.rver) {
        client.disconnect();
        return;
      }

      client.data.userId = payload.sub;
      client.data.sessionId = payload.jti;
      client.data.user = user;

      this.revocationChecks.set(
        client.id,
        setInterval(async () => {
          const current = await this.sessionService.findOne(payload.jti).catch(() => null);
          if (!current || current.revoked_at) {
            client.disconnect();
            return;
          }
          const stillValid = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { role_version: true },
          });
          if (!stillValid || stillValid.role_version !== payload.rver) {
            client.disconnect();
          }
        }, 60_000),
      );

      this.logger.debug(`Chat client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      this.logger.error(`Chat connection error: ${error}`);
      client.disconnect();
    }
  }
```

Note: the `user` fetch moved earlier (before setting `client.data`) so the role-version check can reject the connection before any client data is populated — this changes the fetch's position but not its query shape beyond the added `role_version` field and the moved `client.data.userId`/`client.data.sessionId` assignments below it.

- [ ] **Step 5: Add the `role_version` check to `StatusGateway`**

In `apps/backend/src/status/status.gateway.ts`, modify `handleConnection`:

```typescript
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

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role_version: true },
      });

      if (!user || user.role_version !== payload.rver) {
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

      this.revocationChecks.set(
        client.id,
        setInterval(async () => {
          const current = await this.sessionService.findOne(payload.jti).catch(() => null);
          if (!current || current.revoked_at) {
            client.disconnect();
            return;
          }
          const stillValid = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { role_version: true },
          });
          if (!stillValid || stillValid.role_version !== payload.rver) {
            client.disconnect();
          }
        }, 60_000),
      );

      this.logger.debug(`Client connected: ${client.id} (User: ${userId}, Count: ${count})`);
    } catch (error) {
      this.logger.error(`Error during client connection: ${error}`);
      client.disconnect();
    }
  }
```

- [ ] **Step 6: Run both gateway test files to verify they pass**

Run: `cd apps/backend && npx jest chat/chat.gateway.spec.ts status/status.gateway.spec.ts --verbose`
Expected: PASS, including the pre-existing `StatusGateway.handleSubscribeWorkspace` tests and the pre-existing `"keeps the revocation interval out of client.data..."` test. That pre-existing test's default `prisma.user.findUnique.mockResolvedValue(null)` (set in `makeGateway()`) now makes the gateway disconnect earlier than before (at the new `role_version` check, since `!user` is true) — but the test only asserts `client.data.revocationCheck` is `undefined` and that `JSON.stringify(client.data)` doesn't throw, neither of which the gateway ever sets true either way (the real interval handle lives in `this.revocationChecks`, a `Map` keyed by `client.id`, never on `client.data`). It does not assert `disconnect` was or wasn't called, so the earlier disconnect doesn't break it — no edit to that test is needed.

- [ ] **Step 7: Run the full backend unit suite to check for regressions**

Run: `cd apps/backend && npx jest`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/chat/chat.gateway.ts apps/backend/src/chat/chat.gateway.spec.ts apps/backend/src/status/status.gateway.ts apps/backend/src/status/status.gateway.spec.ts
git commit -m "feat(realtime): disconnect sockets whose role_version has gone stale"
```

---

## Post-implementation checklist

- [ ] `cd apps/backend && npx jest` — full suite green.
- [ ] `cd apps/backend && npx eslint src/auth src/session src/chat src/status src/password-reset` — clean.
- [ ] Manual: sign in on two browser profiles as the same test user, force a refresh-token replay (reuse an old cookie value after a legitimate refresh has happened), confirm both sessions get logged out.
- [ ] Manual: demote a signed-in test user's role via the DB directly, wait up to 60s with an open chat/status socket connection, confirm it disconnects.
- [ ] Manual: Task 3's curl loop against a running dev server, confirm the 11th `/auth/signin` request returns 429.
