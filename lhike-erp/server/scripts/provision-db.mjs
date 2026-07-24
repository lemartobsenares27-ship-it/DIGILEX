// Runs once during the Netlify build. Resolves the Postgres connection
// string for the auto-provisioned Netlify DB (Neon), then pushes the
// Prisma schema and seeds the initial admin/Mother Account -- all against
// that database, before the site (and its API function) goes live.
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.dirname(scriptsDir);
const repoDir = path.dirname(serverDir);

async function main() {
  if (!process.env.DATABASE_URL) {
    const { getConnectionString } = await import("@netlify/database");
    process.env.DATABASE_URL = await getConnectionString();
    console.log("Resolved DATABASE_URL from Netlify DB (Neon).");
  } else {
    console.log("Using existing DATABASE_URL from the environment.");
  }

  // getConnectionString() reads process.env.NETLIFY_DB_URL, which Netlify
  // injects during the build but does NOT persist into the deployed
  // function's runtime environment (confirmed via a
  // MissingDatabaseConnectionError in production -- the site has no
  // persisted env vars at all). Bake the resolved value into a generated
  // module the function imports directly at cold start, instead of trying
  // to resolve it again in an environment where it isn't available.
  const generatedPath = path.join(repoDir, "netlify/functions/_generated-db-env.mjs");
  fs.writeFileSync(
    generatedPath,
    `// Auto-generated at build time by server/scripts/provision-db.mjs -- do not edit or commit.\nexport const DATABASE_URL = ${JSON.stringify(process.env.DATABASE_URL)};\n`,
  );
  console.log(`Wrote resolved DATABASE_URL to ${generatedPath} for the function to import.`);

  const run = (cmd) => execSync(cmd, { cwd: serverDir, stdio: "inherit", env: process.env });

  run("npx prisma generate");
  run("npx prisma db push --accept-data-loss --skip-generate");
  run("npx tsx prisma/seed.ts");
}

main().catch((err) => {
  console.error("Database provisioning failed:", err);
  process.exit(1);
});
