/**
 * crwsync demo capture rig — see ../SHOTLIST.md
 *
 * Records one webm per beat against a PRODUCTION build of web (:3000) and
 * dash (:3001), plus raw/timing.json holding the measured on-screen duration
 * of every interaction so the 45-frame cut rule can be applied to real
 * footage instead of guessed at up front.
 *
 *   pnpm --filter @crwsync/demo record
 *
 * Credentials come from .env.demo (never hardcoded). Re-run `pnpm demo:seed`
 * before every capture run: B4/B8 mutate the fixture.
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "raw");

const WEB = process.env.DEMO_WEB_URL ?? "http://localhost:3000";
const DASH = process.env.DEMO_DASH_URL ?? "http://localhost:3001";
const SLUG = "northstar";

const FPS = 30;
const MIN_FRAMES = 45; // interactions shorter than this get cut, never sped up

const VIEWPORT = { width: 1920, height: 1080 };

// Both layouts run next-themes with defaultTheme="system", so emulating the
// media query is enough — no app-side theme override needed.
const CONTEXT = {
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  colorScheme: (process.env.DEMO_THEME === "light" ? "light" : "dark") as "light" | "dark",
};

function env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} missing — copy .env.demo.example to .env.demo and fill it in`);
  return value;
}

const OWNER = { id: env("DEMO_OWNER_EMAIL"), pw: env("DEMO_OWNER_PASSWORD") };
const MEMBER = { id: env("DEMO_MEMBER_EMAIL"), pw: env("DEMO_MEMBER_PASSWORD") };
const INVITEE = env("DEMO_INVITEE_EMAIL");

/* ── timing log ──────────────────────────────────────────────────────── */

type Step = { name: string; startFrame: number; endFrame: number; frames: number; underBudget: boolean };
type BeatLog = { beat: string; file: string; frames: number; steps: Step[] };

const beats: BeatLog[] = [];

const frames = (ms: number) => Math.round((ms / 1000) * FPS);
const hold = (page: Page, ms: number) => page.waitForTimeout(ms);

/** One beat = one screencast clip + its measured interaction spans. */
class Take {
  t0 = 0;
  steps: Step[] = [];
  page: Page;
  name: string;

  constructor(page: Page, name: string) {
    this.page = page;
    this.name = name;
  }

  async start() {
    await this.page.screencast.start({ path: join(OUT, `${this.name}.webm`), size: VIEWPORT });
    this.t0 = Date.now();
    return this;
  }

  /** Runs one interaction and records how long it occupied the screen. */
  async step(name: string, fn: () => Promise<void>) {
    process.stdout.write(`    · ${name}\n`);
    const start = Date.now() - this.t0;
    await fn();
    const end = Date.now() - this.t0;
    const span = frames(end) - frames(start);
    this.steps.push({
      name,
      startFrame: frames(start),
      endFrame: frames(end),
      frames: span,
      underBudget: span < MIN_FRAMES,
    });
  }

  async stop() {
    const total = frames(Date.now() - this.t0);
    await this.page.screencast.stop();
    beats.push({ beat: this.name, file: `${this.name}.webm`, frames: total, steps: this.steps });
    const short = this.steps.filter((s) => s.underBudget).map((s) => `${s.name} (${s.frames}f)`);
    console.log(`  ${this.name}: ${total}f${short.length ? `  under ${MIN_FRAMES}f: ${short.join(", ")}` : ""}`);
  }
}

/* ── interaction helpers ─────────────────────────────────────────────── */

/**
 * Eased scroll driven from Node, one window.scrollTo per output frame.
 * An in-page rAF loop stalls whenever the headed window is occluded, which
 * hangs the whole take; this cannot.
 */
async function easeScroll(page: Page, to: number | "features" | "top", ms: number) {
  const from = await page.evaluate(() => window.scrollY);
  const dest =
    to === "top"
      ? 0
      : to === "features"
        ? await page.evaluate(() => {
            const el = document.querySelector("#features");
            return el ? el.getBoundingClientRect().top + window.scrollY : window.scrollY;
          })
        : to;

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const steps = Math.max(1, Math.round((ms / 1000) * FPS));

  for (let i = 1; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), from + (dest - from) * ease(i / steps));
    await hold(page, 1000 / FPS);
  }
}

/** dnd-kit needs a real pointer path — PointerSensor arms after 5px. */
async function drag(page: Page, from: string, to: string, steps = 28) {
  const a = await page.locator(from).first().boundingBox();
  const b = await page.locator(to).first().boundingBox();
  if (!a || !b) throw new Error(`drag: missing box for ${from} → ${to}`);

  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y + 8, { steps: 4 });
  await hold(page, 120);
  await page.mouse.move(end.x, end.y, { steps });
  await hold(page, 220);
  await page.mouse.up();
  await hold(page, 400);
}

/** Cursor pan — no pointer is drawn (showActions is deliberately unused), but hover states fire. */
async function panTo(page: Page, selector: string, steps = 16) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
}

const moduleSel = (name: string) => `[data-testid="sidebar-module"][data-module-name="${name}"]`;

/**
 * Global modules are reachable by hotkey (⌘1/⌘2 chips are on screen), but the
 * keypress itself is invisible — fall back to the sidebar link if it misses so
 * a swallowed keystroke can't kill the take.
 */
async function jumpTo(page: Page, hotkey: string, href: string, urlGlob: string) {
  await page.keyboard.press(hotkey);
  try {
    await page.waitForURL(urlGlob, { timeout: 4_000 });
  } catch {
    await page.click(`aside a[href="${href}"]`);
    await page.waitForURL(urlGlob, { timeout: 15_000 });
  }
}

async function signIn(page: Page, who: { id: string; pw: string }) {
  await page.goto(`${WEB}/auth/signin`);
  await page.fill("#identifier", who.id);
  await page.fill("#password", who.pw);
  await page.click("#remember");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DASH}/**`, { timeout: 30_000 });
}

/* ── beats ───────────────────────────────────────────────────────────── */

async function b1Landing(page: Page) {
  await page.goto(WEB, { waitUntil: "networkidle" });
  const take = await new Take(page, "B1-landing").start();

  await take.step("hold on hero", () => hold(page, 3_100));
  await take.step("scroll to features", () => easeScroll(page, "features", 1_000));
  await take.step("scroll through bento grid", async () => {
    await easeScroll(page, (await page.evaluate(() => window.scrollY)) + 900, 3_400);
    await hold(page, 700);
  });
  await take.step("ease back to top", () => easeScroll(page, "top", 1_200));
  await take.step("settle on header CTA", async () => {
    await panTo(page, 'a[href="/auth/signup"]');
    await hold(page, 500);
  });

  await take.stop();
}

async function b2Auth(page: Page) {
  const take = await new Take(page, "B2-auth").start();

  await take.step("open signin", async () => {
    await page.click('header a[href="/auth/signin"]');
    await page.waitForURL("**/auth/signin**");
    await hold(page, 500);
  });
  await take.step("type credentials", async () => {
    await page.type("#identifier", OWNER.id, { delay: 55 });
    await hold(page, 250);
    await page.type("#password", OWNER.pw, { delay: 55 });
    await hold(page, 250);
    await page.click("#remember");
    await hold(page, 400);
  });
  await take.step("submit", async () => {
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DASH}/**`, { timeout: 30_000 });
  });
  await take.step("dashboard settles", () => hold(page, 2_000));

  await take.stop();
}

async function b3Workspace(page: Page) {
  await page.goto(`${DASH}/create-workspace`, { waitUntil: "networkidle" });
  const take = await new Take(page, "B3-workspace").start();

  // The fixture already owns slug `northstar`, so the on-camera slug is
  // run-scoped. The VO never says it; the name on screen is what matters.
  const slug = `northstar-${Date.now().toString(36).slice(-4)}`;

  await take.step("land on create-workspace", () => hold(page, 1_600));
  await take.step("type workspace name", async () => {
    await page.type("#ws-name", "Northstar Labs", { delay: 70 });
    await hold(page, 400);
  });
  await take.step("type slug", async () => {
    await page.type("#ws-slug", slug, { delay: 45 });
    await hold(page, 300);
  });
  await take.step("create workspace", async () => {
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DASH}/${slug}**`, { timeout: 20_000 });
  });
  await take.step("dashboard shell paints", () => hold(page, 1_400));

  await take.stop();
}

async function b4Invite(page: Page) {
  await page.goto(`${DASH}/${SLUG}`, { waitUntil: "networkidle" });
  await hold(page, 1_200);
  const take = await new Take(page, "B4-invite").start();

  await take.step("sidebar tour", async () => {
    await page.click('[data-testid="workspace-switcher"]');
    await hold(page, 900);
    await page.keyboard.press("Escape");
    await panTo(page, 'input[placeholder="Search..."]');
    await hold(page, 400);
    await panTo(page, '[data-testid="section-add-shared"]');
    await hold(page, 400);
    await panTo(page, '[data-testid="sidebar-profile"]');
    await hold(page, 500);
    await page.click('[data-testid="sidebar-profile"]');
    await hold(page, 900);
    await page.keyboard.press("Escape");
    await page.mouse.click(960, 540);
    await hold(page, 300);
  });

  await take.step("open invite modal", async () => {
    // RSidebar defaults to open on MEMBERS; clicking the toggle then would
    // close it. Only reach for the toggle when the panel is actually shut.
    const invite = page.locator('[data-testid="invite-members"]');
    if (!(await invite.isVisible())) {
      await page.click('[data-testid="rsidebar-members-toggle"]');
      await hold(page, 700);
    }
    await invite.click();
    await page.waitForSelector('[data-testid="invite-modal"]');
    await hold(page, 500);
  });

  await take.step("search invitee", async () => {
    await page.type('[data-testid="invite-search"]', INVITEE, { delay: 45 });
    await page.waitForSelector('[data-testid="invite-user-result"]', { timeout: 15_000 });
    await hold(page, 500);
    await page.click('[data-testid="invite-user-result"]');
    await hold(page, 500);
  });

  await take.step("assign role", async () => {
    await page.click('[data-testid="invite-role-select"]');
    await hold(page, 800);
    await page.getByRole("option", { name: "Member" }).click();
    await hold(page, 500);
  });

  await take.step("send invite", async () => {
    await page.click('[data-testid="invite-send"]');
    await hold(page, 900);
  });

  await take.step("show pending invite", async () => {
    await page.locator('[data-testid="invite-members"]').click();
    await page.waitForSelector('[data-testid="invite-modal"]');
    await page.click('[data-testid="invite-pending-toggle"]');
    await hold(page, 1_400);
    // The modal card stops keydown propagation, so Escape never reaches its
    // handler — dismiss by clicking the backdrop instead.
    // Above the centred card, clear of both sidebars (they sit above the
    // backdrop at z-100).
    await page.mouse.click(960, 160);
    await page.locator('[data-testid="invite-modal"]').waitFor({ state: "detached" });
    await hold(page, 500);
  });

  await take.stop();
}

async function b5Statistics(page: Page) {
  const take = await new Take(page, "B5-statistics").start();

  await take.step("open statistics", async () => {
    await jumpTo(page, "Control+2", `/${SLUG}/statistics`, `**/${SLUG}/statistics**`);
    await page.waitForSelector('[data-testid="stat-workload"]');
  });
  await take.step("stagger-in settles", () => hold(page, 2_400));
  await take.step("highlight active workload", async () => {
    await panTo(page, '[data-testid="stat-workload"]');
    await hold(page, 900);
  });
  await take.step("highlight velocity", async () => {
    await panTo(page, '[data-testid="stat-velocity"]');
    await hold(page, 700);
  });
  await take.step("highlight cycle time", async () => {
    await panTo(page, '[data-testid="stat-cycle-time"]');
    await hold(page, 900);
  });
  await take.step("switch to 3M", async () => {
    await page.click('[data-testid="interval-3m"]');
    await hold(page, 1_800);
  });

  await take.stop();
}

async function b6Board(page: Page) {
  const take = await new Take(page, "B6-board").start();

  await take.step("open Sprint 14", async () => {
    await page.click(moduleSel("Sprint 14"));
    await page.waitForSelector('[data-testid="kanban-column"]');
    await hold(page, 600);
  });
  await take.step("wide hold on populated board", () => hold(page, 2_700));

  await take.step("column menu on In Review", async () => {
    const col = page.locator('[data-testid="kanban-column"][data-column-name="In Review"]');
    await col.locator('[data-testid="column-menu"]').click();
    await hold(page, 1_500);
    await page.keyboard.press("Escape");
    await page.mouse.click(960, 1_000);
    await hold(page, 300);
  });

  const inProgress = page.locator('[data-testid="kanban-column"][data-column-name="In Progress"]');

  await take.step("set priority urgent", async () => {
    await inProgress.locator('[data-testid="kanban-task"]').first().click();
    await page.waitForSelector('[data-testid="task-detail-modal"]');
    await hold(page, 600);
    await page.click('[data-testid="priority-urgent"]');
    await hold(page, 700);
  });

  await take.step("assign deadline", async () => {
    await page.click('[data-testid="add-deadline"]');
    await hold(page, 400);
    await page.click('[data-testid="deadline-trigger"]');
    await hold(page, 700);

    const target = new Date();
    target.setDate(target.getDate() + 7);
    const cell = page.locator(`[data-day="${target.toLocaleDateString("en-US")}"]`);
    if (await cell.count()) await cell.first().click();
    else await page.locator("[data-day]").last().click();

    await hold(page, 600);
    await page.click('[data-testid="task-save"]');
    await page.waitForSelector('[data-testid="task-detail-modal"]', { state: "detached" });
    await hold(page, 600);
  });

  await take.step("drag In Progress → Done", async () => {
    await drag(
      page,
      '[data-testid="kanban-column"][data-column-name="In Progress"] [data-testid="kanban-task"]',
      '[data-testid="kanban-column"][data-column-name="Done"] [data-testid="kanban-task"]',
    );
  });

  await take.step("board settles", () => hold(page, 900));

  await take.stop();
}

async function b7Chat(page: Page, other: Page) {
  const take = await new Take(page, "B7-chat").start();

  await take.step("open design-sync", async () => {
    await page.click(moduleSel("design-sync"));
    await page.waitForSelector('[data-testid="chat-input"]');
    await other.click(moduleSel("design-sync"));
    await other.waitForSelector('[data-testid="chat-input"]');
    await hold(page, 1_600);
  });

  await take.step("B sends a message", async () => {
    const before = await page.locator('[data-testid="message-bubble"]').count();
    await other.fill('[data-testid="chat-input"]', "Just pushed the new column colours — take a look?");
    await other.click('[data-testid="chat-send"]');
    await page
      .locator('[data-testid="message-bubble"]')
      .nth(before)
      .waitFor({ timeout: 15_000 });
    await hold(page, 900);
  });

  await take.step("A reacts", async () => {
    const bubble = page.locator('[data-testid="message-bubble"][data-self="false"]').last();
    await bubble.hover();
    await hold(page, 400);
    await bubble.locator('[data-testid="message-react"]').click();
    await hold(page, 600);
    await page.locator('[data-testid="quick-reaction"][data-emoji="🔥"]').click();
    await page.waitForSelector('[data-testid="reaction-indicator"]');
    await hold(page, 900);
  });

  await take.step("A mentions B", async () => {
    await page.click('[data-testid="chat-input"]');
    await page.type('[data-testid="chat-input"]', "@Tobias", { delay: 70 });
    await page.waitForSelector('[data-testid="mention-dropdown"]', { timeout: 10_000 });
    await hold(page, 600);
    await page.keyboard.press("Enter");
    await hold(page, 700);
  });

  await take.step("B typing indicator", async () => {
    await other.click('[data-testid="chat-input"]');
    await other.type('[data-testid="chat-input"]', "On it — reviewing now", { delay: 120 });
    await page.waitForSelector('[data-testid="typing-indicator"]', { timeout: 10_000 });
    await hold(page, 2_000);
  });

  await take.step("pull back to the shell", async () => {
    await panTo(page, moduleSel("Sprint 14"), 24);
    await hold(page, 2_000);
  });

  await take.stop();
}

async function b8Projects(page: Page) {
  const take = await new Take(page, "B8-projects").start();

  await take.step("shared section in focus", async () => {
    await panTo(page, '[data-testid="sidebar-droppable-shared"]', 20);
    await hold(page, 1_200);
  });

  await take.step("create project", async () => {
    await page.click('[data-testid="section-add-projects"]');
    await page.waitForSelector('[data-testid="sidebar-project"] input');
    await hold(page, 400);
    await page.locator('[data-testid="sidebar-project"] input').fill("");
    await page.locator('[data-testid="sidebar-project"] input').type("Q3 Launch", { delay: 80 });
    await page.keyboard.press("Enter");
    await hold(page, 800);
  });

  await take.step("drag board into project", async () => {
    await drag(page, moduleSel("Sprint 14"), '[data-testid="sidebar-project"]');
  });

  await take.step("drag chat room into project", async () => {
    await drag(page, moduleSel("design-sync"), '[data-testid="sidebar-project"]');
  });

  await take.step("reorder settles", () => hold(page, 2_400));

  await take.stop();
}

async function b9Home(page: Page) {
  const take = await new Take(page, "B9-home").start();

  await take.step("back to home", async () => {
    await jumpTo(page, "Control+1", `/${SLUG}`, `${DASH}/${SLUG}`);
    await page.waitForSelector('[data-testid="quickstat-total"]');
  });
  await take.step("greeting", () => hold(page, 1_400));
  await take.step("quick stats + pinned modules", async () => {
    await page.waitForSelector('[data-testid="pinned-module"]');
    await hold(page, 3_000);
  });

  // "Tasks, chat, and analytics in sync." — three ~22f beats.
  await take.step("montage: board", async () => {
    await page.click(moduleSel("Sprint 14"));
    await page.waitForSelector('[data-testid="kanban-column"]');
    await hold(page, 750);
  });
  await take.step("montage: chat", async () => {
    await page.click(moduleSel("design-sync"));
    await page.waitForSelector('[data-testid="chat-input"]');
    await hold(page, 750);
  });
  await take.step("montage: statistics", async () => {
    await jumpTo(page, "Control+2", `/${SLUG}/statistics`, `**/${SLUG}/statistics**`);
    await page.waitForSelector('[data-testid="velocity-chart"]');
    await hold(page, 750);
  });
  await take.step("outro hold", () => hold(page, 1_500));

  await take.stop();
}

/* ── run ─────────────────────────────────────────────────────────────── */

async function main() {
  mkdirSync(OUT, { recursive: true });

  let browser: Browser | undefined;
  let cookieless: BrowserContext | undefined;
  let member: BrowserContext | undefined;

  try {
    browser = await chromium.launch({
      headless: false,
      args: [
        "--hide-scrollbars",
        // The window must be big enough that the compositor surface is at
        // least the emulated viewport, otherwise the screencast upscales a
        // short surface mid-scroll and the frame reads as zoomed. Browser
        // chrome eats ~90px, and it has to sit on a 1080-tall display.
        `--window-size=${VIEWPORT.width},${VIEWPORT.height + 120}`,
        `--window-position=${process.env.DEMO_WINDOW_POSITION ?? "1280,0"}`,
        // Headed chromium stops producing screencast frames the moment its
        // window is occluded by another app, and screencast.stop() then waits
        // forever for a flush that never comes.
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
      ],
    });

    // B1–B3 need a cookieless context: web/proxy.ts bounces every route to the
    // dash as soon as crw-rt exists, so landing + signin only exist here.
    cookieless = await browser.newContext({ ...CONTEXT });
    const owner = await cookieless.newPage();

    console.log("recording:");
    await b1Landing(owner);
    await b2Auth(owner); // creates the session this context carries onward
    await b3Workspace(owner);
    await b4Invite(owner);
    await b5Statistics(owner);
    await b6Board(owner);

    // Second authenticated context for the socket beat.
    member = await browser.newContext({ ...CONTEXT });
    const memberPage = await member.newPage();
    await signIn(memberPage, MEMBER);
    await memberPage.goto(`${DASH}/${SLUG}`, { waitUntil: "networkidle" });

    await b7Chat(owner, memberPage);
    await b8Projects(owner);
    await b9Home(owner);

    const short = beats.flatMap((b) => b.steps.filter((s) => s.underBudget).map((s) => `${b.beat}/${s.name} ${s.frames}f`));
    writeFileSync(
      join(OUT, "timing.json"),
      JSON.stringify({ fps: FPS, minFrames: MIN_FRAMES, recordedAt: new Date().toISOString(), beats }, null, 2),
    );

    console.log(`\nclips + timing.json → ${OUT}`);
    console.log(
      short.length
        ? `cut candidates (under ${MIN_FRAMES}f):\n  ${short.join("\n  ")}`
        : `no interaction fell under ${MIN_FRAMES}f`,
    );
  } finally {
    // browser.close() can hang on Windows after a screencast; the clips are
    // already flushed by then, so don't let teardown block the run.
    await Promise.race([
      (async () => {
        await member?.close();
        await cookieless?.close();
        await browser?.close();
      })(),
      new Promise((r) => setTimeout(r, 10_000)),
    ]).catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
