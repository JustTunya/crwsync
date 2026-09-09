# Storage Foundation + Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an S3-compatible storage foundation (MinIO in dev, S3-compatible in prod) and wire it end-to-end through the first real consumer: user and workspace avatar upload.

**Architecture:** A single `StorageService` (`apps/backend/src/storage/`) wraps the AWS S3 SDK directly — no interface abstraction. Uploads use presigned POST (S3-enforced size/type limits, no bytes through NestJS). Retrieval is a public `GET /avatars/:key` that 302-redirects to a presigned GET. `avatar_key`/`logo_key` DB columns and their update DTOs already exist — no schema migration in this cycle.

**Tech Stack:** NestJS, `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/s3-request-presigner`, MinIO (dev), Prisma, Next.js/React Query on the frontend.

**Spec:** `docs/superpowers/specs/2026-09-09-storage-foundation-avatar-upload-design.md`

## Global Constraints

- Avatar uploads: image mime types only (`image/png`, `image/jpeg`, `image/webp`, `image/gif`), max 5MB, enforced by S3 itself via presigned POST conditions — not just app-level checks.
- Bucket layout is flat: S3 object key is `avatars/{uuid}.{ext}`; the DB-stored `avatar_key`/`logo_key` value is just `{uuid}.{ext}` (no folder segments — it's used directly as a URL path segment).
- `GET /avatars/:key` is unauthenticated (the key is an unguessable UUID; avatars aren't sensitive).
- Old S3 object is deleted (best-effort, never blocks the request) whenever `avatar_key`/`logo_key` changes to a new value.
- Backend fails fast (`process.exit(1)`) at boot if `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, or `STORAGE_REGION` are missing — same pattern as the existing `CORS_ORIGIN` check in `main.ts`.
- `/api/files/:key` and `TaskAttachment` are explicitly out of scope for this plan.

---

### Task 1: Storage infrastructure — deps, MinIO, env, fail-fast config

**Files:**
- Modify: `apps/backend/package.json` (add deps)
- Modify: `docker-compose.dev.yml`
- Modify: `apps/backend/.env`
- Modify: `apps/backend/src/main.ts`

**Interfaces:**
- Produces: env vars `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION` available via `ConfigService.get<string>(...)` for all later tasks.

- [ ] **Step 1: Install AWS SDK packages**

Run: `pnpm --filter @crwsync/backend add @aws-sdk/client-s3 @aws-sdk/s3-presigned-post @aws-sdk/s3-request-presigner`

- [ ] **Step 2: Add MinIO to the dev compose stack**

In `docker-compose.dev.yml`, add a `minio` service alongside `postgres`/`redis`:

```yaml
  minio:
    image: minio/minio
    container_name: crwsync-minio-dev
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"
    volumes:
      - minio_data_dev:/data
```

And add the volume to the `volumes:` section at the bottom:

```yaml
  minio_data_dev:
    name: crwsync-minio-data-dev
```

- [ ] **Step 3: Start the stack and confirm MinIO comes up**

Run: `docker compose -f docker-compose.dev.yml up -d minio`
Expected: container `crwsync-minio-dev` running; `http://localhost:9001` (MinIO console) reachable in a browser with `minioadmin` / `minioadmin`.

- [ ] **Step 4: Add storage env vars to the backend**

Append to `apps/backend/.env`:

```
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=crwsync-avatars
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_REGION=us-east-1
```

- [ ] **Step 5: Fail-fast validation in `main.ts`**

In `apps/backend/src/main.ts`, right after the existing `CORS_ORIGIN` check (after the `app.enableCors(...)` block, before `const cookieSecret = ...`), add:

```typescript
  const requiredStorageVars = ["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY", "STORAGE_REGION"];
  for (const key of requiredStorageVars) {
    if (!config.get<string>(key)) {
      logger.error(`${key} must be set`);
      process.exit(1);
    }
  }
```

- [ ] **Step 6: Verify the backend still boots**

Run: `pnpm --filter @crwsync/backend start:dev`
Expected: server starts on port 8080 with no `must be set` errors, then stop it (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/package.json apps/backend/pnpm-lock.yaml docker-compose.dev.yml apps/backend/src/main.ts
git commit -m "chore: add S3 SDK deps, MinIO dev service, and storage env fail-fast checks"
```

Note: `apps/backend/.env` is gitignored — do not add it.

---

### Task 2: Shared types for presigned uploads

**Files:**
- Create: `packages/types/src/storage.ts`
- Modify: `packages/types/src/index.ts`
- Modify: `packages/types/src/user.ts`

**Interfaces:**
- Produces: `PresignedAvatarUpload { url: string; fields: Record<string, string>; key: string }`, exported from `@crwsync/types`.
- Produces: `UpdateUserProfilePayload.avatar_key?: string`.

- [ ] **Step 1: Create the shared presign type**

Create `packages/types/src/storage.ts`:

```typescript
export interface PresignedAvatarUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
}
```

- [ ] **Step 2: Export it from the package index**

In `packages/types/src/index.ts`, add:

```typescript
export * from "./storage";
```

- [ ] **Step 3: Add `avatar_key` to the profile update payload**

In `packages/types/src/user.ts`, change:

```typescript
export interface UpdateUserProfilePayload {
  firstname?: string;
  lastname?: string;
  username?: string;
}
```

to:

```typescript
export interface UpdateUserProfilePayload {
  firstname?: string;
  lastname?: string;
  username?: string;
  avatar_key?: string;
}
```

- [ ] **Step 4: Build the types package**

Run: `pnpm --filter @crwsync/types build`
Expected: builds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/storage.ts packages/types/src/index.ts packages/types/src/user.ts
git commit -m "feat(types): add PresignedAvatarUpload and avatar_key on profile update payload"
```

---

### Task 3: `StorageService`

**Files:**
- Create: `apps/backend/src/storage/storage.service.ts`
- Test: `apps/backend/src/storage/storage.service.spec.ts`

**Interfaces:**
- Consumes: `PresignedAvatarUpload` from `@crwsync/types` (Task 2); `ConfigService` from `@nestjs/config`.
- Produces: `StorageService` with `presignAvatarUpload(contentType: string): Promise<PresignedAvatarUpload>`, `presignGet(key: string): Promise<string>`, `deleteObject(key: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/storage/storage.service.spec.ts`:

```typescript
import { ConfigService } from "@nestjs/config";
import { StorageService } from "./storage.service";

describe("StorageService", () => {
  let service: StorageService;

  const values: Record<string, string> = {
    STORAGE_BUCKET: "test-bucket",
    STORAGE_ENDPOINT: "http://localhost:9000",
    STORAGE_REGION: "us-east-1",
    STORAGE_ACCESS_KEY: "test-access-key",
    STORAGE_SECRET_KEY: "test-secret-key",
  };

  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  beforeEach(() => {
    service = new StorageService(config);
  });

  it("rejects unsupported content types", async () => {
    await expect(service.presignAvatarUpload("application/pdf")).rejects.toThrow("Unsupported image type");
  });

  it("returns a presigned POST with a UUID key ending in the correct extension", async () => {
    const result = await service.presignAvatarUpload("image/png");

    expect(result.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(result.url).toContain("test-bucket");
    expect(result.fields["Content-Type"]).toBe("image/png");
  });

  it("returns a presigned GET url containing the key", async () => {
    const url = await service.presignGet("abc123.png");
    expect(url).toContain("abc123.png");
  });

  it("deletes an object by key, swallowing errors", async () => {
    const send = jest.fn().mockRejectedValue(new Error("network down"));
    (service as unknown as { client: { send: typeof send } }).client = { send };

    await expect(service.deleteObject("some-key.png")).resolves.toBeUndefined();
    expect(send).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @crwsync/backend test -- storage.service.spec`
Expected: FAIL — `Cannot find module './storage.service'`.

- [ ] **Step 3: Implement `StorageService`**

Create `apps/backend/src/storage/storage.service.ts`:

```typescript
import { randomUUID } from "crypto";
import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PresignedAvatarUpload } from "@crwsync/types";

const AVATAR_PREFIX = "avatars/";
const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes

const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("STORAGE_BUCKET")!;
    this.client = new S3Client({
      endpoint: this.config.get<string>("STORAGE_ENDPOINT"),
      region: this.config.get<string>("STORAGE_REGION"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>("STORAGE_ACCESS_KEY")!,
        secretAccessKey: this.config.get<string>("STORAGE_SECRET_KEY")!,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created storage bucket ${this.bucket}`);
      } catch (error) {
        this.logger.warn(`Could not verify or create storage bucket ${this.bucket}: ${error}`);
      }
    }
  }

  async presignAvatarUpload(contentType: string): Promise<PresignedAvatarUpload> {
    const ext = AVATAR_MIME_EXTENSIONS[contentType];
    if (!ext) throw new BadRequestException("Unsupported image type");

    const key = `${randomUUID()}.${ext}`;

    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: `${AVATAR_PREFIX}${key}`,
      Conditions: [
        ["content-length-range", 0, MAX_AVATAR_UPLOAD_BYTES],
        { "Content-Type": contentType },
      ],
      Fields: { "Content-Type": contentType },
      Expires: PRESIGN_EXPIRY_SECONDS,
    });

    return { url, fields, key };
  }

  async presignGet(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: `${AVATAR_PREFIX}${key}` });
    return getSignedUrl(this.client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `${AVATAR_PREFIX}${key}` }));
    } catch (error) {
      this.logger.warn(`Failed to delete storage object ${key}: ${error}`);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @crwsync/backend test -- storage.service.spec`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/storage/storage.service.ts apps/backend/src/storage/storage.service.spec.ts
git commit -m "feat(backend): add StorageService for presigned S3 avatar uploads"
```

---

### Task 4: `StorageModule` + public `GET /avatars/:key`

**Files:**
- Create: `apps/backend/src/storage/storage.module.ts`
- Create: `apps/backend/src/storage/avatars.controller.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `StorageService` (Task 3); `Public` decorator from `src/common/decorators/public.decorator.ts`.
- Produces: `StorageService` available for injection anywhere in the app (global module); route `GET /avatars/:key`.

- [ ] **Step 1: Create `StorageModule`**

Create `apps/backend/src/storage/storage.module.ts`:

```typescript
import { Global, Module } from "@nestjs/common";
import { StorageService } from "src/storage/storage.service";
import { AvatarsController } from "src/storage/avatars.controller";

@Global()
@Module({
  controllers: [AvatarsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 2: Create `AvatarsController`**

Create `apps/backend/src/storage/avatars.controller.ts`:

```typescript
import { Controller, Get, HttpStatus, Param, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { Public } from "src/common/decorators/public.decorator";
import { StorageService } from "src/storage/storage.service";

@Controller("avatars")
export class AvatarsController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @SkipThrottle()
  @Get(":key")
  async getAvatar(@Param("key") key: string, @Res() res: Response): Promise<void> {
    const url = await this.storageService.presignGet(key);
    res.redirect(HttpStatus.FOUND, url);
  }
}
```

- [ ] **Step 3: Register `StorageModule` in `AppModule`**

In `apps/backend/src/app.module.ts`, add the import statement near the other module imports (after `import { RedisModule } from "src/redis/redis.module";`):

```typescript
import { StorageModule } from "src/storage/storage.module";
```

And add `StorageModule` to the `imports` array (after `RedisModule,`):

```typescript
    RedisModule,
    StorageModule,
```

- [ ] **Step 4: Verify the app boots and the route responds**

Run: `pnpm --filter @crwsync/backend start:dev`

In another terminal: `curl -i http://localhost:8080/avatars/does-not-exist.png`
Expected: HTTP `302` with a `Location` header pointing at the MinIO endpoint (the object itself doesn't exist yet — that's fine, the redirect is still issued per the spec's error-handling design). Stop the dev server after confirming.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/storage/storage.module.ts apps/backend/src/storage/avatars.controller.ts apps/backend/src/app.module.ts
git commit -m "feat(backend): register StorageModule and public GET /avatars/:key redirect"
```

---

### Task 5: Presign endpoints on `UserController` and `WorkspaceController`

**Files:**
- Create: `apps/backend/src/storage/dto/presign-avatar.dto.ts`
- Modify: `apps/backend/src/user/user.controller.ts`
- Modify: `apps/backend/src/workspace/workspace.controller.ts`

**Interfaces:**
- Consumes: `StorageService.presignAvatarUpload` (Task 3); `PresignedAvatarUpload` (Task 2).
- Produces: `POST /users/:userId/avatar/presign` and `POST /workspaces/:workspaceId/logo/presign`, both returning `PresignedAvatarUpload`.

- [ ] **Step 1: Create the shared presign request DTO**

Create `apps/backend/src/storage/dto/presign-avatar.dto.ts`:

```typescript
import { IsString } from "class-validator";

export class PresignAvatarDto {
  @IsString()
  contentType!: string;
}
```

- [ ] **Step 2: Add the presign endpoint to `UserController`**

In `apps/backend/src/user/user.controller.ts`, add imports:

```typescript
import { PresignAvatarDto } from "src/storage/dto/presign-avatar.dto";
import { StorageService } from "src/storage/storage.service";
import { PresignedAvatarUpload } from "@crwsync/types";
```

Update the constructor:

```typescript
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly storageService: StorageService,
  ) {}
```

Add a new method (after `findOne`, before `update` — or anywhere in the class body):

```typescript
  @UseGuards(new OwnershipGuard("userId"))
  @Throttle({ default: { ttl: 3600, limit: 5 } })
  @Post(":userId/avatar/presign")
  @HttpCode(HttpStatus.OK)
  presignAvatar(
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Body() dto: PresignAvatarDto,
  ): Promise<PresignedAvatarUpload> {
    return this.storageService.presignAvatarUpload(dto.contentType);
  }
```

(`userId` is unused inside the method body beyond guard/route matching — the ownership check happens in the guard. This mirrors `changePassword`'s signature style in the same file.)

- [ ] **Step 3: Add the presign endpoint to `WorkspaceController`**

In `apps/backend/src/workspace/workspace.controller.ts`, add imports:

```typescript
import { PresignAvatarDto } from "src/storage/dto/presign-avatar.dto";
import { StorageService } from "src/storage/storage.service";
import { PresignedAvatarUpload } from "@crwsync/types";
```

Update the constructor:

```typescript
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly storageService: StorageService,
  ) {}
```

Add a new method (after the `update` method):

```typescript
  @Post(":workspaceId/logo/presign")
  @Throttle({ default: { ttl: 3600, limit: 5 } })
  @UseGuards(IsMemberGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRoleEnum.OWNER, WorkspaceRoleEnum.ADMIN)
  presignLogo(
    @Param("workspaceId", new ParseUUIDPipe({ version: "4" })) workspaceId: string,
    @Body() dto: PresignAvatarDto,
  ): Promise<PresignedAvatarUpload> {
    return this.storageService.presignAvatarUpload(dto.contentType);
  }
```

- [ ] **Step 4: Verify both endpoints are reachable**

Run: `pnpm --filter @crwsync/backend start:dev`

Manual check (requires a valid session cookie from a logged-in dev user — do this from the browser devtools console on the dash app, or skip to Task 10's full end-to-end check): confirm `POST /users/:userId/avatar/presign` and `POST /workspaces/:workspaceId/logo/presign` return `200` with `{ url, fields, key }` for a valid `{ "contentType": "image/png" }` body, and `400` for `{ "contentType": "application/pdf" }`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/storage/dto/presign-avatar.dto.ts apps/backend/src/user/user.controller.ts apps/backend/src/workspace/workspace.controller.ts
git commit -m "feat(backend): add avatar/logo presign endpoints to user and workspace controllers"
```

---

### Task 6: Delete old avatar/logo object on replace

**Files:**
- Modify: `apps/backend/src/user/user.service.ts`
- Modify: `apps/backend/src/workspace/workspace.service.ts`

**Interfaces:**
- Consumes: `StorageService.deleteObject` (Task 3).

- [ ] **Step 1: Inject `StorageService` into `UserService`**

In `apps/backend/src/user/user.service.ts`, add the import:

```typescript
import { StorageService } from "src/storage/storage.service";
```

Update the constructor:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly verificationService: VerificationService,
    private readonly sessionService: SessionService,
    private readonly storageService: StorageService,
  ) {}
```

- [ ] **Step 2: Delete the old avatar object in `update()`**

In `apps/backend/src/user/user.service.ts`, in the `update` method, right after the `const updated = await this.prisma.user.update({...});` block, add:

```typescript
    if (avatar_key !== undefined && avatar_key !== user.avatar_key && user.avatar_key) {
      await this.storageService.deleteObject(user.avatar_key);
    }
```

- [ ] **Step 3: Inject `StorageService` into `WorkspaceService`**

In `apps/backend/src/workspace/workspace.service.ts`, add the import:

```typescript
import { StorageService } from "src/storage/storage.service";
```

Update the constructor:

```typescript
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private statusGateway: StatusGateway,
    private storageService: StorageService,
  ) {}
```

- [ ] **Step 4: Fetch the old `logo_key` and delete it on replace in `update()`**

In `apps/backend/src/workspace/workspace.service.ts`, change the `existing` query in `update()` to also select `logo_key`:

```typescript
    const [existing, members] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id }, select: { slug: true, logo_key: true } }),
      this.prisma.workspaceMember.findMany({
        where: { workspace_id: id },
        select: { user_id: true },
      }),
    ]);
```

Then, right after `const result = await this.prisma.workspace.update({ where: { id }, data: dto });`, add:

```typescript
    if (dto.logo_key !== undefined && dto.logo_key !== existing?.logo_key && existing?.logo_key) {
      await this.storageService.deleteObject(existing.logo_key);
    }
```

- [ ] **Step 5: Confirm the backend still builds**

Run: `pnpm --filter @crwsync/backend build`
Expected: builds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/user/user.service.ts apps/backend/src/workspace/workspace.service.ts
git commit -m "feat(backend): delete old avatar/logo object from storage on replace"
```

---

### Task 7: Frontend upload helper, services, and mutation hooks

**Files:**
- Create: `apps/frontend/dash/lib/upload-to-storage.ts`
- Modify: `apps/frontend/dash/services/user.service.tsx`
- Modify: `apps/frontend/dash/services/workspace.service.tsx`
- Modify: `apps/frontend/dash/hooks/use-user.ts`
- Modify: `apps/frontend/dash/hooks/use-workspaces.ts`

**Interfaces:**
- Consumes: `PresignedAvatarUpload` (Task 2); backend endpoints from Task 5 (`POST /users/:userId/avatar/presign`, `POST /workspaces/:workspaceId/logo/presign`).
- Produces: `uploadToPresignedPost(presign: PresignedAvatarUpload, file: File): Promise<void>`; `useUploadUserAvatar()` mutation (`{ userId, file }` → `UserType`); `useUploadWorkspaceLogo()` mutation (`{ workspaceId, file }` → `Workspace`).

- [ ] **Step 1: Write the presigned-POST upload helper**

Create `apps/frontend/dash/lib/upload-to-storage.ts`:

```typescript
import { PresignedAvatarUpload } from "@crwsync/types";

export async function uploadToPresignedPost(presign: PresignedAvatarUpload, file: File): Promise<void> {
  const formData = new FormData();
  Object.entries(presign.fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);

  const response = await fetch(presign.url, { method: "POST", body: formData });
  if (!response.ok) throw new Error("Upload failed");
}
```

- [ ] **Step 2: Add the presign service call to `user.service.tsx`**

In `apps/frontend/dash/services/user.service.tsx`, add the `PresignedAvatarUpload` import to the existing `@crwsync/types` import line, then add:

```typescript
export async function presignUserAvatar(userId: string, contentType: string): Promise<UserOperationState<PresignedAvatarUpload>> {
  try {
    const response = await api.post(`/users/${userId}/avatar/presign`, { contentType });
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to get upload URL" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
```

- [ ] **Step 3: Add the presign service call to `workspace.service.tsx`**

In `apps/frontend/dash/services/workspace.service.tsx`, add the `PresignedAvatarUpload` import to the existing `@crwsync/types` import line, then add:

```typescript
export async function presignWorkspaceLogo(workspaceId: string, contentType: string): Promise<WorkspaceOperationState<PresignedAvatarUpload>> {
  try {
    const response = await api.post(`/workspaces/${workspaceId}/logo/presign`, { contentType });
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to get upload URL" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
```

- [ ] **Step 4: Add `useUploadUserAvatar` to `use-user.ts`**

In `apps/frontend/dash/hooks/use-user.ts`, add to the existing imports:

```typescript
import { presignUserAvatar, updateUserProfile, changePassword, getUserSessions, revokeUserSession } from "@/services/user.service";
import { uploadToPresignedPost } from "@/lib/upload-to-storage";
```

(replacing the existing `updateUserProfile, changePassword, getUserSessions, revokeUserSession` import line with the one above, which adds `presignUserAvatar`)

Add the new hook (after `useUpdateUserProfile`):

```typescript
export function useUploadUserAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      const { success, data: presign, message } = await presignUserAvatar(userId, file.type);
      if (!success || !presign) throw new Error(message);

      await uploadToPresignedPost(presign, file);

      const { success: updateSuccess, data: result, message: updateMessage } = await updateUserProfile(userId, { avatar_key: presign.key });
      if (!updateSuccess || !result) throw new Error(updateMessage);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.user() });
    },
  });
}
```

- [ ] **Step 5: Add `useUploadWorkspaceLogo` to `use-workspaces.ts`**

In `apps/frontend/dash/hooks/use-workspaces.ts`, add `presignWorkspaceLogo` to the existing `workspace.service` import and add `uploadToPresignedPost`:

```typescript
import { uploadToPresignedPost } from "@/lib/upload-to-storage";
```

Add the new hook (after `useUpdateWorkspace`):

```typescript
export function useUploadWorkspaceLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, file }: { workspaceId: string; file: File }) => {
      const { success, data: presign, message } = await presignWorkspaceLogo(workspaceId, file.type);
      if (!success || !presign) throw new Error(message);

      await uploadToPresignedPost(presign, file);

      const { success: updateSuccess, data: result, message: updateMessage } = await updateWorkspace(workspaceId, { logo_key: presign.key });
      if (!updateSuccess || !result) throw new Error(updateMessage);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}
```

- [ ] **Step 6: Confirm the frontend builds**

Run: `pnpm --filter @crwsync/dash build`
Expected: builds with no TypeScript errors. (If `NEXT_NO_STANDALONE` symlink issues arise on Windows, run with `NEXT_NO_STANDALONE=1` prefixed, matching the note already in `next.config.ts`.)

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/dash/lib/upload-to-storage.ts apps/frontend/dash/services/user.service.tsx apps/frontend/dash/services/workspace.service.tsx apps/frontend/dash/hooks/use-user.ts apps/frontend/dash/hooks/use-workspaces.ts
git commit -m "feat(dash): add presigned upload helper and avatar/logo upload mutation hooks"
```

---

### Task 8: `AvatarUpload` component wired into profile and workspace settings

**Files:**
- Create: `apps/frontend/dash/components/settings/avatar-upload.tsx`
- Modify: `apps/frontend/dash/components/settings/profile-form.tsx`
- Modify: `apps/frontend/dash/components/settings/workspace-general-form.tsx`

**Interfaces:**
- Consumes: `useUploadUserAvatar` / `useUploadWorkspaceLogo` (Task 7); `UserAvatar` / `WorkspaceAvatar` components (existing).
- Produces: `<AvatarUpload preview isUploading error onSelect />` reusable control.

- [ ] **Step 1: Build the shared `AvatarUpload` control**

Create `apps/frontend/dash/components/settings/avatar-upload.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface AvatarUploadProps {
  preview: React.ReactNode;
  isUploading: boolean;
  error?: string | null;
  onSelect: (file: File) => void;
}

export function AvatarUpload({ preview, isUploading, error, onSelect }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      {preview}
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          {isUploading ? "Uploading..." : "Change image"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `ProfileForm`**

In `apps/frontend/dash/components/settings/profile-form.tsx`, add imports:

```typescript
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { useUpdateUserProfile, useUploadUserAvatar } from "@/hooks/use-user";
```

(replacing the existing `import { useUpdateUserProfile } from "@/hooks/use-user";` line)

In `ProfileFormFields`, add the upload mutation and error state alongside the existing `mutateAsync` line:

```typescript
  const { mutateAsync, isPending, error } = useUpdateUserProfile();
  const { mutateAsync: uploadAvatar, isPending: isUploadingAvatar, error: avatarError } = useUploadUserAvatar();
```

In the JSX, inside `<CardContent>`, before the name/username fields grid, add:

```tsx
            <AvatarUpload
              preview={<UserAvatar user={user} size={16} />}
              isUploading={isUploadingAvatar}
              error={avatarError?.message}
              onSelect={(file) => uploadAvatar({ userId: user.id, file })}
            />
```

- [ ] **Step 3: Wire it into `WorkspaceGeneralForm`**

In `apps/frontend/dash/components/settings/workspace-general-form.tsx`, add imports:

```typescript
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { useUpdateWorkspace, useUploadWorkspaceLogo } from "@/hooks/use-workspaces";
```

(replacing the existing `import { useUpdateWorkspace } from "@/hooks/use-workspaces";` line)

In `WorkspaceGeneralFormFields`, add the upload mutation alongside the existing `mutateAsync` line:

```typescript
  const { mutateAsync, isPending, error } = useUpdateWorkspace();
  const { mutateAsync: uploadLogo, isPending: isUploadingLogo, error: logoError } = useUploadWorkspaceLogo();
```

In the JSX, inside `<CardContent>`, before the name/slug fields, add:

```tsx
            <AvatarUpload
              preview={<WorkspaceAvatar avatar_key={workspace.logo_key ?? undefined} name={workspace.name} className="size-16 rounded-lg" />}
              isUploading={isUploadingLogo}
              error={logoError?.message}
              onSelect={(file) => uploadLogo({ workspaceId: workspace.id, file })}
            />
```

- [ ] **Step 4: Confirm the frontend builds**

Run: `pnpm --filter @crwsync/dash build`
Expected: builds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/dash/components/settings/avatar-upload.tsx apps/frontend/dash/components/settings/profile-form.tsx apps/frontend/dash/components/settings/workspace-general-form.tsx
git commit -m "feat(dash): add avatar/logo upload UI to profile and workspace settings"
```

---

### Task 9: Fix avatar URL resolution + add image-error fallback

**Files:**
- Modify: `apps/frontend/dash/components/user-avatar.tsx`
- Modify: `apps/frontend/dash/components/workspace-avatar.tsx`

**Interfaces:**
- Produces: avatars resolve via `${NEXT_PUBLIC_API_URL}/avatars/${key}` and fall back to initials on load failure.

- [ ] **Step 1: Fix `user-avatar.tsx`**

In `apps/frontend/dash/components/user-avatar.tsx`, change:

```typescript
  if (user && user.avatar_key) {
    const avatarUrl = `/api/avatars/${user.avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${user.firstname} ${user.lastname} avatar`}
        title={`${user.firstname} ${user.lastname}`}
        className={cn("rounded-full object-cover", className)}
        width={pixels}
        height={pixels}
        priority
      />
    );
  } else {
```

to:

```typescript
  const [imageFailed, setImageFailed] = useState(false);

  if (user && user.avatar_key && !imageFailed) {
    const avatarUrl = `${process.env.NEXT_PUBLIC_API_URL}/avatars/${user.avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${user.firstname} ${user.lastname} avatar`}
        title={`${user.firstname} ${user.lastname}`}
        className={cn("rounded-full object-cover", className)}
        width={pixels}
        height={pixels}
        priority
        onError={() => setImageFailed(true)}
      />
    );
  } else {
```

This introduces `useState`, so add it to the existing React import at the top of the file — change:

```typescript
import Image from "next/image";
```

to:

```typescript
import { useState } from "react";
import Image from "next/image";
```

Note: `UserAvatar` is not currently a `"use client"` component — `useState` requires it to be one. Add `"use client";` as the first line of the file (before the imports) if it isn't already present.

- [ ] **Step 2: Fix `workspace-avatar.tsx`**

In `apps/frontend/dash/components/workspace-avatar.tsx`, change:

```typescript
  if (avatar_key) {
    const avatarUrl = `/api/avatars/${avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${name} workspace avatar`}
        className={cn("size-6 rounded-sm object-cover", className)}
        width={24}
        height={24}
      />
    );
  } else {
```

to:

```typescript
  const [imageFailed, setImageFailed] = useState(false);

  if (avatar_key && !imageFailed) {
    const avatarUrl = `${process.env.NEXT_PUBLIC_API_URL}/avatars/${avatar_key}`;

    return (
      <Image
        src={avatarUrl}
        alt={`${name} workspace avatar`}
        className={cn("size-6 rounded-sm object-cover", className)}
        width={24}
        height={24}
        onError={() => setImageFailed(true)}
      />
    );
  } else {
```

Add `"use client";` as the first line of the file, and change the import:

```typescript
import { cn } from "@/lib/utils";
import Image from "next/image";
```

to:

```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
```

- [ ] **Step 3: Confirm the frontend builds**

Run: `pnpm --filter @crwsync/dash build`
Expected: builds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/dash/components/user-avatar.tsx apps/frontend/dash/components/workspace-avatar.tsx
git commit -m "fix(dash): resolve avatars via NEXT_PUBLIC_API_URL and fall back to initials on load error"
```

---

### Task 10: End-to-end manual verification

**Files:** none (verification only)

**Interfaces:** none — this task exercises Tasks 1–9 together.

- [ ] **Step 1: Bring up the full dev stack**

Run: `docker compose -f docker-compose.dev.yml up -d`
Expected: `postgres`, `redis`, and `minio` all running.

- [ ] **Step 2: Start backend and dash dev servers**

Run: `pnpm --filter @crwsync/backend start:dev` (separate terminal)
Run: `pnpm --filter @crwsync/dash dev` (separate terminal)

- [ ] **Step 3: Upload a user avatar**

In the browser: log in, go to `/settings`, click "Change image" under Profile, pick a small PNG/JPEG. Confirm:
- The avatar preview updates after upload.
- `http://localhost:9001` (MinIO console, bucket `crwsync-avatars`) shows a new object under `avatars/`.
- Reloading the page still shows the new avatar (persisted via `avatar_key`).

- [ ] **Step 4: Replace the avatar and confirm old-object cleanup**

Upload a second image. Confirm:
- The new object appears in the MinIO console.
- The previous object is gone (deleted by `UserService.update`).

- [ ] **Step 5: Upload a workspace logo**

Go to `/[slug]/settings`, upload a logo under General. Confirm the same behavior (new object appears, avatar renders, replacing it deletes the old object) and that a `MEMBER`-role account gets a `403` if you try the same `POST /workspaces/:workspaceId/logo/presign` request directly (role gate working).

- [ ] **Step 6: Confirm the oversized/wrong-type rejection**

Attempt to upload a file over 5MB or a non-image file through the same UI flow (or via a direct `POST` to the presigned `url` with a large `file` field). Confirm S3/MinIO itself rejects it (not just the app) — the presigned POST conditions should cause MinIO to return an error response before the object is stored.

- [ ] **Step 7: Stop the stack**

Run: `docker compose -f docker-compose.dev.yml down`

No commit for this task — it's verification only.

---

## Self-Review Notes

- **Spec coverage:** `StorageService` (Task 3), MinIO dev setup (Task 1), presigned POST with size/type enforcement (Task 3/5), `GET /avatars/:key` redirect (Task 4), avatar upload UI for user + workspace (Tasks 7–8), old-object cleanup (Task 6), fail-fast config (Task 1), frontend URL bug fix (Task 9), unit test for `StorageService` (Task 3), manual verification (Task 10). All spec sections are covered; `/api/files/:key` and `TaskAttachment` are explicitly excluded per the spec's own scope boundary.
- **Type consistency:** `PresignedAvatarUpload { url, fields, key }` is defined once in Task 2 and used with identical field names through Tasks 3, 5, and 7. `avatar_key`/`logo_key` naming matches the existing Prisma schema and DTOs throughout — no renaming introduced.
- **No placeholders:** every step contains complete, runnable code or an exact shell command.
