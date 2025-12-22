import { defineConfig, globalIgnores } from "eslint/config"
import eslintNextPlugin from "@next/eslint-plugin-next"
import nextPlugin from "@next/eslint-plugin-next"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import importPlugin from "eslint-plugin-import"
 
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      next: eslintNextPlugin,
      import: importPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...(importPlugin.configs.typescript?.rules ?? {}),
      "@next/next/no-html-link-for-pages": "off",
      "import/no-unresolved": ["error", {
        ignore: ["server-only"]
      }],
    },
    settings: {
      next: {
        rootDir: ["./apps/frontend/web", "./apps/frontend/dash"],
      },
      "import/resolver": {
        node: true,
        typescript: {
          project: [
            "./apps/frontend/web/tsconfig.json",
            "./apps/frontend/dash/tsconfig.json",
            "./apps/backend/tsconfig.json",
          ],
        }
      },
    },
  },
  eslintConfigPrettier,
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/out/**",
    "**/build/**",
    "**/.next/**",
    "**/next-env.d.ts"
  ])
])
 
export default eslintConfig