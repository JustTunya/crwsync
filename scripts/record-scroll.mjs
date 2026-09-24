import { chromium } from "playwright";

const [url = "http://localhost:3000", width = "1920", height = "1080", seconds = "10", outDir = "recordings_temp"] = process.argv.slice(2);
const W = +width;
const H = +height;

const browser = await chromium.launch({ headless: false, args: ["--hide-scrollbars"] });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  colorScheme: "dark",
  recordVideo: { dir: outDir, size: { width: W, height: H } },
});
await context.addInitScript(() => {
  const s = document.createElement("style");
  s.textContent = "html{scrollbar-width:none!important}html::-webkit-scrollbar{display:none;width:0;height:0}";
  document.addEventListener("DOMContentLoaded", () => document.head.prepend(s));
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(2500);

const distance = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const pxPerSec = distance / +seconds;
console.log(`distance=${distance}px pxPerSec=${pxPerSec.toFixed(1)}`);

const t0 = Date.now();
await page.evaluate(
  ({ distance, ms }) =>
    new Promise((resolve) => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / ms, 1);
        window.scrollTo(0, p * distance);
        p < 1 ? requestAnimationFrame(tick) : resolve();
      };
      requestAnimationFrame(tick);
    }),
  { distance, ms: +seconds * 1000 },
);
console.log(`scroll finished after ${Date.now() - t0}ms`);
await page.waitForTimeout(500);

const video = page.video();
await context.close();
console.log("video:", await video.path());
await browser.close();
