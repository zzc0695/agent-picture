import "dotenv/config";

import { defineConfig } from "prisma/config";

import { getDatabaseUrl } from "./lib/db-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(process.env),
  },
});
