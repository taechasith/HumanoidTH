import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Same precedence as Next.js: .env.local wins over .env. Variables already set in the
// shell (e.g. on Vercel) are never overridden.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL")
  },
  migrations: {
    path: "prisma/migrations",
    seed: "node_modules/.bin/tsx.CMD prisma/seed.ts"
  }
});
