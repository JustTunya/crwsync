import { readdirSync } from "node:fs";

const host = new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "https://crwsync.xyz").host;
const keyFile = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
const key = keyFile.replace(".txt", "");
const sitemap = await (await fetch(`https://${host}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList }),
});
console.log(res.status, urlList.length, "urls submitted");
