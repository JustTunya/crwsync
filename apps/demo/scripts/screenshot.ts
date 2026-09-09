/**
 * crwsync marketing-site hero poster — one still frame of the Sprint 14
 * board, both sidebars open (left nav, right members), for the homepage
 * hero's video-placeholder card. See ../scripts/record.ts for the sibling
 * video rig this borrows its login/viewport conventions from.
 *
 *   pnpm --filter @crwsync/demo screenshot
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "screens");

const WEB = process.env.DEMO_WEB_URL ?? "http://localhost:3000";
const DASH = process.env.DEMO_DASH_URL ?? "http://localhost:3001";
const SLUG = "northstar";

// Matches the hero card's aspect-video frame exactly (16:9) — the screenshot
// drops straight into it with no post-hoc cropping.
const VIEWPORT = { width: 1920, height: 1080 };

function env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} missing — copy .env.demo.example to .env.demo and fill it in`);
  return value;
}

const OWNER = { id: env("DEMO_OWNER_EMAIL"), pw: env("DEMO_OWNER_PASSWORD") };

const moduleSel = (name: string) => `[data-testid="sidebar-module"][data-module-name="${name}"]`;

async function run() {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--hide-scrollbars"],
  });

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: (process.env.DEMO_THEME === "light" ? "light" : "dark") as "light" | "dark",
    });
    const page = await context.newPage();
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    page.on("pageerror", (e) => console.log("pageerror:", e.message));
    page.on("console", (m) => {
      if (m.type() === "error") console.log("console.error:", m.text());
    });

    console.log("goto signin...");
    await page.goto(`${WEB}/auth/signin`, { timeout: 20_000 });
    console.log("filling credentials...");
    await page.fill("#identifier", OWNER.id);
    await page.fill("#password", OWNER.pw);
    await page.click('button[type="submit"]');
    console.log("waiting for dash redirect...");
    await page.waitForURL(`${DASH}/**`, { timeout: 20_000 });

    console.log("goto workspace...");
    await page.goto(`${DASH}/${SLUG}`, { timeout: 20_000 });
    console.log("waiting for pinned modules...");
    await page.waitForSelector('[data-testid="pinned-module"]', { timeout: 20_000 });
    console.log("opening Sprint 14...");
    await page.locator(moduleSel("Sprint 14")).waitFor({ state: "visible", timeout: 15_000 });
    console.log("module link visible, clicking...");
    await page.click(moduleSel("Sprint 14"), { timeout: 15_000 });
    console.log("clicked, waiting for board...");
    await page.waitForSelector('[data-testid="kanban-column"]', { timeout: 20_000 });

    // Both sidebars are open:true / view:"MEMBERS" by default (zustand
    // persist, empty localStorage on a fresh context) — nothing to toggle.
    console.log("settling...");
    await page.waitForTimeout(1_500);

    const out = join(OUT, "poster.webp");
    await page.screenshot({ path: out, type: "webp", quality: 92 });
    console.log(`poster → ${out}`);
  } catch (err) {
    const pages = browser.contexts().flatMap((c) => c.pages());
    const page = pages[pages.length - 1];
    if (page) {
      const dump = join(OUT, "failure.png");
      await page.screenshot({ path: dump }).catch(() => {});
      console.log(`failure screenshot → ${dump}`);
      console.log(`failure url: ${page.url()}`);
    }
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  // Hard watchdog: a hung selector/actionability wait must not hang the
  // whole process silently — surface it as a real failure with a screenshot.
  await Promise.race([
    run(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("watchdog: script exceeded 90s")), 90_000)),
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
