import type { Context, Config } from "@netlify/functions";

export const config: Config = { path: "/api/*" };

// Netlify Functions v2 speak the Web-standard Request/Response, so the
// existing Express app (server/src/app.ts) is adapted via serverless-http.
// DATABASE_URL must be resolved via @netlify/database's getConnectionString()
// *before* the app (and therefore Prisma Client) is imported, since ESM
// static imports would otherwise evaluate before this function body runs --
// dynamic import() keeps the ordering correct. This runs once per warm
// function instance (cold start), not once per request.
type RequestHandler = (req: Request, context: Context) => Promise<Response>;

let handlerPromise: Promise<RequestHandler> | null = null;

async function buildHandler(): Promise<RequestHandler> {
  if (!process.env.DATABASE_URL) {
    const { getConnectionString } = await import("@netlify/database");
    process.env.DATABASE_URL = await getConnectionString();
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }

  const { createApp } = await import("../../server/src/app.js");
  const serverless = (await import("serverless-http")).default;
  return serverless(createApp()) as unknown as RequestHandler;
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (!handlerPromise) {
    handlerPromise = buildHandler();
  }
  const handler = await handlerPromise;
  return handler(req, context);
};
