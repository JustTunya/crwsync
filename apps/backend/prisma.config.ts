import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: `${process.env.DATABASE_URL}?connection_limit=10&pool_timeout=10`,
  },
});