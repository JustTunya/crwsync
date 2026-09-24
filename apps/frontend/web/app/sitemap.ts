import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const routes = [
  { path: "", changeFrequency: "monthly", priority: 1, lastModified: "2026-09-24" },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.3, lastModified: "2026-09-14" },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.3, lastModified: "2026-09-14" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, ...rest }) => ({ url: `${siteUrl}${path}`, ...rest }));
}
