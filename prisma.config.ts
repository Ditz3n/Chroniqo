// prisma.config.ts
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.local locally; in CI the variable is injected by the runner
if (!process.env.CI) {
  dotenv.config({ path: ".env.local" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
