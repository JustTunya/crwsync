# Direct Messaging (DMs) — Design

**Roadmap item**: Milestone 3, "Direct Messaging (DMs) — 1-on-1 private chat rooms between workspace members initiated directly from the member list."

## Scope

- 1-on-1 DM between two workspace members, started from the existing "Message {user}" context-menu item in `RSidebar.tsx` (`components/r-sidebar.tsx:463`, currently a no-op stub — this feature wires it up).
- DM reopens the same thread on repeat clicks (get-or-create). No dedicated DM list surface.
- Unread indicator (dot) on the member's row in `RSidebar.tsx` when they have an unread DM.
- **Out of scope (YAGNI)**: group DMs, a DM list/section in `l-sidebar.tsx`, Cmd+K entries (Milestone 4 omni-search), push/desktop notifications for DMs (separate unchecked "Persistent Notifications" roadmap item), DM message search.

## Why reuse `ChatRoom`, not a new subsystem

`WorkspaceModule` links to `ChatRoom` only via a loose `reference_id` (`schema.prisma:354`), not a DB relation — a `ChatRoom` can exist with zero `WorkspaceModule` rows today. `ChatMessage`, `ChatReadReceipt`, `ChatAttachment`, `MessageReaction`, the entire `/chat` Socket.IO gateway, and every frontend chat component (`ChatRoom.tsx`, `ChatInput.tsx`, `MessageBubble.tsx`, `use-chat-socket.ts`, `use-chat-store.ts`) are already room-shaped and room-id-routed, not module-shaped. A DM is just a `ChatRoom` that skips the `WorkspaceModule` row. Building a parallel `DirectMessage` model/gateway (considered and rejected) would duplicate ~90% of this machinery for no behavioral gain.

## Data model

`ChatRoom` (`schema.prisma:386`) gains:

```prisma
model ChatRoom {
  ...existing fields...
  is_direct    Boolean  @default(false)
  dm_user_a_id String?  @db.Uuid
  dm_user_b_id String?  @db.Uuid

  @@unique([workspace_id, dm_user_a_id, dm_user_b_id], map: "idx_chatroom_dm_unique")
}
```

`dm_user_a_id`/`dm_user_b_id` are always written as the sorted pair (`a < b` by UUID string comparison) so the unique constraint dedupes regardless of who initiates. `name` stays null for DM rooms — display name is resolved client-side from the other participant. No new tables; messages/attachments/reactions/read-receipts are unmodified `ChatRoom`-scoped rows exactly as today.

Migration: one additive Prisma migration, nullable columns + unique index, no backfill needed (existing rows get `is_direct = false`, both id columns null).

## Backend

**`ChatService`** (`src/chat/chat.service.ts`) — two new methods, no changes to existing ones' signatures except the security fix below:

- `getOrCreateDm(workspaceId, userId, otherUserId)`: validates both users are members of `workspaceId` (`WorkspaceMember` lookup, reuse the pattern already in `handleJoinRoom`), sorts the pair, `findFirst` by the unique combo, else `create` — no `WorkspaceModule` row, no `module:created` broadcast. Emits `dm:room_created` (new event, see Realtime) to the other user's personal socket room if the room was newly created.
- `listDms(workspaceId, userId)`: rooms where `dm_user_a_id` or `dm_user_b_id` equals `userId`, `include` the other participant (`SENDER_SELECT` shape, already defined at `chat.service.ts:18`) and the latest message; unread count derived the same way the existing module unread badge is (`ChatReadReceipt.last_read_at` vs latest `ChatMessage.created_at`).

**Security fix (required regardless of the feature)**: `getRoom` (`chat.service.ts:75`), `getMessages` (`:102`), `presignAttachment` (`:87`), and `ChatGateway.handleJoinRoom` (`chat.gateway.ts:98`) currently authorize only via `IsMemberGuard`/workspace-membership — any workspace member can read any room by roomId, which is correct for open group channels but wrong once a private room type exists. Add, to all four: if `room.is_direct`, the requesting `userId` must be `dm_user_a_id` or `dm_user_b_id`, else `NotFoundException` (REST) / `client.emit("error", ...)` (socket) — a 404 rather than 403 so DM existence isn't leaked. `getRoom`/`getMessages`/`presignAttachment` don't currently receive the caller's `userId` at all (`chat.controller.ts:45-70`); add `@ActiveUserParam() user: ActiveUser` to those three controller methods and thread it through.

**New `DmController`** (`src/chat/dm.controller.ts`), mounted at `workspaces/:workspaceId/dms`, `@UseGuards(IsMemberGuard)`, `@SkipThrottle()` (mirrors `ChatController`):
- `GET /` → `listDms`
- `POST /` (body: `{ otherUserId }`) → `getOrCreateDm`

## Realtime

Zero new events for messaging itself — a DM room's `id` is a normal `roomId`, so `join_room`, `send_message`, `edit_message`, `typing_start/stop`, `mark_as_read`, reactions all work unmodified through the existing `/chat` namespace once the participant check above is in place.

One new event: `dm:room_created`, emitted on the existing `StatusGateway` server (`.to(`user_${otherUserId}`)`, the same per-user room convention `mention_notification` already uses) when `getOrCreateDm` creates a fresh room — so the recipient doesn't need a manual refetch to see the thread exist.

Unread badge: the existing `chat:unread_increment` broadcast (`chat.gateway.ts:240`, emitted workspace-wide on `StatusGateway`) gains one field — `isDirect: boolean` — read from `client.data.currentRoom`'s cached `is_direct` (already fetched in `handleJoinRoom`, stash on `client.data` alongside `currentRoom`). `l-sidebar.tsx`'s existing listener ignores the new field (module-keyed, DMs have no module) — no change needed there. `RSidebar.tsx` adds its own listener on the same `chat:unread_increment` event: if `isDirect` and `senderId` matches a rendered member, show a dot on that row. Cleared by invalidating the DM-list query (`dmKeys.list`) when the user opens that DM and the existing `markAsRead` flow fires — same invalidate-on-read pattern used elsewhere, no new event required.

## Frontend

- `services/dm.service.tsx` — `listDms`, `getOrCreateDm`, same `{success, data?, message?}` shape as `chat.service.tsx`.
- `hooks/use-dm.ts` — `dmKeys` factory (`all`, `list(workspaceId)`) mirroring `chatKeys` (`hooks/use-chat.ts:6`); `useDirectMessages(workspaceId)` query, `staleTime: 5 * 60 * 1000`; `useOpenDirectMessage(workspaceId)` mutation calling `getOrCreateDm`, `onSuccess` does `router.push(`/${slug}/chat/${room.id}`)`.
- `components/r-sidebar.tsx`: `handleMessageUser` (`:463`) calls `useOpenDirectMessage().mutate(user.id)` instead of just `onClose()`. Member row gets the unread dot described above.
- `components/chat/ChatRoom.tsx`: one conditional at the header (`:47`) — if `room?.is_direct`, render the other participant's name/avatar/presence dot (already have `UserAvatar` and the presence-status plumbing used in `RSidebar.tsx`) instead of `room.name`. This is the one piece that benefits from a design pass — will use `frontend-design` skill for the DM header treatment (avatar sizing, presence dot placement, typography) so it reads as intentional, not a bare name swap, and for the unread-dot styling on the member row.
- No route changes — `/[slug]/chat/[roomId]` (`app/[slug]/chat/[roomId]`) already takes an arbitrary `roomId` and works unmodified for DM rooms.

## Testing

- Backend: extend `chat.service.spec.ts` with the security-relevant branch — non-participant workspace member hitting `getRoom`/`getMessages`/`presignAttachment` on a DM room gets `NotFoundException`; participant succeeds. `getOrCreateDm` dedupe test (calling twice, either direction of the pair, returns the same room).
- No automated UI/E2E testing — manual test steps will be handed to the user step-by-step after implementation, per their request.

## Open items resolved with the user

- Entry point: member-list context menu only (not a new sidebar surface).
- Revisit path: re-clicking "Message {user}" reopens the same thread; no dedicated DM list.
- Unread indicator: yes, dot on the member row, reusing `chat:unread_increment`.
