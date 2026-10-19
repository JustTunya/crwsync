import { defineConfig } from "srcatlas";

export default defineConfig({
  // Packages to analyse and the extractors to run on each, found from package.json.
  packages: [
    { path: "apps/backend", extractors: ["nestjs", "prisma"] },
    { path: "apps/demo" },
    { path: "apps/frontend/dash" }, // next is a dependency; its extractor is not available yet
    { path: "apps/frontend/web" }, // next is a dependency; its extractor is not available yet
    { path: "packages/i18n" },
    { path: "packages/styles" },
    { path: "packages/templates" },
    { path: "packages/types" },
  ],

  // Options left at their defaults (docs/config.md):
  // outDir: ".srcatlas",
  // include: ["**/*.ts", "**/*.tsx", "**/*.prisma"],
  // exclude: [], // added to the built-in excludes (node_modules, dist, tests, ...)
  // extractors: {}, // per-extractor options, for example nestjs.globalPrefix
  // rules: [], // architecture rules for `srcatlas check`
  // analysis: { includeTests: false },
});
