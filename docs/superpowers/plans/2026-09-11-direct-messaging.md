# Direct Messaging (DMs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let workspace members start 1-on-1 private chat threads from the member list, reusing the existing team-chat data model, gateway, and UI almost entirely unmodified.

**Architecture:** `ChatRoom` gains three columns (`is_direct`, `dm_user_a_id`, `dm_user_b_id`) instead of a new model — a DM room skips the `WorkspaceModule` row a group-chat room gets, so it rides every existing `ChatMessage`/`ChatReadReceipt`/`ChatAttachment`/gateway/UI code path unmodified. A per-room participant check is added to the four spots that currently authorize by workspace-membership only (wrong for a private room type). One new controller (`DmController`) and one new gateway event (`dm:room_created`) are added; everything else is new call sites into existing machinery.

**Tech Stack:** NestJS + Prisma + Socket.IO (backend, `apps/backend`), Next.js + TanStack Query + Zustand (frontend, `apps/frontend/dash`), shared types in `packages/types`.

**Spec:** `docs/superpowers/specs/2026-09-11-direct-messaging-design.md`

## Global Constraints

- Double quotes, 2-space indentation, semicolons — match existing file style exactly.
- No comments except a trailing unit comment on magic numbers — none of this feature needs one.
- Query keys go through an `xKeys` factory object with `all`/`list` helpers (`dmKeys`), never raw inline arrays.
- Frontend services return `{ success, data?, message? }` and never throw past their own `try/catch` (see `chat.service.tsx`).
- Real-time state patches the React Query cache via `queryClient.setQueryData` directly; full `invalidateQueries` is the fallback only when the socket payload doesn't carry enough to patch precisely.
- `IsMemberGuard` is the existing workspace-membership guard (`src/workspace/guards/ws-member.guard.ts`) — every new controller reuses it, never reimplements membership checking.
- `pnpm lint` must pass in touched apps before a task is considered done.

---

### Task 1: Prisma schema — DM columns on `ChatRoom`

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:386-399` (the `ChatRoom` model)

**Interfaces:**
- Produces: `ChatRoom.is_direct: boolean`, `ChatRoom.dm_user_a_id: string | null`, `ChatRoom.dm_user_b_id: string | null` — every later backend task reads/writes these three fields via `this.prisma.chatRoom`.

- [ ] **Step 1: Add the three columns and unique index to the `ChatRoom` model**

In `apps/backend/prisma/schema.prisma`, replace:

```prisma
model ChatRoom {
  id           String   @id @default(uuid()) @db.Uuid
  workspace_id String   @db.Uuid
  name         String?  @db.Text
  created_at   DateTime @default(now()) @db.Timestamptz
  updated_at   DateTime @updatedAt @db.Timestamptz

  workspace     Workspace         @relation(fields: [workspace_id], references: [id], onDelete: Cascade)
  messages      ChatMessage[]
  read_receipts ChatReadReceipt[]

  @@index([workspace_id], map: "idx_chatroom_workspace_id")
  @@map("chat_rooms")
}
```

with:

```prisma
model ChatRoom {
  id           String   @id @default(uuid()) @db.Uuid
  workspace_id String   @db.Uuid
  name         String?  @db.Text
  is_direct    Boolean  @default(false)
  dm_user_a_id String?  @db.Uuid
  dm_user_b_id String?  @db.Uuid
  created_at   DateTime @default(now()) @db.Timestamptz
  updated_at   DateTime @updatedAt @db.Timestamptz

  workspace     Workspace         @relation(fields: [workspace_id], references: [id], onDelete: Cascade)
  messages      ChatMessage[]
  read_receipts ChatReadReceipt[]

  @@unique([workspace_id, dm_user_a_id, dm_user_b_id], map: "idx_chatroom_dm_unique")
  @@index([workspace_id], map: "idx_chatroom_workspace_id")
  @@map("chat_rooms")
}
```

`dm_user_a_id`/`dm_user_b_id` are always written as the sorted pair (enforced in Task 4's service code), so the unique index dedupes a DM room regardless of who opens it first. Non-DM rooms keep both columns `null`; Postgres allows unlimited rows with `null` in a unique index, so this doesn't constrain group chat rooms at all.

- [ ] **Step 2: Run the migration**

```bash
pnpm --filter @crwsync/backend prisma:migrate:dev -- --name add_dm_fields_to_chat_room
```

Expected: Prisma prints `Your database is now in sync with your schema` and creates `apps/backend/prisma/migrations/<timestamp>_add_dm_fields_to_chat_room/migration.sql` containing `ALTER TABLE "chat_rooms" ADD COLUMN ...` and `CREATE UNIQUE INDEX "idx_chatroom_dm_unique" ...`.

- [ ] **Step 3: Verify the generated Prisma client has the new fields**

```bash
pnpm --filter @crwsync/backend prisma:generate
```

Then confirm the fields exist:

```bash
grep -n "is_direct" node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/index.d.ts | head -3
```

Expected: at least one match showing `is_direct: boolean` inside the generated `ChatRoom` type. (If pnpm's content-addressed store makes that glob miss, `grep -rn "is_direct" apps/backend/node_modules/.prisma/client/index.d.ts` is the fallback path.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(chat): add DM columns to ChatRoom"
```

---

### Task 2: Shared types — DM fields and payload shapes

**Files:**
- Modify: `packages/types/src/chat.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ChatRoom.is_direct`/`dm_user_a_id`/`dm_user_b_id` fields (matches Task 1's Prisma model, read by frontend components in Tasks 5-7); `DmRoomSummary` (list-DM row shape); `CreateDmPayload` (request body shape for opening a DM).

- [ ] **Step 1: Add the three DM fields to `ChatRoom` and two new types**

In `packages/types/src/chat.ts`, replace:

```ts
export interface ChatRoom {
  id: string;
  workspace_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}
```

with:

```ts
export interface ChatRoom {
  id: string;
  workspace_id: string;
  name: string | null;
  is_direct: boolean;
  dm_user_a_id: string | null;
  dm_user_b_id: string | null;
  created_at: string;
  updated_at: string;
}
```

Then append at the end of the file:

```ts
export interface DmRoomSummary {
  room: ChatRoom;
  otherParticipant: ChatMessageSender;
  unread: boolean;
}

export interface CreateDmPayload {
  otherUserId: string;
}
```

- [ ] **Step 2: Build the types package to catch any downstream type errors**

```bash
pnpm --filter @crwsync/types build
```

Expected: builds clean with no errors (this package has no existing test suite — a clean build is the verification step for a pure type change).

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/chat.ts
git commit -m "feat(types): add DM fields to ChatRoom and DmRoomSummary/CreateDmPayload"
```

---

### Task 3: Backend — DM room access control

**Files:**
- Modify: `apps/backend/src/chat/chat.service.ts:75-100` (`getRoom`, `presignAttachment`), `:102-107` (`getMessages` signature)
- Modify: `apps/backend/src/chat/chat.controller.ts` (`findOne`, `getMessages`, `presignAttachment`)
- Modify: `apps/backend/src/chat/chat.gateway.ts:98-135` (`handleJoinRoom`)
- Test: `apps/backend/src/chat/chat.service.spec.ts`

**Interfaces:**
- Consumes: `ChatRoom.is_direct`/`dm_user_a_id`/`dm_user_b_id` (Task 1).
- Produces: `ChatService.getRoom(roomId, userId)`, `ChatService.getMessages(roomId, userId, cursor?, limit?, direction?)`, `ChatService.presignAttachment(workspaceId, roomId, userId, contentType, fileName)` — Task 4 does not call these, but any future caller must pass `userId` as the second positional argument. `ChatService.assertDmAccess(room, userId)` (private) — reused by Task 4's `getOrCreateDm`/`listDms` is not required, but the same guard shape is followed there.

This is a real behavior change independent of the DM feature: today any workspace member can call `GET /workspaces/:id/chat/:roomId` for *any* room in the workspace by ID. That's fine for open group channels but becomes a privacy bug the moment a private room type (`is_direct`) exists — so this task lands first, before Task 4 makes any `is_direct: true` room reachable.

- [ ] **Step 1: Write the failing tests for the access-control branch**

Add to `apps/backend/src/chat/chat.service.spec.ts`, inside the existing `describe("ChatService ...")` block (extend the `prisma` mock object first):

```ts
    prisma = {
      chatMessage: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      chatReadReceipt: {
        upsert: jest.fn().mockResolvedValue({ id: "receipt-1" }),
      },
      chatRoom: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
```

Then add a new `describe` block after the existing ones:

```ts
  describe("DM room access control", () => {
    const dmRoom = {
      id: "room-dm",
      workspace_id: "ws-1",
      is_direct: true,
      dm_user_a_id: "user-a",
      dm_user_b_id: "user-b",
    };
    const groupRoom = {
      id: "room-group",
      workspace_id: "ws-1",
      is_direct: false,
      dm_user_a_id: null,
      dm_user_b_id: null,
    };

    it("getRoom returns the room for a DM participant", async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(dmRoom);

      const result = await chatService.getRoom("room-dm", "user-a");

      expect(result).toEqual({ success: true, data: dmRoom });
    });

    it("getRoom throws NotFoundException for a non-participant", async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(dmRoom);

      await expect(chatService.getRoom("room-dm", "user-c")).rejects.toThrow(
        "Chat room not found",
      );
    });

    it("getRoom allows any workspace member into a non-DM room", async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(groupRoom);

      const result = await chatService.getRoom("room-group", "user-c");

      expect(result).toEqual({ success: true, data: groupRoom });
    });

    it("presignAttachment throws NotFoundException for a non-participant", async () => {
      prisma.chatRoom.findFirst.mockResolvedValue(dmRoom);

      await expect(
        chatService.presignAttachment("ws-1", "room-dm", "user-c", "image/png", "a.png"),
      ).rejects.toThrow("Chat room not found");
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @crwsync/backend test -- chat.service.spec.ts
```

Expected: FAIL — `chatService.getRoom("room-dm", "user-a")` is a TypeScript error today (`getRoom` takes one argument), and the non-participant cases don't throw yet.

- [ ] **Step 3: Add `assertDmAccess` and update `getRoom`/`getMessages`/`presignAttachment`**

In `apps/backend/src/chat/chat.service.ts`, add `BadRequestException` to the existing import (used by Task 4, add it now to avoid touching this line twice):

```ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
```

Add this private method to the `ChatService` class, right after the constructor:

```ts
  private assertDmAccess(
    room: { is_direct: boolean; dm_user_a_id: string | null; dm_user_b_id: string | null },
    userId: string,
  ) {
    if (room.is_direct && room.dm_user_a_id !== userId && room.dm_user_b_id !== userId) {
      throw new NotFoundException("Chat room not found");
    }
  }
```

Replace `getRoom`:

```ts
  async getRoom(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("Chat room not found");
    }

    this.assertDmAccess(room, userId);

    return { success: true, data: room };
  }
```

Replace `presignAttachment`:

```ts
  async presignAttachment(
    workspaceId: string,
    roomId: string,
    userId: string,
    contentType: string,
    fileName: string,
  ): Promise<PresignedAvatarUpload> {
    const room = await this.prisma.chatRoom.findFirst({
      where: { id: roomId, workspace_id: workspaceId },
    });
    if (!room) throw new NotFoundException("Chat room not found");

    this.assertDmAccess(room, userId);

    return this.storageService.presignFileUpload(contentType, fileName, roomId);
  }
```

Replace the `getMessages` signature and add the room check as its first lines (keep the rest of the method body — cursor/pagination logic — unchanged):

```ts
  async getMessages(
    roomId: string,
    userId: string,
    cursor?: string,
    limit: number = 50,
    direction: "before" | "after" = "before",
  ) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException("Chat room not found");
    this.assertDmAccess(room, userId);

    const take = Math.min(limit, 100);
    // ...unchanged from here down...
```

- [ ] **Step 4: Update `ChatController` to pass the caller's `userId`**

In `apps/backend/src/chat/chat.controller.ts`, replace the three affected methods:

```ts
  @Get(":roomId")
  findOne(
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @ActiveUserParam() user: ActiveUser,
  ) {
    return this.chatService.getRoom(roomId, user.userId);
  }

  @Get(":roomId/messages")
  getMessages(
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @ActiveUserParam() user: ActiveUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
    @Query("direction") direction?: "before" | "after",
  ) {
    return this.chatService.getMessages(roomId, user.userId, cursor, limit, direction);
  }

  @Post(":roomId/attachments/presign")
  @Throttle({ default: { ttl: 3600, limit: 60 } })
  presignAttachment(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Param("roomId", new ParseUUIDPipe({ version: "4" })) roomId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: PresignFileDto,
  ): Promise<PresignedAvatarUpload> {
    return this.chatService.presignAttachment(workspaceId, roomId, user.userId, dto.contentType, dto.fileName);
  }
```

- [ ] **Step 5: Add the same check to the gateway's `join_room` handler**

In `apps/backend/src/chat/chat.gateway.ts`, in `handleJoinRoom`, replace:

```ts
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: data.roomId },
      select: { id: true, workspace_id: true },
    });

    if (!room || room.workspace_id !== data.workspaceId) {
      client.emit("error", { message: "Room not found" });
      return;
    }

    await client.join(`chat_${data.roomId}`);
    client.data.currentRoom = data.roomId;
    client.data.workspaceId = data.workspaceId;

    return { event: "joined_room", data: data.roomId };
```

with:

```ts
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: data.roomId },
      select: { id: true, workspace_id: true, is_direct: true, dm_user_a_id: true, dm_user_b_id: true },
    });

    if (!room || room.workspace_id !== data.workspaceId) {
      client.emit("error", { message: "Room not found" });
      return;
    }

    if (room.is_direct && room.dm_user_a_id !== userId && room.dm_user_b_id !== userId) {
      client.emit("error", { message: "Room not found" });
      return;
    }

    await client.join(`chat_${data.roomId}`);
    client.data.currentRoom = data.roomId;
    client.data.currentRoomIsDirect = room.is_direct;
    client.data.workspaceId = data.workspaceId;

    return { event: "joined_room", data: data.roomId };
```

(`client.data.currentRoomIsDirect` is read by Task 4's `handleSendMessage` change — no other task touches this line.)

- [ ] **Step 6: Run the tests to verify they pass**

```bash
pnpm --filter @crwsync/backend test -- chat.service.spec.ts
```

Expected: PASS, all cases in `describe("DM room access control", ...)` green, plus every pre-existing test in the file still green.

- [ ] **Step 7: Lint and typecheck**

```bash
pnpm --filter @crwsync/backend lint
pnpm --filter @crwsync/backend exec tsc --noEmit
```

Expected: no errors. (`tsc --noEmit` will catch any missed call site if `getRoom`/`getMessages`/`presignAttachment` are referenced elsewhere with the old signature — Task 3's earlier grep found only `chat.controller.ts` calls these, so none are expected.)

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/chat/chat.service.ts apps/backend/src/chat/chat.controller.ts apps/backend/src/chat/chat.gateway.ts apps/backend/src/chat/chat.service.spec.ts
git commit -m "fix(chat): scope room access to DM participants, not just workspace members"
```

---

### Task 4: Backend — DM creation, listing, and realtime signal

**Files:**
- Create: `apps/backend/src/chat/dto/dm.dto.ts`
- Create: `apps/backend/src/chat/dm.controller.ts`
- Modify: `apps/backend/src/chat/chat.service.ts` (add `getOrCreateDm`, `listDms`)
- Modify: `apps/backend/src/chat/chat.module.ts` (register `DmController`)
- Modify: `apps/backend/src/chat/chat.gateway.ts:181-241` (`handleSendMessage` — add `isDirect` to the `chat:unread_increment` payload)
- Test: `apps/backend/src/chat/chat.service.spec.ts`

**Interfaces:**
- Consumes: `ChatRoom.is_direct`/`dm_user_a_id`/`dm_user_b_id` (Task 1), `assertDmAccess` pattern from Task 3 (not reused directly — `getOrCreateDm` has its own membership check since it creates rather than reads), `client.data.currentRoomIsDirect` (Task 3, Step 5).
- Produces: `ChatService.getOrCreateDm(workspaceId, userId, otherUserId): Promise<{success, data: ChatRoom}>`, `ChatService.listDms(workspaceId, userId): Promise<{success, data: DmRoomSummary[]}>` — both consumed by `DmController`, which Task 5's frontend service calls via `POST`/`GET /workspaces/:id/dms`. Socket event `dm:room_created` (payload: the created `ChatRoom`) and the `isDirect` field on `chat:unread_increment` — both consumed by Task 6's frontend socket listeners.

- [ ] **Step 1: Write the failing tests**

Add to the `prisma` mock in `chat.service.spec.ts` (extend the object from Task 3):

```ts
      chatRoom: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
```

Add a new `describe` block:

```ts
  describe("getOrCreateDm", () => {
    it("returns the existing room if one already exists for the sorted pair", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "mem-1" })
        .mockResolvedValueOnce({ id: "mem-2" });
      const existingRoom = { id: "room-existing", is_direct: true };
      prisma.chatRoom.findFirst.mockResolvedValue(existingRoom);

      const result = await chatService.getOrCreateDm("ws-1", "user-b", "user-a");

      expect(prisma.chatRoom.findFirst).toHaveBeenCalledWith({
        where: { workspace_id: "ws-1", is_direct: true, dm_user_a_id: "user-a", dm_user_b_id: "user-b" },
      });
      expect(prisma.chatRoom.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: existingRoom });
    });

    it("creates a new room and emits dm:room_created when none exists", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "mem-1" })
        .mockResolvedValueOnce({ id: "mem-2" });
      prisma.chatRoom.findFirst.mockResolvedValue(null);
      const newRoom = { id: "room-new", is_direct: true, dm_user_a_id: "user-a", dm_user_b_id: "user-b" };
      prisma.chatRoom.create.mockResolvedValue(newRoom);

      const result = await chatService.getOrCreateDm("ws-1", "user-a", "user-b");

      expect(prisma.chatRoom.create).toHaveBeenCalledWith({
        data: { workspace_id: "ws-1", is_direct: true, dm_user_a_id: "user-a", dm_user_b_id: "user-b" },
      });
      expect(statusGateway.server.to).toHaveBeenCalledWith("user_user-b");
      expect(result).toEqual({ success: true, data: newRoom });
    });

    it("throws NotFoundException if the other user is not a workspace member", async () => {
      prisma.workspaceMember.findUnique
        .mockResolvedValueOnce({ id: "mem-1" })
        .mockResolvedValueOnce(null);

      await expect(chatService.getOrCreateDm("ws-1", "user-a", "user-b")).rejects.toThrow(
        "User is not a member of this workspace",
      );
    });

    it("throws BadRequestException when starting a DM with yourself", async () => {
      await expect(chatService.getOrCreateDm("ws-1", "user-a", "user-a")).rejects.toThrow(
        "Cannot start a DM with yourself",
      );
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @crwsync/backend test -- chat.service.spec.ts
```

Expected: FAIL — `chatService.getOrCreateDm` does not exist yet.

- [ ] **Step 3: Implement `getOrCreateDm` and `listDms`**

Add to `apps/backend/src/chat/chat.service.ts`, inside the `ChatService` class (after `deleteRoom`, before `toggleReaction` — keeps DM methods grouped with room-lifecycle methods):

```ts
  async getOrCreateDm(workspaceId: string, userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException("Cannot start a DM with yourself");
    }

    const [member, otherMember] = await Promise.all([
      this.prisma.workspaceMember.findUnique({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
      }),
      this.prisma.workspaceMember.findUnique({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: otherUserId } },
      }),
    ]);

    if (!member || !otherMember) {
      throw new NotFoundException("User is not a member of this workspace");
    }

    const [dmUserAId, dmUserBId] = [userId, otherUserId].sort();

    const existing = await this.prisma.chatRoom.findFirst({
      where: { workspace_id: workspaceId, is_direct: true, dm_user_a_id: dmUserAId, dm_user_b_id: dmUserBId },
    });

    if (existing) {
      return { success: true, data: existing };
    }

    const room = await this.prisma.chatRoom.create({
      data: { workspace_id: workspaceId, is_direct: true, dm_user_a_id: dmUserAId, dm_user_b_id: dmUserBId },
    });

    this.statusGateway.server.to(`user_${otherUserId}`).emit("dm:room_created", room);

    return { success: true, data: room };
  }

  async listDms(workspaceId: string, userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        workspace_id: workspaceId,
        is_direct: true,
        OR: [{ dm_user_a_id: userId }, { dm_user_b_id: userId }],
      },
      include: {
        messages: { orderBy: { created_at: "desc" }, take: 1, select: { created_at: true } },
        read_receipts: { where: { user_id: userId }, take: 1, select: { last_read_at: true } },
      },
    });

    const otherUserIds = rooms.map((room) =>
      room.dm_user_a_id === userId ? room.dm_user_b_id! : room.dm_user_a_id!,
    );

    const otherUsers = await this.prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: SENDER_SELECT,
    });
    const otherUsersById = new Map(otherUsers.map((user) => [user.id, user]));

    const data = rooms.map((room) => {
      const otherUserId = room.dm_user_a_id === userId ? room.dm_user_b_id! : room.dm_user_a_id!;
      const lastMessageAt = room.messages[0]?.created_at ?? null;
      const lastReadAt = room.read_receipts[0]?.last_read_at ?? null;
      const unread = !!lastMessageAt && (!lastReadAt || lastReadAt < lastMessageAt);

      return {
        room: {
          id: room.id,
          workspace_id: room.workspace_id,
          name: room.name,
          is_direct: room.is_direct,
          dm_user_a_id: room.dm_user_a_id,
          dm_user_b_id: room.dm_user_b_id,
          created_at: room.created_at,
          updated_at: room.updated_at,
        },
        otherParticipant: otherUsersById.get(otherUserId)!,
        unread,
      };
    });

    return { success: true, data };
  }
```

- [ ] **Step 4: Add `isDirect` to the `chat:unread_increment` payload**

In `apps/backend/src/chat/chat.gateway.ts`, in `handleSendMessage`, replace:

```ts
          this.statusGateway.server
            .to(`workspace_${workspaceId}`)
            .emit("chat:unread_increment", { roomId, senderId: userId });
```

with:

```ts
          this.statusGateway.server
            .to(`workspace_${workspaceId}`)
            .emit("chat:unread_increment", { roomId, senderId: userId, isDirect: !!client.data.currentRoomIsDirect });
```

- [ ] **Step 5: Create the DM DTO**

Create `apps/backend/src/chat/dto/dm.dto.ts`:

```ts
import { IsUUID } from "class-validator";

export class CreateDmDto {
  @IsUUID("4")
  otherUserId!: string;
}
```

- [ ] **Step 6: Create the DM controller**

Create `apps/backend/src/chat/dm.controller.ts`:

```ts
import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { IsMemberGuard } from "src/workspace/guards/ws-member.guard";
import { ActiveUserParam } from "src/common/decorators/active-user.decorator";
import type { ActiveUser } from "src/common/types/active-user.type";
import { ChatService } from "src/chat/chat.service";
import { CreateDmDto } from "src/chat/dto/dm.dto";

@Controller("workspaces/:workspaceId/dms")
@UseGuards(IsMemberGuard)
@SkipThrottle()
export class DmController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  list(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
  ) {
    return this.chatService.listDms(workspaceId, user.userId);
  }

  @Post()
  open(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @ActiveUserParam() user: ActiveUser,
    @Body() dto: CreateDmDto,
  ) {
    return this.chatService.getOrCreateDm(workspaceId, user.userId, dto.otherUserId);
  }
}
```

- [ ] **Step 7: Register `DmController` in `ChatModule`**

In `apps/backend/src/chat/chat.module.ts`, add the import:

```ts
import { DmController } from "src/chat/dm.controller";
```

and update the `controllers` array:

```ts
  controllers: [ChatController, DmController],
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
pnpm --filter @crwsync/backend test -- chat.service.spec.ts
```

Expected: PASS, all `describe("getOrCreateDm", ...)` cases green, all prior tests still green.

- [ ] **Step 9: Lint and typecheck**

```bash
pnpm --filter @crwsync/backend lint
pnpm --filter @crwsync/backend exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Manual smoke test of the two new endpoints**

With the backend dev server running (`pnpm --filter @crwsync/backend dev`) and a valid session cookie for a real workspace member:

```bash
curl -b "<session-cookie>" -X POST http://localhost:<port>/workspaces/<workspaceId>/dms -H "Content-Type: application/json" -d '{"otherUserId":"<other-member-user-id>"}'
curl -b "<session-cookie>" http://localhost:<port>/workspaces/<workspaceId>/dms
```

Expected: first call returns `{"success":true,"data":{"id":"...","is_direct":true,...}}`; second call returns `{"success":true,"data":[{"room":{...},"otherParticipant":{...},"unread":false}]}`. Calling the POST twice with the same pair (either order) returns the same `room.id` both times.

- [ ] **Step 11: Commit**

```bash
git add apps/backend/src/chat/dto/dm.dto.ts apps/backend/src/chat/dm.controller.ts apps/backend/src/chat/chat.service.ts apps/backend/src/chat/chat.module.ts apps/backend/src/chat/chat.gateway.ts apps/backend/src/chat/chat.service.spec.ts
git commit -m "feat(chat): add DM creation/listing endpoints and dm:room_created event"
```

---

### Task 5: Frontend — DM service and query hooks

**Files:**
- Create: `apps/frontend/dash/services/dm.service.tsx`
- Create: `apps/frontend/dash/hooks/use-dm.ts`

**Interfaces:**
- Consumes: `ChatRoom`, `DmRoomSummary`, `CreateDmPayload`, `BoardOperationState` (Task 2), `GET`/`POST /workspaces/:id/dms` (Task 4).
- Produces: `dmKeys.all`, `dmKeys.list(workspaceId)`, `useDirectMessages(workspaceId?)`, `useOpenDirectMessage(workspaceId, slug)` — all consumed by Task 6's `r-sidebar.tsx` changes.

- [ ] **Step 1: Create the DM service**

Create `apps/frontend/dash/services/dm.service.tsx`:

```tsx
import { isAxiosError } from "axios";
import { ChatRoom, DmRoomSummary, CreateDmPayload, BoardOperationState } from "@crwsync/types";
import { api } from "@/services/auth.service";

const DM_BASE = (wsId: string) => `/workspaces/${wsId}/dms`;

export async function listDirectMessages(
  workspaceId: string,
): Promise<BoardOperationState<DmRoomSummary[]>> {
  try {
    const response = await api.get(DM_BASE(workspaceId));
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch direct messages",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function openDirectMessage(
  workspaceId: string,
  payload: CreateDmPayload,
): Promise<BoardOperationState<ChatRoom>> {
  try {
    const response = await api.post(DM_BASE(workspaceId), payload);
    return { success: true, data: response.data.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to open direct message",
      };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
```

- [ ] **Step 2: Create the query hooks**

Create `apps/frontend/dash/hooks/use-dm.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BoardOperationState, DmRoomSummary } from "@crwsync/types";
import * as dmService from "@/services/dm.service";

export const dmKeys = {
  all: ["dms"] as const,
  list: (workspaceId: string) => [...dmKeys.all, "list", workspaceId] as const,
};

export function useDirectMessages(workspaceId?: string) {
  return useQuery({
    queryKey: dmKeys.list(workspaceId!),
    queryFn: () => dmService.listDirectMessages(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    select: (result) => result.data,
  });
}

export function useOpenDirectMessage(workspaceId: string, slug: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (otherUserId: string) =>
      dmService.openDirectMessage(workspaceId, { otherUserId }),
    onSuccess: (result) => {
      if (!result.success || !result.data) return;
      const room = result.data;

      queryClient.setQueryData<BoardOperationState<DmRoomSummary[]>>(
        dmKeys.list(workspaceId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((dm) =>
              dm.room.id === room.id ? { ...dm, unread: false } : dm,
            ),
          };
        },
      );

      router.push(`/${slug}/chat/${room.id}`);
    },
  });
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @crwsync/dash exec tsc --noEmit
```

Expected: no errors. (No unit test for this task — it's two thin data-fetching wrappers with no branching logic beyond what Task 4's backend tests already cover; `useOpenDirectMessage`'s cache-patch behavior is exercised end-to-end in Task 6's manual test steps.)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/services/dm.service.tsx apps/frontend/dash/hooks/use-dm.ts
git commit -m "feat(chat): add frontend DM service and query hooks"
```

---

### Task 6: Frontend — wire member-list "Message" action and unread dot

**Files:**
- Modify: `apps/frontend/dash/components/r-sidebar.tsx`

**Interfaces:**
- Consumes: `useDirectMessages`, `useOpenDirectMessage`, `dmKeys` (Task 5); `dm:room_created`/`chat:unread_increment` socket events (Task 4).
- Produces: nothing new consumed elsewhere — this is the UI leaf.

This is the one file in the plan where visual polish matters — the unread dot sits right next to the existing presence dot on `UserAvatar`, so it needs to read as an intentional second signal, not a collision. Follow the existing presence-dot conventions in `components/user-avatar.tsx` (`absolute`, `size-2`, `rounded-full`, `outline-2 outline-base-200`) but place it at the opposite corner and give it a distinct color role (`bg-primary`, not a status color) so the two dots are never confusable at a glance.

- [ ] **Step 1: Wire `handleMessageUser` to open the DM**

In `apps/frontend/dash/components/r-sidebar.tsx`, add the import:

```tsx
import { useOpenDirectMessage } from "@/hooks/use-dm";
```

In the `ContextMenu` component, replace:

```tsx
  const handleMessageUser = () => {
    onClose();
  };
```

with:

```tsx
  const openDm = useOpenDirectMessage(workspace?.id ?? "", workspace?.slug ?? "");

  const handleMessageUser = () => {
    if (workspace) openDm.mutate(user.id);
    onClose();
  };
```

- [ ] **Step 2: Add the unread-DM query and socket listeners in `RSidebar`**

In the `RSidebar` function component, add the import (the file already imports `useQuery, useMutation, useQueryClient` from `@tanstack/react-query` at the top — leave that line as-is, `useQueryClient` is already available):

```tsx
import { useDirectMessages, dmKeys } from "@/hooks/use-dm";
import type { BoardOperationState, DmRoomSummary } from "@crwsync/types";
```

Add, near the existing `data`/`isLoading` query in `RSidebar`:

```tsx
  const { data: dmSummaries } = useDirectMessages(workspace?.id);
  const queryClient = useQueryClient();

  const unreadDmUserIds = useMemo(
    () => new Set((dmSummaries ?? []).filter((dm) => dm.unread).map((dm) => dm.otherParticipant.id)),
    [dmSummaries],
  );
```

Extend the existing socket effect (the one that already registers `status:update`/`ws_statuses`) by adding two more listeners inside the same `useEffect`, before its `return` cleanup:

```tsx
    const handleDmRoomCreated = () => {
      if (workspace?.id) {
        queryClient.invalidateQueries({ queryKey: dmKeys.list(workspace.id) });
      }
    };

    const handleUnreadIncrement = ({ senderId, isDirect }: { senderId: string; isDirect?: boolean }) => {
      if (!isDirect || !workspace?.id) return;
      queryClient.setQueryData<BoardOperationState<DmRoomSummary[]>>(
        dmKeys.list(workspace.id),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((dm) =>
              dm.otherParticipant.id === senderId ? { ...dm, unread: true } : dm,
            ),
          };
        },
      );
    };

    socket.on("dm:room_created", handleDmRoomCreated);
    socket.on("chat:unread_increment", handleUnreadIncrement);
```

and add matching `socket.off` calls in that same effect's cleanup function, alongside the existing `status:update`/`ws_statuses` ones:

```tsx
      socket.off("dm:room_created", handleDmRoomCreated);
      socket.off("chat:unread_increment", handleUnreadIncrement);
```

- [ ] **Step 3: Thread `unreadDmUserIds` down to `SidebarMembers` and `SidebarProfile`**

Update the `<SidebarMembers>` call site:

```tsx
                <SidebarMembers
                  groups={groupedMembers}
                  statuses={statuses}
                  isLoading={isLoading}
                  workspace={workspace}
                  open={openInviteModal}
                  setOpen={setOpenInviteModal}
                  unreadDmUserIds={unreadDmUserIds}
                />
```

Update `SidebarMembersProps` and the component body:

```tsx
interface SidebarMembersProps {
  groups: {
    role: WorkspaceRoleEnum;
    members: WorkspaceMember[];
  }[];
  statuses: Record<string, UserStatus>;
  isLoading?: boolean;
  workspace: Workspace | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  unreadDmUserIds: Set<string>;
}

export function SidebarMembers({ groups, statuses, isLoading, workspace, open, setOpen, unreadDmUserIds }: SidebarMembersProps) {
```

and its member row:

```tsx
                  {group.members.map((member) => (
                    <li key={member.id}>
                      <SidebarProfile
                        user={member.user}
                        status={statuses[member.user_id] || "OFFLINE"}
                        hasUnreadDm={unreadDmUserIds.has(member.user_id)}
                      />
                    </li>
                  ))}
```

- [ ] **Step 4: Render the unread dot in `SidebarProfile`**

Update `SidebarProfileProps` and the avatar wrapper:

```tsx
interface SidebarProfileProps {
  user: WorkspaceUser | undefined;
  status?: UserStatus;
  className?: string;
  hasUnreadDm?: boolean;
}

export function SidebarProfile({ user, status, className, hasUnreadDm }: SidebarProfileProps) {
```

Replace:

```tsx
          <div className="relative">
            <UserAvatar key={"user-avatar"} user={user} status={status?.toLowerCase()} />
          </div>
```

with:

```tsx
          <div className="relative">
            <UserAvatar key={"user-avatar"} user={user} status={status?.toLowerCase()} />
            {hasUnreadDm && (
              <div className="absolute -top-px -left-px size-2 rounded-full outline-2 outline-base-200 bg-primary" />
            )}
          </div>
```

- [ ] **Step 5: Typecheck and lint**

```bash
pnpm --filter @crwsync/dash exec tsc --noEmit
pnpm --filter @crwsync/dash lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/dash/components/r-sidebar.tsx
git commit -m "feat(chat): wire member-list Message action to open a DM, add unread dot"
```

---

### Task 7: Frontend — DM header treatment in `ChatRoom`

**Files:**
- Modify: `apps/frontend/dash/components/chat/ChatRoom.tsx`

**Interfaces:**
- Consumes: `room.is_direct`/`dm_user_a_id`/`dm_user_b_id` (Task 2), `currentUserId` prop (already passed into `ChatRoom` today), `UserAvatar` (`components/user-avatar.tsx`).
- Produces: nothing consumed elsewhere — this is the last leaf.

A DM room has `name: null`, so the header currently falls back to the literal string `"Chat"` (`room?.name || "Chat"`) for every DM — indistinguishable from a misconfigured group room. This task swaps that one header region for the other participant's identity when `room.is_direct` is true. Fetching that participant needs a name/avatar, and `getRoom`'s DM response only carries `dm_user_a_id`/`dm_user_b_id` (raw IDs, per Task 1's schema) — not enough to render. Reuse `useDirectMessages`, already loaded in `RSidebar` and cached with a 5-minute `staleTime`, to resolve the id to a `ChatMessageSender` instead of adding a second per-room fetch.

- [ ] **Step 1: Resolve the other participant and swap the header**

In `apps/frontend/dash/components/chat/ChatRoom.tsx`, add the import:

```tsx
import { useDirectMessages } from "@/hooks/use-dm";
```

Add, after the existing `useChatRoom`/`useChatMessages` calls:

```tsx
  const { data: dmSummaries } = useDirectMessages(room?.is_direct ? workspaceId : undefined);
  const dmParticipant = room?.is_direct
    ? dmSummaries?.find((dm) => dm.room.id === roomId)?.otherParticipant
    : undefined;
```

Replace the header:

```tsx
      <div className="flex items-center justify-between h-16 pl-16 pr-24 border-b border-base-200">
        <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">{room?.name || "Chat"}</h1>
      </div>
```

with:

```tsx
      <div className="flex items-center justify-between h-16 pl-16 pr-24 border-b border-base-200">
        {room?.is_direct ? (
          <div className="flex items-center gap-3">
            <UserAvatar user={dmParticipant} size={8} />
            <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">
              {dmParticipant ? `${dmParticipant.firstname} ${dmParticipant.lastname}` : "Direct Message"}
            </h1>
          </div>
        ) : (
          <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis">{room?.name || "Chat"}</h1>
        )}
      </div>
```

and add the `UserAvatar` import:

```tsx
import { UserAvatar } from "@/components/user-avatar";
```

- [ ] **Step 2: Typecheck and lint**

```bash
pnpm --filter @crwsync/dash exec tsc --noEmit
pnpm --filter @crwsync/dash lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/dash/components/chat/ChatRoom.tsx
git commit -m "feat(chat): show DM participant identity in chat room header"
```

---

## Manual Test Plan (hand off to the user — no automated UI testing performed)

After all 7 tasks are implemented and both dev servers are running:

1. Sign in as User A, open a workspace with at least one other member (User B).
2. In the right-hand member roster, right-click User B's row. Confirm a context menu appears with a "Message {username}" item (and "Kick" if you're OWNER/ADMIN).
3. Click "Message {username}". Confirm you're navigated to `/[slug]/chat/[roomId]` and the header shows User B's name and avatar (not "Chat").
4. Send a message. Confirm it appears immediately (optimistic) and persists on refresh.
5. Right-click User B's row again and click "Message" again. Confirm you land on the *same* room (same URL) with the same message history — no duplicate room created.
6. Open a second browser (or incognito window), sign in as User B, open the same workspace.
7. As User A, send another message in the DM. As User B, confirm a small dot appears on User A's row in the member roster within a couple seconds, without refreshing.
8. As User B, right-click User A's row and click "Message". Confirm it opens the same DM thread (User A's messages visible) and the unread dot on User A's row disappears.
9. As User A, right-click your *own* row in the roster. Confirm no "Message" context menu appears (self-DM is blocked — the roster already omits the menu for `self.id === user.id`).
10. As User B (not a member of some *other* workspace User A is in), attempt `GET /workspaces/<otherWorkspaceId>/chat/<dmRoomId>` directly (e.g. via browser devtools or curl) using a DM room ID copied from a workspace you don't belong to. Confirm a 403 from `IsMemberGuard` (workspace-level, expected) rather than leaking room data.
11. As a third workspace member, User C, who is *not* a participant in the User A ↔ User B DM: obtain the DM's `roomId` (e.g., have User A read it from the URL) and attempt `GET /workspaces/<sameWorkspaceId>/chat/<dmRoomId>` while authenticated as User C in that same workspace. Confirm a 404 ("Chat room not found") — this is the core security fix from Task 3, verify it holds for a same-workspace non-participant, not just a cross-workspace outsider.
