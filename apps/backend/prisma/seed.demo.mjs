/**
 * Comprehensive Demo & Seed Script for crwsync.
 *
 *   pnpm demo:seed  (or pnpm seed)
 *
 * Populates a fresh workspace with realistic team members, avatars,
 * multiple projects with colors, colored workspace modules, boards with diverse
 * task properties, checklists, comments with mentions, real file attachments,
 * activity logs, public chatrooms, direct messages (DMs), file/document vaults
 * with actual uploaded documents, pinned modules, notifications, and analytics.
 *
 * Idempotent: drops and rebuilds the demo workspace and demo users safely.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import bcrypt from "bcrypt";
import Redis from "ioredis";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = existsSync(resolve(SCRIPT_DIR, "../../..", "package.json"))
  ? resolve(SCRIPT_DIR, "../../..")
  : resolve(SCRIPT_DIR, "..");
const SEED_ASSETS = existsSync(resolve(SCRIPT_DIR, "seed-assets"))
  ? resolve(SCRIPT_DIR, "seed-assets")
  : resolve(REPO_ROOT, "apps/backend/prisma/seed-assets");
const DOCS_DIR = resolve(SEED_ASSETS, "documents");
const AVATARS_DIR = resolve(SEED_ASSETS, "avatars");
const ASSETS_DIR = SEED_ASSETS;
const NOW = Date.now();

/* ── env & configuration ─────────────────────────────────────────────────── */

const REMOTE = process.env.SEED_ALLOW_REMOTE === "1";

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const backendEnv = {
  ...parseEnvFile(resolve(REPO_ROOT, "apps/backend/.env")),
  ...parseEnvFile(resolve(REPO_ROOT, ".env")),
};
const demoEnvPath = resolve(REPO_ROOT, ".env.demo");
const demoEnv = parseEnvFile(demoEnvPath);

const DEFAULT_PASSWORD = "Password123!";

function getCred(key, fallback) {
  return demoEnv[key] ?? process.env[key] ?? fallback;
}

const DATABASE_URL = backendEnv.DATABASE_URL ?? process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("\n  No DATABASE_URL in apps/backend/.env or process.env\n");
  process.exit(1);
}

/* ── safety rail: local demo database check ────────────────────────────── */

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

  if (!LOCAL_HOSTS.has(host) && !REMOTE) {
    console.error(
      `\n  Refusing to seed: DATABASE_URL points at "${host}", not a local host.\n` +
        `  Set SEED_ALLOW_REMOTE=1 to seed a remote database deliberately.\n`,
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !REMOTE) {
    console.error("\n  Refusing to seed: NODE_ENV=production. Set SEED_ALLOW_REMOTE=1 to override.\n");
    process.exit(1);
  }

  return { host, database };
}

assertLocalDatabase(DATABASE_URL);

/* ── storage client & helpers ────────────────────────────────────────────── */

const STORAGE_ENDPOINT = backendEnv.STORAGE_ENDPOINT ?? process.env.STORAGE_ENDPOINT ?? "http://localhost:9000";
const STORAGE_BUCKET = backendEnv.STORAGE_BUCKET ?? process.env.STORAGE_BUCKET ?? "crwsync";
const STORAGE_ACCESS_KEY = backendEnv.STORAGE_ACCESS_KEY ?? process.env.STORAGE_ACCESS_KEY ?? "minioadmin";
const STORAGE_SECRET_KEY = backendEnv.STORAGE_SECRET_KEY ?? process.env.STORAGE_SECRET_KEY ?? "minioadmin";
const STORAGE_REGION = backendEnv.STORAGE_REGION ?? process.env.STORAGE_REGION ?? "us-east-1";

const s3 = new S3Client({
  endpoint: STORAGE_ENDPOINT,
  region: STORAGE_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  },
});

let storageAvailable = false;

async function initStorage() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: STORAGE_BUCKET }));
    storageAvailable = true;
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: STORAGE_BUCKET }));
      storageAvailable = true;
      console.log(`  Created storage bucket "${STORAGE_BUCKET}" in MinIO/S3`);
    } catch (err) {
      console.warn(`  ! MinIO/S3 unreachable (${err.message}). Seed will continue with fallback records.`);
    }
  }
}

async function uploadToStorage(key, buffer, contentType) {
  if (!storageAvailable) return false;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return true;
  } catch (err) {
    console.warn(`  ! Failed to upload ${key} to storage: ${err.message}`);
    return false;
  }
}

/* ── fixtures ────────────────────────────────────────────────────────────── */

const WS = {
  name: "Northstar Labs",
  slug: "northstar",
  key: "NL",
};

const USERS = {
  owner: {
    email: getCred("DEMO_OWNER_EMAIL", "mara@northstar.test"),
    username: getCred("DEMO_OWNER_USERNAME", "mara"),
    password: getCred("DEMO_OWNER_PASSWORD", DEFAULT_PASSWORD),
    firstname: getCred("DEMO_OWNER_FIRSTNAME", "Mara"),
    lastname: getCred("DEMO_OWNER_LASTNAME", "Ellis"),
    birthdate: "1992-04-17",
    status: "ONLINE",
    role: "OWNER",
    avatarFile: "mara.jpg",
  },
  member: {
    email: getCred("DEMO_MEMBER_EMAIL", "tobias@northstar.test"),
    username: getCred("DEMO_MEMBER_USERNAME", "tobias"),
    password: getCred("DEMO_MEMBER_PASSWORD", DEFAULT_PASSWORD),
    firstname: getCred("DEMO_MEMBER_FIRSTNAME", "Tobias"),
    lastname: getCred("DEMO_MEMBER_LASTNAME", "Reyes"),
    birthdate: "1989-11-02",
    status: "BUSY",
    role: "ADMIN",
    avatarFile: "tobias.jpg",
  },
  designer: {
    email: getCred("DEMO_DESIGNER_EMAIL", "elena@northstar.test"),
    username: getCred("DEMO_DESIGNER_USERNAME", "elena"),
    password: getCred("DEMO_DESIGNER_PASSWORD", DEFAULT_PASSWORD),
    firstname: getCred("DEMO_DESIGNER_FIRSTNAME", "Elena"),
    lastname: getCred("DEMO_DESIGNER_LASTNAME", "Rostova"),
    birthdate: "1994-08-14",
    status: "ONLINE",
    role: "MEMBER",
    avatarFile: "elena.jpg",
  },
  backendDev: {
    email: getCred("DEMO_BACKEND_EMAIL", "devon@northstar.test"),
    username: getCred("DEMO_BACKEND_USERNAME", "devon"),
    password: getCred("DEMO_BACKEND_PASSWORD", DEFAULT_PASSWORD),
    firstname: getCred("DEMO_BACKEND_FIRSTNAME", "Devon"),
    lastname: getCred("DEMO_BACKEND_LASTNAME", "Vance"),
    birthdate: "1991-03-22",
    status: "AWAY",
    role: "MEMBER",
    avatarFile: "devon.jpg",
  },
  qaLead: {
    email: getCred("DEMO_QA_EMAIL", "marcus@northstar.test"),
    username: getCred("DEMO_QA_USERNAME", "marcus"),
    password: getCred("DEMO_QA_PASSWORD", DEFAULT_PASSWORD),
    firstname: getCred("DEMO_QA_FIRSTNAME", "Marcus"),
    lastname: getCred("DEMO_QA_LASTNAME", "Thorne"),
    birthdate: "1988-12-05",
    status: "ONLINE",
    role: "MEMBER",
    avatarFile: "marcus.jpg",
  },
  guest: {
    email: getCred("DEMO_GUEST_EMAIL", "kai@northstar.test"),
    username: getCred("DEMO_GUEST_USERNAME", "kai"),
    password: getCred("DEMO_GUEST_PASSWORD", DEFAULT_PASSWORD),
    firstname: getCred("DEMO_GUEST_FIRSTNAME", "Kai"),
    lastname: getCred("DEMO_GUEST_LASTNAME", "Chen"),
    birthdate: "1996-09-18",
    status: "AWAY",
    role: "GUEST",
    avatarFile: "kai.jpg",
  },
  invitee: {
    email: getCred("DEMO_INVITEE_EMAIL", "priya@northstar.test"),
    username: getCred("DEMO_INVITEE_USERNAME", "priya"),
    password: getCred("DEMO_INVITEE_PASSWORD", DEFAULT_PASSWORD),
    firstname: getCred("DEMO_INVITEE_FIRSTNAME", "Priya"),
    lastname: getCred("DEMO_INVITEE_LASTNAME", "Nandakumar"),
    birthdate: "1995-06-23",
    status: "ONLINE",
    role: null,
    avatarFile: "priya.jpg",
  },
};

const POSITION_GAP = 1000;

/* ── time helpers ────────────────────────────────────────────────────────── */

const ago = (days, hours = 0) => new Date(NOW - days * 864e5 - hours * 36e5);
const ahead = (days, hours = 0) => new Date(NOW + days * 864e5 + hours * 36e5);

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── board & task fixtures ──────────────────────────────────────────────── */

const BOARD_NAME = "Sprint 14";
const ROADMAP_BOARD_NAME = "Roadmap & Strategy";

const COLUMNS = [
  { name: "Backlog", type: "UPCOMING", color: "var(--label-blue)" },
  { name: "In Progress", type: "ONGOING", color: "var(--label-orange)" },
  { name: "In Review", type: "UPCOMING", color: "var(--label-purple)" },
  { name: "Done", type: "COMPLETE", color: "var(--label-green)" },
];

const BACKLOG_TASKS = [
  {
    title: "Split the workspace bundle by route",
    priority: "LOW",
    assignee: null,
    labels: ["perf", "frontend"],
    tags: ["turbopack"],
    description: "Analyze chunk sizes in apps/frontend/dash and configure dynamic route splits for heavy modules.",
    checklists: [
      { text: "Measure baseline bundle analyzer output", done: true },
      { text: "Dynamic import for Recharts and Tiptap", done: false },
      { text: "Verify chunk cache hit ratios", done: false },
    ],
  },
  {
    title: "Audit focus rings on the invite modal",
    priority: "MEDIUM",
    assignee: "member",
    labels: ["a11y", "ui"],
    tags: ["wcag-aa"],
    description: "Ensure keyboard tab navigation stays visible across dark and light modes.",
    checklists: [
      { text: "Test with screen reader (NVDA/VoiceOver)", done: true },
      { text: "Fix offset ring color tokens", done: true },
    ],
  },
  {
    title: "Retry policy for presence socket",
    priority: "HIGH",
    assignee: "backendDev",
    labels: ["infra", "realtime"],
    tags: ["socketio"],
    description: "Implement exponential backoff and jitter for the Redis presence heartbeat reconnect sequence.",
  },
  {
    title: "Drop legacy avatar upload path",
    priority: "LOW",
    assignee: "owner",
    labels: ["cleanup"],
    description: "Remove deprecated multipart avatar controller in favor of presigned S3 URLs.",
  },
  {
    title: "Postgres index on chat_messages.room_id",
    priority: "MEDIUM",
    assignee: "backendDev",
    labels: ["database", "perf"],
    tags: ["prisma"],
    description: "Add compound index on (room_id, created_at DESC) to speed up message pagination.",
  },
  {
    title: "Document module reorder contract",
    priority: "NONE",
    assignee: "designer",
    labels: ["docs"],
    description: "Write specification for workspace module drag-and-drop hierarchy and persistence.",
  },
];

const IN_PROGRESS_TASKS = [
  {
    title: "Fix flaky socket reconnect on tab wake",
    priority: "MEDIUM",
    due: null,
    startedDaysAgo: 2,
    assignee: "owner",
    labels: ["bug", "realtime"],
    tags: ["p1"],
    description: "When a laptop wakes from sleep, the socket connection times out before the transport reconnects.",
    checklists: [
      { text: "Reproduce sleep/wake disconnect in staging", done: true },
      { text: "Add visibilitychange listener on document", done: true },
      { text: "Verify reconnection handshake headers", done: false },
      { text: "Add automated socket reconnect test", done: false },
    ],
    comments: [
      { author: "member", text: "I noticed this on Chrome MacOS after 15+ minutes idle. Transport stays in CLOSED state.", daysAgo: 1, mentions: ["owner"] },
      { author: "owner", text: "Patch is ready in branch `fix/socket-wake` — testing with 500 active simulated connections now.", daysAgo: 0, mentions: ["member"] },
    ],
    attachments: [
      { file: "socket-trace-log.txt", name: "socket-trace-log.txt", mime: "text/plain" },
    ],
  },
  {
    title: "Typing indicator debounce is too eager",
    priority: "HIGH",
    due: 3,
    startedDaysAgo: 1,
    assignee: "owner",
    labels: ["chat", "ux"],
    tags: ["polish"],
    description: "The 300ms debounce cancels typing indicators mid-sentence during slow keystrokes.",
    checklists: [
      { text: "Extend idle timeout to 2500ms", done: true },
      { text: "Add leading throttle on keydown", done: true },
      { text: "Add smooth fade-out CSS transition", done: false },
    ],
    comments: [
      { author: "designer", text: "@mara Could we add a 150ms ease-out so the bubble doesn't abruptly vanish?", daysAgo: 1, mentions: ["owner"] },
    ],
  },
  {
    title: "Board column drag ghost flickers in Safari",
    priority: "HIGH",
    due: 4,
    startedDaysAgo: 3,
    assignee: "owner",
    labels: ["frontend", "bug"],
    description: "Webkit hardware acceleration causes compositing artifact when dragging columns across overflow boundaries.",
  },
  {
    title: "Cache workspace members on socket handshake",
    priority: "MEDIUM",
    due: 6,
    startedDaysAgo: 4,
    assignee: "owner",
    labels: ["backend", "perf"],
    tags: ["redis"],
    description: "Pre-warm member roles and permissions in Redis on initial handshake to avoid per-event DB queries.",
  },
  {
    title: "Velocity chart tooltip clips at edge",
    priority: "LOW",
    due: 8,
    startedDaysAgo: 2,
    assignee: "owner",
    labels: ["ui", "chart"],
    tags: ["recharts"],
    description: "Recharts portal boundary container needs coordinate clamping when cursor is near right edge.",
  },
];

const IN_REVIEW_TASKS = [
  {
    title: "Read receipts batch write",
    priority: "HIGH",
    assignee: "owner",
    startedDaysAgo: 6,
    labels: ["backend", "chat"],
    description: "Batch markAsRead updates in Redis stream before flushing to PostgreSQL every 2 seconds.",
    comments: [
      { author: "backendDev", text: "LGTM! Load test showed 85% drop in write queries under 1000 msgs/min.", daysAgo: 1, mentions: ["owner"] },
      { author: "qaLead", text: "Passed full regression suite on staging cluster.", daysAgo: 0, mentions: ["owner"] },
    ],
    checklists: [
      { text: "Redis pipeline implementation", done: true },
      { text: "Scheduled flush cron with distributed lock", done: true },
      { text: "Unit and load test coverage", done: true },
    ],
  },
  {
    title: "Sidebar project droppable hit area",
    priority: "MEDIUM",
    assignee: "owner",
    startedDaysAgo: 5,
    labels: ["frontend", "ux"],
    description: "Increase vertical padding on closed project folders when dragging active modules.",
  },
  {
    title: "Invite email template dark mode",
    priority: "LOW",
    assignee: "member",
    startedDaysAgo: 7,
    labels: ["email", "design"],
    description: "Add prefers-color-scheme media queries to Handlebars HTML email templates.",
  },
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

const COMPLETIONS_BY_DAY = [
  [14, 1], [12, 2], [11, 1], [10, 2], [9, 1], [8, 2], [7, 2],
  [6, 1], [5, 3], [4, 2], [3, 2], [2, 2], [1, 1],
  [16, 1], [18, 2], [20, 1], [22, 1], [24, 1], [26, 1], [28, 1], [30, 1],
  [34, 1], [40, 1], [48, 1], [58, 1], [68, 1], [80, 1],
];

function completionSchedule() {
  const rand = rng(1408);
  const out = [];
  let i = 0;

  for (const [daysAgo, count] of COMPLETIONS_BY_DAY) {
    for (let n = 0; n < count; n++) {
      if (i >= DONE_TITLES.length) break;
      const base = daysAgo > 30 ? 60 : daysAgo > 14 ? 40 : 22;
      const cycleHours = base + Math.floor(rand() * 30);
      const completedAt = ago(daysAgo, Math.floor(rand() * 9) + 9);
      out.push({
        title: DONE_TITLES[i++],
        assignee: rand() < 0.65 ? "owner" : "member",
        completedAt,
        inProgressAt: new Date(completedAt.getTime() - cycleHours * 36e5),
        daysAgo,
      });
    }
  }

  return out;
}

/* ── chat history fixtures ──────────────────────────────────────────────── */

const GENERAL_CHAT = [
  { from: "owner", at: ago(3, 8), text: "Welcome everyone to Northstar Labs! Excited to kick off Sprint 14." },
  { from: "designer", at: ago(3, 7), text: "Updated Figma tokens and brand guidelines are in the Brand Assets file room :sparkles:" },
  { from: "backendDev", at: ago(2, 6), text: "Deployed Redis cluster upgrades to staging — latency down to sub-1ms." },
  { from: "qaLead", at: ago(2, 4), text: "Running full end-to-end integration test runs now." },
  { from: "member", at: ago(1, 3), text: "Great progress everyone! Let's keep the momentum going into Friday." },
];

const DESIGN_CHAT = [
  { from: "member", at: ago(2, 5), text: "Pushed the reconnect fix to the sprint board — NL-7 is in review." },
  { from: "owner", at: ago(2, 4), text: "Nice. I'll pick up the typing indicator debounce after standup." },
  { from: "member", at: ago(1, 7), text: "Design pass on the invite modal is done. Role select finally lines up with the search results." },
  { from: "owner", at: ago(1, 6), text: "Saw it. The pending-invites toggle is much clearer now." },
  { from: "member", at: ago(0, 5), text: "Velocity chart is reading properly for the last two weeks." },
  { from: "owner", at: ago(0, 3), text: "Good — that was the last blocker for the sprint review." },
];

const INFRA_CHAT = [
  { from: "backendDev", at: ago(4, 2), text: "PostgreSQL 17 connection pooling tuned with PgBouncer." },
  { from: "qaLead", at: ago(3, 5), text: "Stress tested 2000 simultaneous websocket handshakes — 0 dropped frames." },
  { from: "owner", at: ago(2, 1), text: "Excellent work team. Infrastructure is battle ready." },
];

const DM_MARA_TOBIAS = [
  { from: "owner", at: ago(2, 8), text: "Hey Tobias, do you have a second to review the Redis socket adapter changes?" },
  { from: "member", at: ago(2, 7), text: "Sure thing Mara! Reviewing the PR right now." },
  { from: "member", at: ago(2, 6), text: "Looks super clean. Left two minor comments on the timeout fallback." },
  { from: "owner", at: ago(2, 5), text: "Addressed! Merging into develop." },
];

const DM_MARA_ELENA = [
  { from: "designer", at: ago(1, 4), text: "Mara, I uploaded the new SVG icons and brand guides to the Files module." },
  { from: "owner", at: ago(1, 3), text: "Awesome Elena, checking them out now!" },
];

/* ── files / documents fixtures ─────────────────────────────────────────── */

const FILE_ROOMS = [
  {
    name: "Architecture & RFCs",
    color: "var(--label-purple)",
    files: [
      { name: "rfc-004-realtime-fanout.md", mime: "text/markdown", uploader: "backendDev" },
      { name: "openapi-spec.yaml", mime: "text/yaml", uploader: "owner" },
      { name: "database-schema-erd.md", mime: "text/markdown", uploader: "backendDev" },
    ],
  },
  {
    name: "Brand & UI Assets",
    color: "var(--label-pink)",
    files: [
      { name: "northstar-logo-dark.svg", mime: "image/svg+xml", uploader: "designer" },
      { name: "northstar-logo-light.svg", mime: "image/svg+xml", uploader: "designer" },
      { name: "design-system-tokens.json", mime: "application/json", uploader: "designer" },
      { name: "brand-guidelines.md", mime: "text/markdown", uploader: "designer" },
    ],
  },
  {
    name: "Launch Operations",
    color: "var(--label-yellow)",
    files: [
      { name: "q3-product-launch-playbook.md", mime: "text/markdown", uploader: "owner" },
    ],
  },
];

/* ── database seed runner ───────────────────────────────────────────────── */

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

async function reset() {
  const ws = await prisma.workspace.findUnique({ where: { slug: WS.slug }, select: { id: true } });
  if (ws) await prisma.workspace.delete({ where: { id: ws.id } });

  const emails = Object.values(USERS).map((u) => u.email);
  const usernames = Object.values(USERS).map((u) => u.username);

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
  const passwordHash = await bcrypt.hash(spec.password, 10);
  const user = await prisma.user.create({
    data: {
      email: spec.email,
      username: spec.username,
      firstname: spec.firstname,
      lastname: spec.lastname,
      birthdate: new Date(`${spec.birthdate}T00:00:00.000Z`),
      status_preference: spec.status ?? "ONLINE",
      password_hash: passwordHash,
      email_verified_at: ago(30),
      last_password_change: ago(30),
      created_at: ago(30),
    },
  });

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

  // Avatar upload
  if (spec.avatarFile) {
    const avatarPath = resolve(AVATARS_DIR, spec.avatarFile);
    if (existsSync(avatarPath)) {
      const buf = readFileSync(avatarPath);
      const avatarKey = `${user.id}_avatar.jpg`;
      await uploadToStorage(`avatars/${avatarKey}`, buf, "image/jpeg");
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar_key: avatarKey },
      });
      user.avatar_key = avatarKey;
    }
  }

  return user;
}

async function seed() {
  await initStorage();
  await reset();

  /* 1. Users & Workspace */
  const seededUsers = {};
  for (const [key, spec] of Object.entries(USERS)) {
    seededUsers[key] = await createUser(spec);
  }

  const owner = seededUsers.owner;
  const member = seededUsers.member;
  const designer = seededUsers.designer;
  const backendDev = seededUsers.backendDev;
  const qaLead = seededUsers.qaLead;
  const guest = seededUsers.guest;
  const invitee = seededUsers.invitee;

  const workspaceMembersData = [
    { user_id: owner.id, role: "OWNER", joined_at: ago(30) },
    { user_id: member.id, role: "ADMIN", joined_at: ago(28) },
    { user_id: designer.id, role: "MEMBER", joined_at: ago(25) },
    { user_id: backendDev.id, role: "MEMBER", joined_at: ago(24) },
    { user_id: qaLead.id, role: "MEMBER", joined_at: ago(20) },
    { user_id: guest.id, role: "GUEST", joined_at: ago(15) },
  ];

  const workspace = await prisma.workspace.create({
    data: {
      name: WS.name,
      slug: WS.slug,
      workspaceKey: WS.key,
      created_at: ago(30),
      members: {
        create: workspaceMembersData,
      },
    },
  });

  // Workspace logo upload
  const logoPath = resolve(ASSETS_DIR, "workspace-logo.jpg");
  if (existsSync(logoPath)) {
    const buf = readFileSync(logoPath);
    const logoKey = `${workspace.id}_logo.jpg`;
    await uploadToStorage(`avatars/${logoKey}`, buf, "image/jpeg");
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { logo_key: logoKey },
    });
    workspace.logo_key = logoKey;
  }

  /* 2. Projects with Colors */
  const projectCore = await prisma.workspaceProject.create({
    data: {
      workspace_id: workspace.id,
      name: "Core Platform",
      color: "var(--label-blue)",
      position: POSITION_GAP,
      created_at: ago(25),
    },
  });

  const projectLaunch = await prisma.workspaceProject.create({
    data: {
      workspace_id: workspace.id,
      name: "Q3 Product Launch",
      color: "var(--label-green)",
      position: POSITION_GAP * 2,
      created_at: ago(20),
    },
  });

  /* 3. Boards & Columns */
  const sprintBoard = await prisma.board.create({
    data: {
      workspace_id: workspace.id,
      name: BOARD_NAME,
      description: "Active sprint execution for core platform features and performance optimizations.",
      created_by: owner.id,
      created_at: ago(21),
    },
  });

  const sprintColumns = {};
  for (const [i, col] of COLUMNS.entries()) {
    sprintColumns[col.name] = await prisma.boardColumn.create({
      data: {
        board_id: sprintBoard.id,
        name: col.name,
        type: col.type,
        color: col.color,
        position: (i + 1) * POSITION_GAP,
        created_at: ago(21),
      },
    });
  }

  const roadmapBoard = await prisma.board.create({
    data: {
      workspace_id: workspace.id,
      name: ROADMAP_BOARD_NAME,
      description: "Strategic quarterly backlog and architectural exploration items.",
      created_by: owner.id,
      created_at: ago(25),
    },
  });

  const roadmapColumns = {};
  const ROADMAP_COL_NAMES = ["Future Proposals", "In Discovery", "Prioritized", "Completed"];
  for (const [i, name] of ROADMAP_COL_NAMES.entries()) {
    roadmapColumns[name] = await prisma.boardColumn.create({
      data: {
        board_id: roadmapBoard.id,
        name,
        type: i === 3 ? "COMPLETE" : i === 1 ? "ONGOING" : "UPCOMING",
        position: (i + 1) * POSITION_GAP,
        created_at: ago(25),
      },
    });
  }

  /* 4. Chat Rooms & Direct Messages */
  const roomGeneral = await prisma.chatRoom.create({
    data: { workspace_id: workspace.id, name: "general", created_at: ago(25) },
  });

  const roomDesign = await prisma.chatRoom.create({
    data: { workspace_id: workspace.id, name: "design-sync", created_at: ago(18) },
  });

  const roomInfra = await prisma.chatRoom.create({
    data: { workspace_id: workspace.id, name: "infra-alerts", created_at: ago(20) },
  });

  // Direct Message: Mara ↔ Tobias
  const [dmMaraTobiasA, dmMaraTobiasB] = [owner.id, member.id].sort();
  const dmRoomMaraTobias = await prisma.chatRoom.create({
    data: {
      workspace_id: workspace.id,
      is_direct: true,
      dm_user_a_id: dmMaraTobiasA,
      dm_user_b_id: dmMaraTobiasB,
      created_at: ago(10),
    },
  });

  // Direct Message: Mara ↔ Elena
  const [dmMaraElenaA, dmMaraElenaB] = [owner.id, designer.id].sort();
  const dmRoomMaraElena = await prisma.chatRoom.create({
    data: {
      workspace_id: workspace.id,
      is_direct: true,
      dm_user_a_id: dmMaraElenaA,
      dm_user_b_id: dmMaraElenaB,
      created_at: ago(8),
    },
  });

  /* 5. File Rooms & Actual Documents */
  const createdFileRooms = [];

  for (const roomSpec of FILE_ROOMS) {
    const fileRoom = await prisma.fileRoom.create({
      data: { workspace_id: workspace.id, name: roomSpec.name, created_at: ago(22) },
    });
    createdFileRooms.push({ room: fileRoom, spec: roomSpec });

    for (const f of roomSpec.files) {
      const filePath = resolve(DOCS_DIR, f.name);
      let buffer;
      let size = 1024;
      if (existsSync(filePath)) {
        buffer = readFileSync(filePath);
        size = buffer.length;
      } else {
        buffer = Buffer.from(`# ${f.name}\nGenerated seed document placeholder.`);
        size = buffer.length;
      }

      const fileKey = `${fileRoom.id}_${f.name}`;
      await uploadToStorage(`attachments/${fileKey}`, buffer, f.mime);

      await prisma.workspaceFile.create({
        data: {
          file_room_id: fileRoom.id,
          file_name: f.name,
          file_size: size,
          mime_type: f.mime,
          key: fileKey,
          uploaded_by: seededUsers[f.uploader].id,
          created_at: ago(15),
        },
      });
    }
  }

  const [fileRoomArch, fileRoomBrand, fileRoomLaunch] = createdFileRooms.map((r) => r.room);

  /* 6. Workspace Modules with Colors in Sidebar */
  // Sprint Board in Shared (Blue)
  const sprintBoardModule = await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      type: "BOARD",
      reference_id: sprintBoard.id,
      name: BOARD_NAME,
      color: "var(--label-blue)",
      position: POSITION_GAP,
      created_at: ago(21),
    },
  });

  // Design Sync Chat in Shared (Pink)
  const designChatModule = await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      type: "CHAT",
      reference_id: roomDesign.id,
      name: "design-sync",
      color: "var(--label-pink)",
      position: POSITION_GAP * 2,
      created_at: ago(18),
    },
  });

  // General Chat in Core Platform project (Blue)
  await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      project_id: projectCore.id,
      type: "CHAT",
      reference_id: roomGeneral.id,
      name: "general",
      color: "var(--label-blue)",
      position: POSITION_GAP,
      created_at: ago(20),
    },
  });

  // Infra Alerts Chat in Core Platform project (Orange)
  await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      project_id: projectCore.id,
      type: "CHAT",
      reference_id: roomInfra.id,
      name: "infra-alerts",
      color: "var(--label-orange)",
      position: POSITION_GAP * 2,
      created_at: ago(20),
    },
  });

  // Architecture Files in Core Platform project (Purple)
  await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      project_id: projectCore.id,
      type: "FILES",
      reference_id: fileRoomArch.id,
      name: FILE_ROOMS[0].name,
      color: "var(--label-purple)",
      position: POSITION_GAP * 3,
      created_at: ago(20),
    },
  });

  // Roadmap Board in Q3 Launch project (Green)
  await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      project_id: projectLaunch.id,
      type: "BOARD",
      reference_id: roadmapBoard.id,
      name: ROADMAP_BOARD_NAME,
      color: "var(--label-green)",
      position: POSITION_GAP,
      created_at: ago(19),
    },
  });

  // Brand Files in Q3 Launch project (Pink)
  await prisma.workspaceModule.create({
    data: {
      workspace_id: workspace.id,
      project_id: projectLaunch.id,
      type: "FILES",
      reference_id: fileRoomBrand.id,
      name: FILE_ROOMS[1].name,
      color: "var(--label-pink)",
      position: POSITION_GAP * 2,
      created_at: ago(19),
    },
  });

  // Launch Operations Files in Q3 Launch project (Yellow)
  if (fileRoomLaunch) {
    await prisma.workspaceModule.create({
      data: {
        workspace_id: workspace.id,
        project_id: projectLaunch.id,
        type: "FILES",
        reference_id: fileRoomLaunch.id,
        name: FILE_ROOMS[2].name,
        color: "var(--label-yellow)",
        position: POSITION_GAP * 3,
        created_at: ago(18),
      },
    });
  }

  // Pinned Modules for Owner
  await prisma.userPinnedModule.createMany({
    data: [
      { user_id: owner.id, module_id: sprintBoardModule.id },
      { user_id: owner.id, module_id: designChatModule.id },
    ],
  });

  /* 7. Tasks with Checklists, Comments, Attachments & Activity */
  let seq = 0;
  const nextShortId = () => `${WS.key}-${++seq}`;

  async function createTaskWithDetails(columnId, position, spec) {
    const shortId = nextShortId();
    const task = await prisma.task.create({
      data: {
        column_id: columnId,
        workspace_id: workspace.id,
        shortId,
        title: spec.title,
        description: spec.description ?? null,
        priority: spec.priority ?? "NONE",
        labels: spec.labels ?? [],
        tags: spec.tags ?? [],
        assignee_id: spec.assigneeId ?? null,
        due_date: spec.dueDate ?? null,
        position,
        is_archived: spec.archived ?? false,
        in_progress_at: spec.inProgressAt ?? null,
        completed_at: spec.completedAt ?? null,
        created_by: spec.createdById ?? owner.id,
        created_at: spec.createdAt ?? ago(20),
      },
    });

    if (spec.checklists?.length) {
      for (const [ci, item] of spec.checklists.entries()) {
        await prisma.taskChecklistItem.create({
          data: {
            task_id: task.id,
            content: item.text,
            is_completed: item.done,
            position: (ci + 1) * POSITION_GAP,
            created_by: task.created_by,
            created_at: task.created_at,
          },
        });
      }
    }

    if (spec.comments?.length) {
      for (const comment of spec.comments) {
        const authorId = seededUsers[comment.author]?.id ?? owner.id;
        const mentionUsers = (comment.mentions ?? []).map((m) => seededUsers[m]).filter(Boolean);
        await prisma.taskComment.create({
          data: {
            task_id: task.id,
            workspace_id: workspace.id,
            author_id: authorId,
            content: comment.text,
            created_at: ago(comment.daysAgo ?? 1),
            mentions: mentionUsers.length ? { connect: mentionUsers.map((u) => ({ id: u.id })) } : undefined,
          },
        });
      }
    }

    if (spec.attachments?.length) {
      for (const att of spec.attachments) {
        const attFileName = att.file ?? att.name;
        const attPath = resolve(DOCS_DIR, attFileName);
        let buffer;
        let size = att.size || 1024;
        if (existsSync(attPath)) {
          buffer = readFileSync(attPath);
          size = buffer.length;
        } else {
          buffer = Buffer.from("Sample task attachment trace content.");
          size = buffer.length;
        }

        const attKey = `${task.id}_${att.name}`;
        await uploadToStorage(`attachments/${attKey}`, buffer, att.mime);

        await prisma.taskAttachment.create({
          data: {
            task_id: task.id,
            key: attKey,
            file_name: att.name,
            file_size: size,
            mime_type: att.mime,
            uploaded_by: task.assignee_id ?? owner.id,
            created_at: task.created_at,
          },
        });
      }
    }

    if (spec.activities?.length) {
      for (const act of spec.activities) {
        await prisma.taskActivity.create({
          data: {
            task_id: task.id,
            actor_id: act.actorId ?? owner.id,
            type: act.type,
            metadata: act.metadata ?? {},
            created_at: act.createdAt ?? ago(1),
          },
        });
      }
    }

    return task;
  }

  // Backlog tasks
  for (const [i, t] of BACKLOG_TASKS.entries()) {
    await createTaskWithDetails(sprintColumns.Backlog.id, (i + 1) * POSITION_GAP, {
      ...t,
      assigneeId: t.assignee ? seededUsers[t.assignee].id : null,
    });
  }

  // In Progress tasks
  for (const [i, t] of IN_PROGRESS_TASKS.entries()) {
    await createTaskWithDetails(sprintColumns["In Progress"].id, (i + 1) * POSITION_GAP, {
      ...t,
      assigneeId: seededUsers[t.assignee]?.id ?? owner.id,
      dueDate: t.due ? ahead(t.due) : null,
      inProgressAt: ago(t.startedDaysAgo),
      createdAt: ago(t.startedDaysAgo + 3),
      activities: [
        { type: "COLUMN_MOVED", actorId: owner.id, metadata: { from: "Backlog", to: "In Progress" }, createdAt: ago(t.startedDaysAgo) },
        { type: "PRIORITY_CHANGED", actorId: owner.id, metadata: { from: "NONE", to: t.priority }, createdAt: ago(t.startedDaysAgo + 1) },
      ],
    });
  }

  // In Review tasks
  for (const [i, t] of IN_REVIEW_TASKS.entries()) {
    await createTaskWithDetails(sprintColumns["In Review"].id, (i + 1) * POSITION_GAP, {
      ...t,
      assigneeId: seededUsers[t.assignee]?.id ?? owner.id,
      inProgressAt: ago(t.startedDaysAgo),
      createdAt: ago(t.startedDaysAgo + 4),
      activities: [
        { type: "COLUMN_MOVED", actorId: seededUsers[t.assignee]?.id ?? owner.id, metadata: { from: "In Progress", to: "In Review" }, createdAt: ago(1) },
      ],
    });
  }

  // Done tasks with full completion schedule
  const schedule = completionSchedule();
  schedule.sort((a, b) => a.daysAgo - b.daysAgo);

  for (const [i, t] of schedule.entries()) {
    await createTaskWithDetails(sprintColumns.Done.id, (schedule.length - i) * POSITION_GAP, {
      title: t.title,
      priority: ["LOW", "MEDIUM", "HIGH"][i % 3],
      assigneeId: seededUsers[t.assignee]?.id ?? owner.id,
      inProgressAt: t.inProgressAt,
      completedAt: t.completedAt,
      createdAt: new Date(t.inProgressAt.getTime() - 2 * 864e5),
      archived: i >= 6,
    });
  }

  // Roadmap Board Tasks
  const ROADMAP_TASKS = [
    { col: "Future Proposals", title: "WebAuthn & Passkey passwordless login support", priority: "MEDIUM", assignee: "backendDev" },
    { col: "Future Proposals", title: "Enterprise SAML 2.0 SSO Integration", priority: "LOW", assignee: null },
    { col: "In Discovery", title: "Real-time collaborative canvas & whiteboarding", priority: "HIGH", assignee: "designer" },
    { col: "In Discovery", title: "Automated AI task summarization in chat threads", priority: "MEDIUM", assignee: "owner" },
    { col: "Prioritized", title: "Custom webhook triggers for task status transitions", priority: "HIGH", assignee: "member" },
    { col: "Completed", title: "Granular workspace role permissions system", priority: "URGENT", assignee: "owner", completedAt: ago(5), inProgressAt: ago(10) },
  ];

  for (const [i, rt] of ROADMAP_TASKS.entries()) {
    await createTaskWithDetails(roadmapColumns[rt.col].id, (i + 1) * POSITION_GAP, {
      title: rt.title,
      priority: rt.priority,
      assigneeId: rt.assignee ? seededUsers[rt.assignee].id : null,
      completedAt: rt.completedAt ?? null,
      inProgressAt: rt.inProgressAt ?? null,
    });
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { taskSequenceCounter: seq },
  });

  /* 8. Chat Messages, Reactions & Read Receipts */
  async function seedChatRoom(roomId, messagesList) {
    let lastMsg = null;
    const msgs = [];
    for (const m of messagesList) {
      lastMsg = await prisma.chatMessage.create({
        data: {
          workspace_id: workspace.id,
          room_id: roomId,
          sender_id: seededUsers[m.from].id,
          content: m.text,
          created_at: m.at,
        },
      });
      msgs.push(lastMsg);
    }

    if (msgs.length > 0) {
      await prisma.chatReadReceipt.createMany({
        data: [
          { room_id: roomId, user_id: owner.id, message_id: lastMsg.id, last_read_at: ago(0, 1) },
          { room_id: roomId, user_id: member.id, message_id: lastMsg.id, last_read_at: ago(0, 1) },
        ],
      });
    }

    return msgs;
  }

  await seedChatRoom(roomGeneral.id, GENERAL_CHAT);
  const designMsgs = await seedChatRoom(roomDesign.id, DESIGN_CHAT);
  await seedChatRoom(roomInfra.id, INFRA_CHAT);
  await seedChatRoom(dmRoomMaraTobias.id, DM_MARA_TOBIAS);
  await seedChatRoom(dmRoomMaraElena.id, DM_MARA_ELENA);

  // Reaction on historical message in design chat
  if (designMsgs.length >= 3) {
    await prisma.messageReaction.create({
      data: { message_id: designMsgs[2].id, user_id: owner.id, emoji: "🔥", created_at: ago(1, 5) },
    });
  }

  /* 9. Notifications Feed */
  const actorSelect = { id: true, firstname: true, lastname: true, avatar_key: true };

  const assignedTask = await prisma.task.findFirst({
    where: { workspace_id: workspace.id, title: "Fix flaky socket reconnect on tab wake" },
    select: { id: true, shortId: true, title: true, column: { select: { board_id: true, board: { select: { name: true } } } } },
  });

  const mentionComment = await prisma.taskComment.findFirst({
    where: { task: { workspace_id: workspace.id, title: "Typing indicator debounce is too eager" }, author_id: designer.id },
    include: {
      author: { select: actorSelect },
      task: { select: { id: true, shortId: true, title: true, column: { select: { board_id: true, board: { select: { name: true } } } } } },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        user_id: owner.id,
        workspace_id: workspace.id,
        type: "TASK_ASSIGNED",
        payload: {
          task: { id: assignedTask.id, shortId: assignedTask.shortId, title: assignedTask.title },
          board: { id: assignedTask.column.board_id, name: assignedTask.column.board.name },
          workspace: { slug: workspace.slug, name: workspace.name },
          assignedBy: { id: member.id, firstname: member.firstname, lastname: member.lastname, avatar_key: member.avatar_key },
        },
        is_read: false,
        created_at: ago(0, 4),
      },
      {
        user_id: owner.id,
        workspace_id: workspace.id,
        type: "TASK_COMMENT_MENTION",
        payload: {
          comment: {
            id: mentionComment.id,
            task_id: mentionComment.task_id,
            author_id: mentionComment.author_id,
            content: mentionComment.content,
            is_edited: mentionComment.is_edited,
            is_deleted: mentionComment.is_deleted,
            created_at: mentionComment.created_at,
            updated_at: mentionComment.updated_at,
            author: mentionComment.author,
          },
          task: { id: mentionComment.task.id, shortId: mentionComment.task.shortId, title: mentionComment.task.title },
          board: { id: mentionComment.task.column.board_id, name: mentionComment.task.column.board.name },
          workspace: { slug: workspace.slug, name: workspace.name },
        },
        is_read: false,
        created_at: ago(1, 2),
      },
      {
        user_id: owner.id,
        workspace_id: workspace.id,
        type: "CHAT_MENTION",
        payload: {
          message: {
            id: designMsgs[2].id,
            workspace_id: designMsgs[2].workspace_id,
            room_id: designMsgs[2].room_id,
            sender_id: designMsgs[2].sender_id,
            content: designMsgs[2].content,
            created_at: designMsgs[2].created_at,
            updated_at: designMsgs[2].updated_at,
            is_deleted: designMsgs[2].is_deleted,
            is_edited: designMsgs[2].is_edited,
            is_pinned: designMsgs[2].is_pinned,
            reply_to_id: designMsgs[2].reply_to_id,
            sender: { id: member.id, firstname: member.firstname, lastname: member.lastname, avatar_key: member.avatar_key },
          },
          room: { id: roomDesign.id, name: roomDesign.name },
          workspace: { slug: workspace.slug, name: workspace.name },
        },
        is_read: true,
        created_at: ago(1, 6),
      },
    ].map((n) => ({ ...n, payload: JSON.parse(JSON.stringify(n.payload)) })),
  });

  return {
    workspace,
    owner,
    member,
    designer,
    backendDev,
    qaLead,
    guest,
    invitee,
    sprintBoard,
    roadmapBoard,
    roomDesign,
    roomGeneral,
    fileRoomArch,
    fileRoomBrand,
    taskCount: seq,
  };
}

/* ── cache invalidation ─────────────────────────────────────────────────── */

async function clearCache({ workspace, owner, member, designer, backendDev, qaLead, guest, invitee }) {
  const host = backendEnv.REDIS_HOST ?? process.env.REDIS_HOST ?? "localhost";
  const port = Number(backendEnv.REDIS_PORT ?? process.env.REDIS_PORT ?? 6379);
  const prefix = backendEnv.REDIS_KEY_PREFIX ?? process.env.REDIS_KEY_PREFIX ?? "";

  const redis = new Redis({
    host,
    port,
    password: backendEnv.REDIS_PASS || process.env.REDIS_PASS || undefined,
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

  const allUsers = [owner, member, designer, backendDev, qaLead, guest, invitee].filter(Boolean);
  const keys = [`workspace:slug:${WS.slug}`, `workspace:${workspace.id}`];

  for (const u of allUsers) {
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

/* ── comprehensive verification checks ─────────────────────────────────── */

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

async function verify({ workspace, owner, member, designer, backendDev, qaLead, guest, invitee, sprintBoard, roomDesign }) {
  const failures = [];
  const check = (ok, label, detail) => {
    console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
    if (!ok) failures.push(label);
  };

  console.log("\n  Statistics · 1M");
  const m1 = await statistics(workspace.id, owner.id, 30);
  check(m1.personalWorkload > 0, "Active Workload", `${m1.personalWorkload} tasks`);
  check(m1.personalVelocity > 0, "Velocity", `${m1.personalVelocity} completed`);
  check(m1.personalCycleTime !== null, "Avg. Cycle Time", m1.personalCycleTime ? `${(m1.personalCycleTime / 3600).toFixed(1)}h` : "null");
  check(m1.timelinePoints >= 8, "Workspace Velocity chart", `${m1.timelinePoints} dated points`);

  console.log("\n  Statistics · 3M");
  const m3 = await statistics(workspace.id, owner.id, 90);
  check(m3.timelinePoints > m1.timelinePoints, "chart extends past 1M", `${m3.timelinePoints} points`);

  console.log("\n  Home Quick Stats · 2w window");
  const w2 = await statistics(workspace.id, owner.id, 14);
  check(w2.personalWorkload > 0, "In Progress", `${w2.personalWorkload}`);
  check(w2.personalVelocity > 0, "Completed", `${w2.personalVelocity}`);
  check(w2.personalWorkload + w2.personalVelocity > 0, "Total Tasks", `${w2.personalWorkload + w2.personalVelocity}`);

  console.log("\n  Team Members & Roles");
  const memberCount = await prisma.workspaceMember.count({ where: { workspace_id: workspace.id } });
  check(memberCount >= 6, "workspace member count", `${memberCount} members`);

  console.log("\n  Invite Flow Readiness");
  const visible = await prisma.user.findMany({
    where: {
      OR: [{ email: { contains: invitee.username } }, { username: { contains: invitee.username } }],
    },
  });
  check(visible.length === 1 && visible[0].id === invitee.id, "unattached invitee discoverable", invitee.email);

  console.log("\n  Realtime Fixtures");
  const msgCount = await prisma.chatMessage.count({ where: { workspace_id: workspace.id } });
  check(msgCount >= 15, "chat messages seeded", `${msgCount} messages across 5 rooms`);

  const fileCount = await prisma.workspaceFile.count({ where: { room: { workspace_id: workspace.id } } });
  check(fileCount >= 7, "files seeded in vault", `${fileCount} documents in 3 rooms`);

  const moduleColorsCount = await prisma.workspaceModule.count({
    where: { workspace_id: workspace.id, color: { not: null } },
  });
  check(moduleColorsCount >= 5, "colored modules seeded", `${moduleColorsCount} modules`);

  const avatarCount = await prisma.user.count({
    where: { id: { in: [owner.id, member.id, designer.id, backendDev.id, qaLead.id, guest.id, invitee.id] }, avatar_key: { not: null } },
  });
  check(avatarCount >= 6, "avatars attached to users", `${avatarCount}/7 users with custom avatar`);

  if (failures.length > 0) {
    console.error(`\n  FAILURES: ${failures.join(", ")}\n`);
    process.exit(1);
  }
}

/* ── execution entrypoint ───────────────────────────────────────────────── */

async function main() {
  console.log(`\n  🌱 Seeding Northstar Labs demo workspace...\n`);
  const start = Date.now();

  try {
    const data = await seed();
    await clearCache(data);
    await verify(data);

    console.log(`\n  ✨ Demo seed completed in ${((Date.now() - start) / 1000).toFixed(2)}s`);
    console.log(`\n  Workspace: ${WS.name} (/${WS.slug})`);
    console.log(`  Owner login: ${USERS.owner.email} / ${USERS.owner.password}`);
    console.log(`  Admin login: ${USERS.member.email} / ${USERS.member.password}\n`);
  } catch (error) {
    console.error("\n  Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
