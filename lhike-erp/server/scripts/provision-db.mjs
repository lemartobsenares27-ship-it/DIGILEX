// Runs once during the Netlify build. Resolves the Postgres connection
// string for the auto-provisioned Netlify DB (Neon), then pushes the
// Prisma schema and seeds the initial admin/Mother Account -- all against
// that database, before the site (and its API function) goes live.
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const serverDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function main() {
  if (!process.env.DATABASE_URL) {
    const { getConnectionString } = await import("@netlify/database");
    process.env.DATABASE_URL = await getConnectionString();
    console.log("Resolved DATABASE_URL from Netlify DB (Neon).");
  } else {
    console.log("Using existing DATABASE_URL from the environment.");
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
