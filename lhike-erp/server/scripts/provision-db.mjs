// Runs once during the Vercel build, after `prisma generate`. Pushes the
// Prisma schema and seeds the initial admin/Mother Account against
// DATABASE_URL (set as a Vercel project environment variable -- see the
// Vercel Postgres/Neon integration in project Settings > Storage), before
// the deployment goes live.
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const serverDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it as an environment variable in the Vercel project settings (Storage > connect a Postgres/Neon database, or set it manually).",
    );
  }

  const run = (cmd) => execSync(cmd, { cwd: serverDir, stdio: "inherit", env: process.env });

  run("npx prisma generate");
  run("npx prisma db push --accept-data-loss --skip-generate");
  run("npx tsx prisma/seed.ts");
}

main().catch((err) => {
  console.error("Database provisioning failed:", err);
  process.exit(1);
});
