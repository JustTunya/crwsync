import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const fn = eval("(" + readFileSync(new URL("./record-chat.js", import.meta.url), "utf8") + ")");
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
console.log(await fn(page));
await browser.close();
