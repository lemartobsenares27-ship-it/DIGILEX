import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Netlify Functions v1 (Lambda-compatible) handler shape -- not the v2
// Request/Response shape. serverless-http only ships adapters for AWS
// Lambda and Azure Functions event objects (see
// node_modules/serverless-http/lib/provider/), so it cannot process the
// Web-standard Request object that v2 functions receive. Every call
// through the v2 signature was crashing before Express ever ran, which
// showed up as a 502 on every /api/* route (login included) regardless of
// what happened inside the app itself.
//
// DATABASE_URL must be set *before* the app (and therefore Prisma Client)
// is imported, since ESM static imports would otherwise evaluate before
// this function body runs -- dynamic import() keeps the ordering correct.
// This runs once per warm function instance (cold start), not once per
// request.
//
// getConnectionString()'s underlying NETLIFY_DB_URL is injected during the
// Netlify build but is NOT present in the deployed function's runtime
// environment (confirmed via a MissingDatabaseConnectionError in
// production). server/scripts/provision-db.mjs resolves it at build time
// -- where it does work -- and writes it to this generated module; only
// fall back to resolving it again here for local `netlify dev`, where that
// build step may not have run.
let handlerPromise: Promise<Handler> | null = null;

async function buildHandler(): Promise<Handler> {
  if (!process.env.DATABASE_URL) {
    try {
      const generated = await import("./_generated-db-env.mjs");
      process.env.DATABASE_URL = generated.DATABASE_URL;
    } catch {
      const { getConnectionString } = await import("@netlify/database");
      process.env.DATABASE_URL = await getConnectionString();
    }
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }

  const { createApp } = await import("../../server/src/app.js");
  const serverless = (await import("serverless-http")).default;
  return serverless(createApp()) as unknown as Handler;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (!handlerPromise) {
    handlerPromise = buildHandler();
  }
  const h = await handlerPromise;
  // serverless-http's handler always resolves to a response object; the
  // `void` arm of Handler's return type exists only for background
  // functions, which this isn't.
  return (await h(event, context))!;
};
