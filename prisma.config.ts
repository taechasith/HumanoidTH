import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Use a direct database endpoint for schema commands when available.
    // The app itself continues to use DATABASE_URL, which may be pooled.
    url: process.env.DIRECT_DATABASE_URL ?? env("DATABASE_URL")
  },
  migrations: {
    path: "prisma/migrations",
    seed: "node_modules/.bin/tsx.CMD prisma/seed.ts"
  }
});
