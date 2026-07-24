// The default "@prisma/client" entry point eagerly resolves Prisma's
// native, OS-specific query-engine binary even when a driver adapter is
// supplied -- Netlify's function bundler doesn't ship that binary, so
// importing it crashes the function at cold start (502) before any route
// runs. "@prisma/client/wasm" is the binary-free entry point meant for use
// with driver adapters (see server/prisma/schema.prisma).
import { PrismaClient } from "@prisma/client/wasm";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Netlify Functions run on Node, not the Edge runtime, so the Neon
// serverless driver needs a WebSocket implementation supplied explicitly.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });
