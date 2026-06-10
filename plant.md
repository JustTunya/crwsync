# Real-Time Kanban Board via WebSockets

## Background

The backend already emits **all board/task/column events** through the existing `StatusGateway` on the `/status` Socket.IO namespace (e.g., `board:task:moved`, `board:task:created`, `board:column:updated`, etc.). The frontend already has a single connected `socket` available via `useSocket()` and a React-Query cache (`boardKeys.detail(boardId)`) holding the full board state.

The missing piece is **purely frontend**: nothing in the dashboard currently listens to those events and applies them to the React-Query cache. Every mutation today calls the REST endpoint → gets a response → invalidates the query → triggers a full re-fetch. Other users on the same board never see any change until they manually refresh.

The REST endpoints are **not touched** — they remain as the authoritative write path. WebSockets become the **propagation layer** that pushes confirmed server state to every connected viewer's cache.

---

## Scope: Backend changes required

> [!NOTE]
> The backend already emits all necessary events. **No new backend code is required.** The `StatusGateway` already broadcasts:
>
> | Event | Payload |
> |---|---|
> | `board:task:created` | `{ boardId, task }` |
> | `board:task:updated` | `{ boardId, taskId, data }` |
> | `board:task:moved` | `{ boardId, taskId, fromColumnId, toColumnId, position, userId }` |
> | `board:column:created` | `{ boardId, column }` |
> | `board:column:updated` | `{ boardId, columnId, data }` |
> | `board:column:deleted` | `{ boardId, columnId }` |
> | `board:columns:reordered` | `{ boardId, columnIds }` |
> | `board:updated` | `{ boardId, data }` |
> | `board:deleted` | `{ boardId }` |
> | `module:created` | `wsModule` |
> | `module:updated` | `{ moduleId, data }` |
> | `module:deleted` | `{ referenceId }` or `{ moduleId }` |
> | `module:reordered` | `{ updates }` |
> | `project:created` | `project` |
> | `project:updated` | `{ projectId, data }` |
> | `project:deleted` | `{ projectId }` |

---

## Architecture Decision: Where to put the listener

Two options exist:

1. **Inside `BoardPage`** — co-located with the DnD logic, simple but not reusable
2. **A dedicated `use-board-socket.ts` hook** — mirrors the existing `use-chat-socket.ts` pattern, consumed by `BoardPage`

**Decision: Option 2.** A dedicated hook keeps `BoardPage` clean, is testable in isolation, and follows the established chat pattern exactly.

---

## Proposed Changes

### Frontend — New File

---

#### [NEW] `use-board-socket.ts` (`apps/frontend/dash/hooks/use-board-socket.ts`)

This is the core of the implementation. A singleton Socket.IO instance (same pattern as `use-chat-socket.ts`) that:

1. Receives the `boardId` and `workspaceId` it should scope to
2. Listens to every board-scoped event emitted by the backend
3. Applies optimistic-style **cache patches** directly to the React-Query store via `queryClient.setQueryData` — **no re-fetches triggered for local user's own mutations** (they already have optimistic updates)
4. Falls back to `queryClient.invalidateQueries` only for the `board:task:moved` event from **other users** (because the move payload does not carry the full updated task object, only positional metadata — a full re-fetch is the safest reconciliation)

**Detailed handler logic per event:**

| Event | Cache operation |
|---|---|
| `board:task:created` | Append `task` to the correct column inside `boardKeys.detail(boardId)` cache if it isn't already present (idempotency check by `task.id`) |
| `board:task:updated` | Merge `data` fields into the matching task in cache (deep-patch, not full replace) |
| `board:task:moved` | If `userId === currentUserId` → skip (own action already has optimistic update). Otherwise → `invalidateQueries` for `boardKeys.detail(boardId)` |
| `board:column:created` | Append `column` (with empty `tasks: []`) to `columns` array in cache if not already present |
| `board:column:updated` | Merge `data` into the matching column |
| `board:column:deleted` | Filter the column out of the `columns` array |
| `board:columns:reordered` | Re-sort `columns` by the order of `columnIds` |
| `board:updated` | Merge `data` into the board root (e.g., name change) |
| `board:deleted` | Invalidate the board list query (`boardKeys.list(workspaceId)`) and the detail query |

**Self-event deduplication strategy:** For every event, compare the patch against the current cache value before applying. If the cache already reflects the change (own mutation's optimistic update has already applied it), the handler is a no-op. This prevents visible flicker for the acting user.

**Reconnect handling:** On `socket.io` `reconnect` event, invalidate `boardKeys.detail(boardId)` to re-fetch the authoritative state and recover from any missed events during disconnection.

**Cleanup:** All listeners are removed in the `useEffect` cleanup function. The socket is the **shared singleton** from `socket.provider.tsx` — we do not create a new connection, just register listeners on the existing one.

```ts
// Skeleton (not final code — for review purposes)
export function useBoardSocket(workspaceId: string, boardId: string) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const user = useUser();

  useEffect(() => {
    if (!socket || !boardId || !workspaceId) return;

    // --- handlers ---
    const onTaskCreated = ({ boardId: bId, task }) => {
      if (bId !== boardId) return;
      queryClient.setQueryData(boardKeys.detail(boardId), (old) => {
        if (!old?.data?.columns) return old;
        const alreadyExists = old.data.columns.some(col =>
          col.tasks?.some(t => t.id === task.id)
        );
        if (alreadyExists) return old; // own optimistic
        const columns = old.data.columns.map(col =>
          col.id === task.column_id
            ? { ...col, tasks: [...(col.tasks ?? []), task] }
            : col
        );
        return { ...old, data: { ...old.data, columns } };
      });
    };

    // ... (other handlers follow same pattern)

    const onReconnect = () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    };

    socket.on("board:task:created", onTaskCreated);
    // ... register others
    socket.io.on("reconnect", onReconnect);

    return () => {
      socket.off("board:task:created", onTaskCreated);
      // ... unregister others
      socket.io.off("reconnect", onReconnect);
    };
  }, [socket, boardId, workspaceId, queryClient, user?.id]);
}
```

---

### Frontend — Modified Files

---

#### [MODIFY] [board page](file:///c:/crwsync/apps/frontend/dash/app/[slug]/board/[boardId]/page.tsx)

A single line change: call `useBoardSocket(workspaceId, boardId)` at the top of the component. The rest of the component is untouched.

```diff
+ import { useBoardSocket } from "@/hooks/use-board-socket";

  export default function BoardPage() {
    const { boardId } = useParams<{ boardId: string }>();
    const { activeWorkspace } = useWorkspace();
    const workspaceId = activeWorkspace?.id || "";
+   useBoardSocket(workspaceId, boardId);
    ...
  }
```

---

#### [MODIFY] [use-boards.ts](file:///c:/crwsync/apps/frontend/dash/hooks/use-boards.ts) — `useMoveTask` mutation

**Current problem:** `useMoveTask` currently calls `queryClient.invalidateQueries` in `onSettled`, which triggers a refetch even after the optimistic update has already applied and the socket event for the same action has already been handled. This causes:
1. A redundant network request
2. A potential race condition where a remote user's event patches the cache and then the refetch overwrites it

**Fix:** Change `onSettled` of `useMoveTask` to only re-fetch if an error occurred (i.e., remove the unconditional `invalidateQueries` from `onSettled` and only do it from `onError`). The socket handler for `board:task:moved` will handle propagating the change to other clients. For the acting user, the optimistic update is sufficient (the REST response already confirms success, and the socket event for their own action is skipped in `useBoardSocket`).

> [!IMPORTANT]
> The same adjustment applies to `useReorderColumns` — its `onSettled` invalidation can be removed since the `board:columns:reordered` socket event will handle cache updates for all viewers including the acting user.

> [!WARNING]  
> `useCreateColumn`, `useUpdateColumn`, `useDeleteColumn`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useArchiveTask` should **keep their `onSuccess` invalidations** because those mutations do not have optimistic updates implemented — removing the invalidation would leave the acting user with stale state.

---

#### [MODIFY] [use-workspace-modules.ts](file:///c:/crwsync/apps/frontend/dash/hooks/use-workspace-modules.ts)

The `l-sidebar.tsx` already listens to `module:created`, `module:updated`, `module:deleted`, `module:reordered`, `project:created`, `project:updated`, `project:deleted` events... 

Actually, checking the sidebar code confirms it does **not** yet listen to those events — it only listens to `chat:unread_increment`. The sidebar's React-Query cache for modules is invalidated only on user-initiated mutations (`onSettled`), so other users' actions (creating a new board, reordering modules, etc.) are invisible in real-time.

**Fix:** Add a `useWorkspaceModuleSocket` effect inside `l-sidebar.tsx` (or a dedicated `use-workspace-socket.ts` hook consumed there) that listens to all module/project events and patches the relevant query caches:

| Event | Cache operation |
|---|---|
| `module:created` | Append to `moduleKeys.list(workspaceId)` |
| `module:updated` | Patch name/fields in `moduleKeys.list(workspaceId)` |
| `module:deleted` | Remove from `moduleKeys.list(workspaceId)` by `moduleId` or `referenceId` |
| `module:reordered` | Re-sort `moduleKeys.list(workspaceId)` by the new positions |
| `project:created` | Append to project query cache |
| `project:updated` | Patch in project query cache |
| `project:deleted` | Remove from project query cache |

This ensures the sidebar reflects real-time changes to any module, not just boards.

> [!NOTE]
> The `useReorderModules` mutation in `use-workspace-modules.ts` already has an optimistic update. For the same reason as `useMoveTask`, we can remove its `onSettled` invalidation in favor of the socket handler. All other module mutations can keep their invalidations.

---

## Execution Order

1. Create `use-board-socket.ts`
2. Mount it in `BoardPage` (single import + call)
3. Create `use-workspace-socket.ts` (for module/project events)
4. Mount it in `l-sidebar.tsx` (or a shared layout component)
5. Trim the unnecessary `onSettled` invalidations from `useMoveTask` and `useReorderColumns` and `useReorderModules`

---

## Risk Analysis & Mitigations

| Risk | Mitigation |
|---|---|
| **Own-action double-apply** (optimistic update + socket event both patch cache) | Idempotency check: each handler skips if the entity already matches the incoming state |
| **Event for wrong board** | Every handler guards on `boardId === payload.boardId` |
| **Missed events during reconnect** | `socket.io.on("reconnect", ...)` triggers a full `invalidateQueries` for the board |
| **Stale cache after move** (partial payload) | `board:task:moved` from remote users triggers a full re-fetch (`invalidateQueries`) |
| **Memory leak** | All listeners cleaned up in `useEffect` return function |
| **Socket not yet connected** | `useEffect` depends on `socket` — skips registration until socket is truthy |
| **Concurrent drag races** | Server is the single source of truth; conflicting moves resolve by the server's final DB state being broadcast back |

---

## Verification Plan

### Automated
- No test framework detected in scope; manual verification covers correctness

### Manual
1. Open the same board URL in **two browser tabs** (different users or same user in incognito)
2. Drag a task in Tab 1 → it should appear moved instantly in Tab 2 with no page refresh
3. Create/rename/delete a column in Tab 1 → Tab 2 updates instantly
4. Update a task's title or priority in the detail modal in Tab 1 → Tab 2 reflects it
5. Add a new board (creating a new module) in Tab 1 → it appears in Tab 2's sidebar instantly
6. Reorder modules in Tab 1 → Tab 2 sidebar reorders without refresh
7. Disconnect Tab 2's network briefly, make changes in Tab 1, reconnect Tab 2 → Tab 2 re-fetches and converges to correct state
