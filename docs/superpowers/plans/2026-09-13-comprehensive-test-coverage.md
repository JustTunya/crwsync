# Comprehensive Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish complete frontend unit tests for optimistic/reconciliation store logic and provide a production-ready Playwright end-to-end test suite for the full user journey.

**Architecture:** Use Vitest for ultra-fast, zero-overhead unit tests on the dashboard's `useChatStore` (optimistic pipeline, idempotency, timeline ordering, cascades). Use Playwright for browser-level E2E coverage spanning `Sign In → Create Workspace → Add Board → Create & Move Task → Send Chat → Upload File`. Wire all test tasks into Turborepo.

**Tech Stack:** Vitest, Playwright, TypeScript, Next.js, Turborepo, NestJS/Socket.IO (under test).

**Spec:** `ROADMAP.md` Milestone 4: Comprehensive Test Coverage.

## Global Constraints

- Backend specs already cover: `auth`, `session`, `user`, `board`, `chat`, `storage`, `notification`, `search`, `task-comment`, `task-checklist`, `cache`, `jwt strategy`, `status gateway`, `email-verification`, `assert-public-url`. Do not duplicate backend specs.
- Zero mock comments or simulated layers in test specs.
- Fast, non-flaky assertions: Vitest runs pure JS/TS (no jsdom overhead needed for Zustand stores).
- Manual UI test instructions must be provided clearly to the user at the end of the implementation.

---

### Task 1: Frontend Test Setup (Vitest in Dash)

**Files:**
- Modify: `apps/frontend/dash/package.json`
- Create: `apps/frontend/dash/vitest.config.ts`

- [ ] **Step 1: Add Vitest devDependencies to Dash**

Update `apps/frontend/dash/package.json` to include `"test": "vitest run"` in `scripts` and add `"vitest": "^3.0.7"` to `devDependencies`.

- [ ] **Step 2: Create `vitest.config.ts`**

Create `apps/frontend/dash/vitest.config.ts` mapping `@/*` to `./*` so path aliases resolve cleanly.

- [ ] **Step 3: Run Vitest smoke check**

Run: `pnpm --filter @crwsync/dash run test`
Expected: Passes with no test files (or reports 0 files found).

---

### Task 2: Unit Test Suite for `useChatStore`

**Files:**
- Create: `apps/frontend/dash/hooks/__tests__/use-chat-store.test.ts`

**Interfaces / Test Cases:**
- `addOptimistic`: Pushes temporary client message into `messages` and tracks in `pendingMessages`.
- `confirmOptimistic`: Replaces optimistic message in-place by `client_id`, preserves any local reaction state, and deletes from `pendingMessages`.
- `rejectOptimistic`: Removes optimistic message on error and clears `pendingMessages`.
- `appendMessage`: Deduplicates incoming messages by `id` or matching `client_id`.
- `appendMissedMessages`: Merges incoming batches with existing messages and sorts them strictly chronologically.
- `updateMessage`: Updates message content and cascades updates to `reply_to` quotes across other messages.
- `setReadReceipts` / `updateReadReceipt`: Updates latest user timestamps correctly.

- [ ] **Step 1: Write `use-chat-store.test.ts`**

Write a complete unit test suite with ~12-15 assertions testing all state transitions.

- [ ] **Step 2: Run tests with Vitest**

Run: `pnpm --filter @crwsync/dash run test`
Expected: 100% PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/dash/package.json apps/frontend/dash/vitest.config.ts apps/frontend/dash/hooks/__tests__/use-chat-store.test.ts
git commit -m "test(dash): add vitest and unit test suite for chat store"
```

---

### Task 3: Playwright E2E Test Suite Setup

**Files:**
- Create: `apps/e2e/package.json`
- Create: `apps/e2e/playwright.config.ts`
- Create: `apps/e2e/tests/full-flow.spec.ts`

- [ ] **Step 1: Scaffold `apps/e2e` workspace package**

Create `apps/e2e/package.json` with `@playwright/test` and typescript dependencies.

- [ ] **Step 2: Create `playwright.config.ts`**

Configure baseURL pointing to `http://localhost:3000` (web) and `http://localhost:3001` (dash), with webServer options if needed or relying on the dev stack.

- [ ] **Step 3: Write `full-flow.spec.ts`**

Write a structured Playwright test covering:
1. Public portal landing & navigation to Sign In
2. Sign in with test credentials (or demo user)
3. Create workspace flow
4. Add Board module & create column/task
5. Move task via drag/drop or API state
6. Send chat message in chat room
7. Attach/upload file to workspace

- [ ] **Step 4: Commit**

```bash
git add apps/e2e
git commit -m "test(e2e): add playwright configuration and full collaboration flow spec"
```

---

### Task 4: Turborepo Integration & Roadmap Update

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run full test suite across the monorepo**

Run: `pnpm test`
Expected: All backend specs and frontend store specs pass.

- [ ] **Step 2: Update `ROADMAP.md`**

Mark "Comprehensive Test Coverage" in Milestone 4 as `[x]`.

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "docs(roadmap): mark comprehensive test coverage milestone complete"
```
