/**
 * Demo seed for the crwsync 85s promo recording.
 *
 *   pnpm demo:seed
 *
 * Builds the exact state SHOTLIST.md expects, then re-runs the real statistics
 * queries and asserts every panel the video shows is non-empty.
 *
 * Idempotent: drops the demo workspace and the demo users, then rebuilds. It
 * never truncates a table and never touches rows outside the demo fixture.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import Redis from "ioredis";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const NOW = Date.now();

/* ── env ────────────────────────────────────────────────────────────────── */

function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const backendEnv = parseEnvFile(resolve(REPO_ROOT, "apps/backend/.env"));

const demoEnvPath = resolve(REPO_ROOT, ".env.demo");
if (!existsSync(demoEnvPath)) {
  console.error(
    `\n  Missing ${demoEnvPath}\n\n` +
      `  Copy the template and fill in credentials:\n` +
      `    cp .env.demo.example .env.demo\n\n` +
      `  .env.demo holds the demo account passwords and is gitignored.\n`,
  );
  process.exit(1);
}
const demoEnv = parseEnvFile(demoEnvPath);

function need(key) {
  const v = demoEnv[key];
  if (!v) {
    console.error(`\n  .env.demo is missing ${key}\n`);
    process.exit(1);
  }
  return v;
}

const DATABASE_URL = backendEnv.DATABASE_URL ?? process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("\n  No DATABASE_URL in apps/backend/.env\n");
  process.exit(1);
}

/* ── safety rail: local demo database only ──────────────────────────────── */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"]);

function assertLocalDatabase(url) {
  let host;
  let database;
  try {
    const u = new URL(url);
    host = u.hostname;
    database = u.pathname.replace(/^\//, "");
  } catch {
    console.error("\n  DATABASE_URL is not a parseable URL. Refusing to seed.\n");
    process.exit(1);
  }

  if (!LOCAL_HOSTS.has(host)) {
    console.error(
      `\n  Refusing to seed: DATABASE_URL points at "${host}", not a local host.\n` +
        `  This script only ever runs against a local demo database.\n`,
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("\n  Refusing to seed: NODE_ENV=production.\n");
    process.exit(1);
  }

  return { host, database };
}

const target = assertLocalDatabase(DATABASE_URL);

/* ── fixture ────────────────────────────────────────────────────────────── */

const WS = { name: "Northstar Labs", slug: "northstar", key: "NL" };

const USERS = {
  owner: {
    email: need("DEMO_OWNER_EMAIL"),
    username: need("DEMO_OWNER_USERNAME"),
    password: need("DEMO_OWNER_PASSWORD"),
    firstname: demoEnv.DEMO_OWNER_FIRSTNAME ?? "Mara",
    lastname: demoEnv.DEMO_OWNER_LASTNAME ?? "Ellis",
    birthdate: "1992-04-17",
  },
  member: {
    email: need("DEMO_MEMBER_EMAIL"),
    username: need("DEMO_MEMBER_USERNAME"),
    password: need("DEMO_MEMBER_PASSWORD"),
    firstname: demoEnv.DEMO_MEMBER_FIRSTNAME ?? "Tobias",
    lastname: demoEnv.DEMO_MEMBER_LASTNAME ?? "Reyes",
    birthdate: "1989-11-02",
  },
  // B4 invites this user on camera. It must NOT be a workspace member and must
  // have no pending invite — searchByEmailOrUsername filters both out, so an
  // existing member is invisible in the invite modal and the beat cannot be shot.
  invitee: {
    email: need("DEMO_INVITEE_EMAIL"),
    username: need("DEMO_INVITEE_USERNAME"),
    password: need("DEMO_INVITEE_PASSWORD"),
    firstname: demoEnv.DEMO_INVITEE_FIRSTNAME ?? "Priya",
    lastname: demoEnv.DEMO_INVITEE_LASTNAME ?? "Nandakumar",
    birthdate: "1995-06-23",
  },
};

const BOARD_NAME = "Sprint 14";
const ROOM_NAME = "design-sync";

const COLUMNS = [
  { name: "Backlog", type: "UPCOMING", color: "var(--label-blue)" },
  { name: "In Progress", type: "ONGOING", color: "var(--label-orange)" },
  { name: "In Review", type: "UPCOMING", color: "var(--label-purple)" },
  { name: "Done", type: "COMPLETE", color: "var(--label-green)" },
];

const POSITION_GAP = 1000;

/* ── time helpers — everything is relative to the seed run ──────────────── */

const ago = (days, hours = 0) => new Date(NOW - days * 864e5 - hours * 36e5);
const ahead = (days, hours = 0) => new Date(NOW + days * 864e5 + hours * 36e5);

/** Deterministic PRNG so re-seeding produces an identical fixture. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const BACKLOG_TASKS = [
  { title: "Split the workspace bundle by route", priority: "LOW", assignee: null },
  { title: "Audit focus rings on the invite modal", priority: "MEDIUM", assignee: "member", labels: ["a11y"] },
  { title: "Retry policy for the presence socket", priority: "HIGH", assignee: null },
  { title: "Drop the legacy avatar upload path", priority: "LOW", assignee: "owner" },
  { title: "Postgres index on chat_messages.room_id", priority: "MEDIUM", assignee: "member" },
  { title: "Document the module reorder contract", priority: "NONE", assignee: null },
];

const IN_PROGRESS_TASKS = [
  // B6 opens this one on camera: MEDIUM and no deadline, so setting Urgent +
  // a date is a visible change rather than a no-op.
  { title: "Fix flaky socket reconnect on tab wake", priority: "MEDIUM", due: null, startedDaysAgo: 2 },
  { title: "Typing indicator debounce is too eager", priority: "HIGH", due: 3, startedDaysAgo: 1, labels: ["chat"] },
  { title: "Board column drag ghost flickers in Safari", priority: "HIGH", due: 4, startedDaysAgo: 3 },
  { title: "Cache workspace members on the socket handshake", priority: "MEDIUM", due: 6, startedDaysAgo: 4 },
  { title: "Velocity chart tooltip clips at the edge", priority: "LOW", due: 8, startedDaysAgo: 2 },
];

const IN_REVIEW_TASKS = [
  { title: "Read receipts batch write", priority: "HIGH", assignee: "owner", startedDaysAgo: 6 },
  { title: "Sidebar project droppable hit area", priority: "MEDIUM", assignee: "owner", startedDaysAgo: 5 },
  { title: "Invite email template dark mode", priority: "LOW", assignee: "member", startedDaysAgo: 7 },
];

const DONE_TITLES = [
  "Wire module reorder to the persistence hook", "Emoji picker keyboard navigation",
  "Workspace slug uniqueness check", "Kanban column colour picker", "Task short-id sequence per workspace",
  "Chat link preview unfurling", "Pinned modules on the home dashboard", "Statistics interval toggle",
  "Deadline picker locale handling", "Mention autocomplete ranking", "Session purge cron",
  "Board socket room join on navigate", "Rich text editor list handling", "Avatar initials fallback",
  "Password strength indicator", "Workspace switcher popover", "Column type COMPLETE semantics",
  "Task label chips overflow", "Message reaction aggregation", "Right sidebar member presence",
  "Signin remember-me persistence", "Email verification resend throttle", "Board empty state illustration",
  "Cycle time excludes sub-5s transitions", "Notification panel empty state", "Chat date separators",
  "Module pin toggle optimistic update", "Project inline rename on create", "Search filters sidebar modules",
  "Task assignee search debounce", "Workspace member role badges", "Archive from COMPLETE columns only",
  "Quick stats two-week window", "Home greeting by time of day", "Redis key prefix isolation",
  "Socket reconnect backoff", "Board column position gaps", "Invite revoke endpoint",
  "Message edit indicator", "Task description autosave",
];

/**
 * Completion schedule, as daysAgo → number of tasks completed that day.
 *
 * Shaped deliberately: the Workspace Velocity area chart is the hero of B5, and
 * a flat 1-per-day series draws as a straight line. The last two weeks build to
 * a peak around day 5 and ease off, which reads as a sprint. The tail thins out
 * to 80 days so 3M and 6M are not a cliff.
 */
const COMPLETIONS_BY_DAY = [
  [14, 1], [12, 2], [11, 1], [10, 2], [9, 1], [8, 2], [7, 2],
  [6, 1], [5, 3], [4, 2], [3, 2], [2, 2], [1, 1],            // 22 in the last 14 days
  [16, 1], [18, 2], [20, 1], [22, 1], [24, 1], [26, 1], [28, 1], [30, 1], // 9 more inside 1M
  [34, 1], [40, 1], [48, 1], [58, 1], [68, 1], [80, 1],       // 6 in the 3M / 6M tail
];

function completionSchedule() {
  const rand = rng(1408);
  const out = [];
  let i = 0;

  for (const [daysAgo, count] of COMPLETIONS_BY_DAY) {
    for (let n = 0; n < count; n++) {
      if (i >= DONE_TITLES.length) break;
      // Cycle time improves over the period: older work took longer. Keeps
      // Avg. Cycle Time a plausible number rather than uniform noise.
      const base = daysAgo > 30 ? 60 : daysAgo > 14 ? 40 : 22;
      const cycleHours = base + Math.floor(rand() * 30);
      const completedAt = ago(daysAgo, Math.floor(rand() * 9) + 9); // during the workday
      out.push({
        title: DONE_TITLES[i++],
        // Owner keeps the majority so personal Velocity and Quick Stats read well.
        assignee: rand() < 0.65 ? "owner" : "member",
        completedAt,
        inProgressAt: new Date(completedAt.getTime() - cycleHours * 36e5),
        daysAgo,
      });
    }
  }

  return out;
}

const CHAT = [
  { from: "member", at: ago(2, 5), text: "Pushed the reconnect fix to the sprint board — NL-7 is in review." },
  { from: "owner", at: ago(2, 4), text: "Nice. I'll pick up the typing indicator debounce after standup." },
  { from: "member", at: ago(1, 7), text: "Design pass on the invite modal is done. Role select finally lines up with the search results." },
  { from: "owner", at: ago(1, 6), text: "Saw it. The pending-invites toggle is much clearer now." },
  { from: "member", at: ago(0, 5), text: "Velocity chart is reading properly for the last two weeks." },
  { from: "owner", at: ago(0, 3), text: "Good — that was the last blocker for the sprint review." },
];

/* ── seed ───────────────────────────────────────────────────────────────── */

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

async function reset() {
  // Workspace delete cascades: members, invites, boards → columns → tasks,
  // modules (→ pins), projects, chat rooms → messages → reactions + receipts.
  const ws = await prisma.workspace.findUnique({ where: { slug: WS.slug }, select: { id: true } });
  if (ws) await prisma.workspace.delete({ where: { id: ws.id } });

  const emails = Object.values(USERS).map((u) => u.email);
  const usernames = Object.values(USERS).map((u) => u.username);

  // Any other workspace still owned by a demo user (e.g. one created by hand
  // during a botched take) goes too, otherwise the user delete fails or leaves
  // orphan fixtures in the sidebar.
  const strays = await prisma.workspace.findMany({
    where: { members: { some: { user: { email: { in: emails } }, role: "OWNER" } } },
    select: { id: true },
  });
  if (strays.length) {
    await prisma.workspace.deleteMany({ where: { id: { in: strays.map((w) => w.id) } } });
  }

  await prisma.emailVerification.deleteMany({ where: { email: { in: emails } } });
  await prisma.passwordReset.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({
    where: { OR: [{ email: { in: emails } }, { username: { in: usernames } }] },
  });
}

async function createUser(spec) {
  const user = await prisma.user.create({
    data: {
      email: spec.email,
      username: spec.username,
      firstname: spec.firstname,
      lastname: spec.lastname,
      birthdate: new Date(`${spec.birthdate}T00:00:00.000Z`),
      password_hash: await bcrypt.hash(spec.password, 10),
      email_verified_at: ago(30),
      last_password_change: ago(30),
      created_at: ago(30),
    },
  });

  // signin() rejects when a verification row exists in a non-verified state.
  await prisma.emailVerification.create({
    data: {
      email: spec.email,
      user_id: user.id,
      token_hash: `demo-seed:${user.id}`,
      status: "verified",
      created_at: ago(30),
      verified_at: ago(30),
    },
  });

  return user;
}

async function seed() {
  await reset();

  const owner = await createUser(USERS.owner);
  const member = await createUser(USERS.member);
  const invitee = await createUser(USERS.invitee);
  const byRole = { owner, member };

  const workspace = await prisma.workspace.create({
    data: {
      name: WS.name,
      slug: WS.slug,
      workspaceKey: WS.key,
      created_at: ago(30),
      members: {
        create: [
          { user_id: owner.id, role: "OWNER", joined_at: ago(30) },
          { user_id: member.id, role: "MEMBER", joined_at: ago(28) },
        ],
      },
    },
  });

  const board = await prisma.board.create({
    data: {
      workspace_id: workspace.id,
      name: BOARD_NAME,
      created_by: owner.id,
      created_at: ago(21),
    },
  });

  const columns = {};
  for (const [i, col] of COLUMNS.entries()) {
    columns[col.name] = await prisma.boardColumn.create({
      data: {
        board_id: board.id,
        name: col.name,
        type: col.type,
        color: col.color,
        position: (i + 1) * POSITION_GAP,
        created_at: ago(21),
      },
    });
  }

  const room = await prisma.chatRoom.create({
    data: { workspace_id: workspace.id, name: ROOM_NAME, created_at: ago(18) },
  });

  // Both modules start in Shared with no project — B8 creates "Q3 Launch" and
  // drags them in on camera.
  const boardModule = await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      type: "BOARD",
      reference_id: board.id,
      name: BOARD_NAME,
      position: POSITION_GAP,
      created_at: ago(21),
    },
  });
  const chatModule = await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      type: "CHAT",
      reference_id: room.id,
      name: ROOM_NAME,
      position: POSITION_GAP * 2,
      created_at: ago(18),
    },
  });

  // B9 shows both in the Pinned Modules grid; pinning is never shown on camera.
  await prisma.userPinnedModule.createMany({
    data: [
      { user_id: owner.id, module_id: boardModule.id },
      { user_id: owner.id, module_id: chatModule.id },
    ],
  });

  /* tasks */

  let seq = 0;
  const nextShortId = () => `${WS.key}-${++seq}`;

  const mkTask = (columnId, position, spec) =>
    prisma.task.create({
      data: {
        column_id: columnId,
        shortId: nextShortId(),
        title: spec.title,
        priority: spec.priority ?? "NONE",
        labels: spec.labels ?? [],
        assignee_id: spec.assigneeId ?? null,
        due_date: spec.dueDate ?? null,
        position,
        is_archived: spec.archived ?? false,
        in_progress_at: spec.inProgressAt ?? null,
        completed_at: spec.completedAt ?? null,
        created_by: owner.id,
        created_at: spec.createdAt ?? ago(20),
      },
    });

  for (const [i, t] of BACKLOG_TASKS.entries()) {
    await mkTask(columns.Backlog.id, (i + 1) * POSITION_GAP, {
      title: t.title,
      priority: t.priority,
      labels: t.labels,
      assigneeId: t.assignee ? byRole[t.assignee].id : null,
    });
  }

  // All In Progress work is the owner's — Active Workload and the Home
  // "In Progress" tile both count assignee = the recording user in ONGOING columns.
  for (const [i, t] of IN_PROGRESS_TASKS.entries()) {
    await mkTask(columns["In Progress"].id, (i + 1) * POSITION_GAP, {
      title: t.title,
      priority: t.priority,
      labels: t.labels,
      assigneeId: owner.id,
      dueDate: t.due ? ahead(t.due) : null,
      inProgressAt: ago(t.startedDaysAgo),
      createdAt: ago(t.startedDaysAgo + 3),
    });
  }

  for (const [i, t] of IN_REVIEW_TASKS.entries()) {
    await mkTask(columns["In Review"].id, (i + 1) * POSITION_GAP, {
      title: t.title,
      priority: t.priority,
      assigneeId: byRole[t.assignee].id,
      inProgressAt: ago(t.startedDaysAgo),
      createdAt: ago(t.startedDaysAgo + 4),
    });
  }

  // Newest 6 completions stay visible in the Done column; the rest are archived.
  // getBoard filters is_archived, the statistics queries do not — so the chart
  // and the StatCards see the full history while the board stays readable.
  const schedule = completionSchedule();
  schedule.sort((a, b) => a.daysAgo - b.daysAgo);

  for (const [i, t] of schedule.entries()) {
    await mkTask(columns.Done.id, (schedule.length - i) * POSITION_GAP, {
      title: t.title,
      priority: ["LOW", "MEDIUM", "HIGH"][i % 3],
      assigneeId: byRole[t.assignee].id,
      inProgressAt: t.inProgressAt,
      completedAt: t.completedAt,
      createdAt: new Date(t.inProgressAt.getTime() - 2 * 864e5),
      archived: i >= 6,
    });
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { taskSequenceCounter: seq },
  });

  /* chat history */

  let lastMessage = null;
  const messages = [];
  for (const m of CHAT) {
    lastMessage = await prisma.chatMessage.create({
      data: {
        workspace_id: workspace.id,
        room_id: room.id,
        sender_id: byRole[m.from].id,
        content: m.text,
        created_at: m.at,
      },
    });
    messages.push(lastMessage);
  }

  // One historical reaction so ReactionIndicator is not a first-time render on
  // camera. Kept off the newest message — B7 reacts to that one live, and
  // message_id + user_id is unique.
  await prisma.messageReaction.create({
    data: { message_id: messages[2].id, user_id: owner.id, emoji: "🔥", created_at: ago(1, 5) },
  });

  await prisma.chatReadReceipt.createMany({
    data: [
      { room_id: room.id, user_id: owner.id, message_id: lastMessage.id, last_read_at: ago(0, 2) },
      { room_id: room.id, user_id: member.id, message_id: lastMessage.id, last_read_at: ago(0, 2) },
    ],
  });

  return { workspace, owner, member, invitee, board, room, taskCount: seq };
}

/* ── cache invalidation ─────────────────────────────────────────────────── */

async function clearCache({ workspace, owner, member, invitee }) {
  const host = backendEnv.REDIS_HOST ?? "localhost";
  const port = Number(backendEnv.REDIS_PORT ?? 6379);
  const prefix = backendEnv.REDIS_KEY_PREFIX ?? "";

  const redis = new Redis({
    host,
    port,
    password: backendEnv.REDIS_PASS || undefined,
    lazyConnect: true,
    retryStrategy: () => null,
    maxRetriesPerRequest: 1,
  });

  try {
    await redis.connect();
  } catch {
    console.warn("  ! redis unreachable — skipped cache invalidation");
    return;
  }

  // Only keys whose names are stable across a reseed can go stale; UUID-keyed
  // entries from the deleted fixture are unreachable. Deleted by exact name,
  // never a pattern scan or FLUSHDB.
  const keys = [`workspace:slug:${WS.slug}`, `workspace:${workspace.id}`];
  for (const u of [owner, member, invitee]) {
    keys.push(
      `user:${u.id}`,
      `user:${u.id}:workspaces`,
      `user:identifier:${u.email.toLowerCase()}`,
      `user:identifier:${u.username.toLowerCase()}`,
      `verification:${u.email.toLowerCase()}`,
      `workspace:${workspace.id}:member:${u.id}`,
    );
  }

  await redis.del(...keys.map((k) => prefix + k));
  await redis.quit();
}

/* ── verification: the panels the video shows must not be empty ─────────── */

/** Mirrors WorkspaceService.getStatistics exactly. */
async function statistics(workspaceId, userId, days) {
  const startDate = new Date(Date.now() - days * 864e5);

  const personalWorkload = await prisma.task.count({
    where: {
      assignee_id: userId,
      is_deleted: false,
      column: { type: "ONGOING", board: { workspace_id: workspaceId } },
    },
  });

  const personalVelocity = await prisma.task.count({
    where: {
      assignee_id: userId,
      is_deleted: false,
      completed_at: { gte: startDate },
      column: { board: { workspace_id: workspaceId } },
    },
  });

  const cycle = await prisma.$queryRaw`
    SELECT AVG(EXTRACT(EPOCH FROM (t.completed_at - t.in_progress_at))) as avg_seconds
    FROM tasks t
    JOIN board_columns bc ON t.column_id = bc.id
    JOIN boards b ON bc.board_id = b.id
    WHERE b.workspace_id = ${workspaceId}::uuid
      AND t.assignee_id = ${userId}::uuid
      AND t.is_deleted = false
      AND t.completed_at IS NOT NULL
      AND t.in_progress_at IS NOT NULL
      AND t.completed_at >= ${startDate}
      AND EXTRACT(EPOCH FROM (t.completed_at - t.in_progress_at)) >= 5`;

  const timeline = await prisma.$queryRaw`
    SELECT DATE(t.completed_at)::text as date, COUNT(*)::int as count
    FROM tasks t
    JOIN board_columns bc ON t.column_id = bc.id
    JOIN boards b ON bc.board_id = b.id
    WHERE b.workspace_id = ${workspaceId}::uuid
      AND t.is_deleted = false
      AND t.completed_at IS NOT NULL
      AND t.completed_at >= ${startDate}
    GROUP BY DATE(t.completed_at)
    ORDER BY date ASC`;

  return {
    personalWorkload,
    personalVelocity,
    personalCycleTime: cycle[0]?.avg_seconds ? Number(cycle[0].avg_seconds) : null,
    timelinePoints: timeline.length,
  };
}

async function verify({ workspace, owner, member, invitee, board, room }) {
  const failures = [];
  const check = (ok, label, detail) => {
    console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
    if (!ok) failures.push(label);
  };

  console.log("\n  Statistics · 1M (B5 lands here)");
  const m1 = await statistics(workspace.id, owner.id, 30);
  check(m1.personalWorkload > 0, "Active Workload", `${m1.personalWorkload} tasks`);
  check(m1.personalVelocity > 0, "Velocity", `${m1.personalVelocity} completed`);
  check(m1.personalCycleTime !== null, "Avg. Cycle Time", m1.personalCycleTime ? `${(m1.personalCycleTime / 3600).toFixed(1)}h` : "null");
  check(m1.timelinePoints >= 8, "Workspace Velocity chart", `${m1.timelinePoints} dated points`);

  console.log("\n  Statistics · 3M (B5 clicks here)");
  const m3 = await statistics(workspace.id, owner.id, 90);
  check(m3.timelinePoints > m1.timelinePoints, "chart extends past 1M", `${m3.timelinePoints} points`);

  console.log("\n  Home Quick Stats · 2w window (B9)");
  const w2 = await statistics(workspace.id, owner.id, 14);
  check(w2.personalWorkload > 0, "In Progress", `${w2.personalWorkload}`);
  check(w2.personalVelocity > 0, "Completed", `${w2.personalVelocity}`);
  check(w2.personalWorkload + w2.personalVelocity > 0, "Total Tasks", `${w2.personalWorkload + w2.personalVelocity}`);

  console.log("\n  Invite flow (B4)");
  // searchByEmailOrUsername with a workspaceId excludes members and pending invitees.
  const visible = await prisma.user.findMany({
    where: {
      OR: [{ email: { contains: invitee.username } }, { username: { contains: invitee.username } }],
      NOT: {
        OR: [
          { ws_memberships: { some: { workspace_id: workspace.id } } },
          { ws_received_invites: { some: { workspace_id: workspace.id, status: "pending" } } },
        ],
      },
    },
    select: { id: true },
    take: 5,
  });
  check(visible.some((u) => u.id === invitee.id), "invitee is searchable", `"${invitee.username}"`);

  const memberVisible = await prisma.user.findMany({
    where: {
      OR: [{ email: { contains: member.username } }, { username: { contains: member.username } }],
      NOT: { OR: [{ ws_memberships: { some: { workspace_id: workspace.id } } }] },
    },
    select: { id: true },
  });
  check(memberVisible.length === 0, "member is correctly hidden from invite search");

  console.log("\n  Board (B6)");
  const visibleCols = await prisma.boardColumn.findMany({
    where: { board_id: board.id },
    orderBy: { position: "asc" },
    include: { _count: { select: { tasks: { where: { is_deleted: false, is_archived: false } } } } },
  });
  check(visibleCols.length === 4, "4 columns", visibleCols.map((c) => `${c.name}(${c._count.tasks})`).join(" "));
  check(visibleCols.every((c) => c._count.tasks > 0), "no empty column on the wide shot");
  const editTarget = await prisma.task.findFirst({
    where: { column_id: visibleCols[1].id, priority: "MEDIUM", due_date: null },
    select: { shortId: true, title: true },
  });
  check(!!editTarget, "an In Progress card with no deadline to edit on camera", editTarget ? `${editTarget.shortId} ${editTarget.title}` : "");

  console.log("\n  Chat (B7)");
  const msgCount = await prisma.chatMessage.count({ where: { room_id: room.id } });
  check(msgCount > 0, "room opens with history", `${msgCount} messages`);
  const newest = await prisma.chatMessage.findFirst({
    where: { room_id: room.id },
    orderBy: { created_at: "desc" },
    include: { _count: { select: { reactions: true } } },
  });
  check(newest._count.reactions === 0, "newest message has no reaction yet (B7 adds it live)");

  console.log("\n  Sidebar (B8)");
  const shared = await prisma.workspaceModule.count({ where: { workspace_id: workspace.id, project_id: null } });
  const projects = await prisma.workspaceProject.count({ where: { workspace_id: workspace.id } });
  check(shared === 2, "2 modules in Shared", `${shared}`);
  check(projects === 0, "no projects yet (B8 creates Q3 Launch on camera)");
  const pinned = await prisma.userPinnedModule.count({ where: { user_id: owner.id } });
  check(pinned === 2, "2 pinned modules for the Home grid", `${pinned}`);

  return failures;
}

/* ── main ───────────────────────────────────────────────────────────────── */

async function main() {
  console.log(`\n  crwsync demo seed`);
  console.log(`  target   ${target.database} @ ${target.host}`);
  console.log(`  run at   ${new Date(NOW).toISOString()}  (all fixture dates are relative to this)\n`);

  const result = await seed();

  console.log(`  workspace  ${WS.name}  /${WS.slug}  key ${WS.key}`);
  console.log(`  owner      ${result.owner.username}  <${result.owner.email}>`);
  console.log(`  member     ${result.member.username}  <${result.member.email}>`);
  console.log(`  invitee    ${result.invitee.username}  <${result.invitee.email}>   (not a member — B4 invites them)`);
  console.log(`  board      ${BOARD_NAME}   room  ${ROOM_NAME}   tasks  ${result.taskCount}`);

  await clearCache(result);

  const failures = await verify(result);

  if (failures.length) {
    console.error(`\n  ${failures.length} check(s) failed:\n    - ${failures.join("\n    - ")}\n`);
    process.exitCode = 1;
  } else {
    console.log(`\n  All checks passed. Ready to record.\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
