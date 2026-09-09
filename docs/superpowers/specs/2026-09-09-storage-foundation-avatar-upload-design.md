# Storage Foundation + Avatar Upload — Design

Sub-project 1 of Milestone 2 (`ROADMAP.md` §5). Delivers the S3-compatible
storage foundation and the first real consumer of it: user and workspace
avatar upload. `/api/files/:key` (workspace-scoped, DB-authorized file
attachments) is out of scope here — it depends on `TaskAttachment`, which
ships in the Task Attachments sub-project.

## Context

`User.avatar_key` and `Workspace.logo_key` already exist as plain string
columns (`apps/backend/prisma/schema.prisma:66,148`) and are already
writable via `UpdateUserDto`/`UpdateWorkspaceDto`. The frontend already
renders avatars from `/api/avatars/${key}` (`user-avatar.tsx`,
`workspace-avatar.tsx`) — the endpoint just doesn't exist yet (ROADMAP §3.2).
No new Prisma models are needed for this cycle.

## Architecture

New `StorageModule` in `apps/backend/src/storage/` wraps
`@aws-sdk/client-s3` / `@aws-sdk/s3-presigned-post` /
`@aws-sdk/s3-request-presigner` directly — no interface abstraction. A
single `StorageService` is injected into `UserModule` and `WorkspaceModule`.

MinIO is added to `docker-compose.dev.yml` as the local S3-compatible
target. The same SDK code points at Cloudflare R2 in production via env
vars only — no code branching between dev/prod.

Bucket layout is flat, single bucket: `avatars/{uuid}.{ext}`. The key
stored in `avatar_key`/`logo_key` is just `{uuid}.{ext}` (no folder
segments), since it's used directly as a single URL path segment.

## Upload flow

Presigned POST (not presigned PUT), so S3 enforces `content-length-range`
and `Content-Type` server-side — the app never trusts client-declared
file size.

1. Frontend calls a presign endpoint with `{ contentType }`, gets back
   `{ url, fields, key }`.
2. Browser builds a `FormData` from `fields` + the file, `POST`s directly
   to `url` (S3/MinIO). File bytes never touch NestJS.
3. On success, frontend calls the existing `PATCH /users/:userId` (or
   `PATCH /workspaces/:workspaceId`) with `{ avatar_key: key }` (or
   `{ logo_key: key }`) — reuses Milestone 1's update mutation, no new
   "confirm" endpoint.
4. `UserService.update` / `WorkspaceService.update`: if the incoming key
   differs from the current DB value and an old key existed, delete the
   old S3 object after the DB write succeeds (best-effort — log on
   failure, never fail the request over it).
5. Existing React Query invalidation (`sessionKeys.user()`, workspace
   query invalidation) refreshes the avatar everywhere it renders.

## Components

- **`StorageService`**
  - `presignAvatarUpload(contentType: string): Promise<{ url, fields, key }>`
    — presigned POST, `content-length-range` 0–5MB, `Content-Type`
    condition restricted to `image/png`, `image/jpeg`, `image/webp`,
    `image/gif`.
  - `presignGet(key: string): Promise<string>` — short-lived presigned GET
    URL.
  - `deleteObject(key: string): Promise<void>`.
- **`UserController`**: `POST /users/:userId/avatar/presign`, guarded by
  `OwnershipGuard("userId")`, throttled like `change-password`
  (`{ ttl: 3600, limit: 5 }`).
- **`WorkspaceController`**: `POST /workspaces/:workspaceId/logo/presign`,
  guarded by `IsMemberGuard, WorkspaceRolesGuard` +
  `RequireWorkspaceRoles(OWNER, ADMIN)` — same stack as the existing
  `PATCH :workspaceId`.
- **New public controller**: `GET /avatars/:key` — unauthenticated (key is
  an unguessable UUID, avatars aren't sensitive), calls `presignGet` and
  302-redirects.
- **`UserService.update` / `WorkspaceService.update`**: old-key cleanup as
  described above.

## Frontend URL fix (ROADMAP §3.2)

`user-avatar.tsx` / `workspace-avatar.tsx` currently build
`/api/avatars/${key}` as a same-origin relative path, but the app talks to
the backend cross-origin via `NEXT_PUBLIC_API_URL` everywhere else
(`services/auth.service.tsx`). Fix: `${NEXT_PUBLIC_API_URL}/avatars/${key}`
— matches every other API call, no Next.js route handler needed.

## Error handling

- S3 unreachable at presign time → `InternalServerErrorException`, surfaces
  through the existing `{ success: false }` `UserOperationState` /
  `WorkspaceOperationState` shape in the frontend service layer.
- Old-key delete failure → logged, swallowed, never blocks the
  profile/workspace update response.
- `GET /avatars/:key` for a stale/missing key → presigned redirect is still
  issued (S3 returns 404 on the actual GET); `<UserAvatar>` /
  `<WorkspaceAvatar>` already fall back to initials on image load error —
  verify this still holds.

## Config

Fail-fast in `main.ts`, same pattern as `CORS_ORIGIN`: process exits if any
of `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`,
`STORAGE_SECRET_KEY`, `STORAGE_REGION` are missing.

## Testing

- `storage.service.spec.ts`: unit tests for key generation and presign
  condition building (mock S3 client), matching the existing
  `cache.service.spec.ts` pattern.
- Manual verification: upload an avatar in dev against the MinIO console
  (`localhost:9001`), confirm the object appears, confirm the old object
  is deleted on replace, confirm the `<img>` renders via the redirect.

## Out of scope (deferred to later sub-projects)

- `/api/files/:key` and `TaskAttachment` (Task Attachments sub-project).
- Chat file attachments (Chat Attachments sub-project).
- `FILES` module type and team drive page (Files Module sub-project).
