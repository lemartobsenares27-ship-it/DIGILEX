// Imported by relative path, not the "@prisma/client" package specifier:
// the generator's custom `output` (see schema.prisma) writes the client
// straight into netlify/functions/generated/prisma-client/wasm.js, the
// binary-free entry point for use with driver adapters. A bare package
// specifier depends on Netlify correctly re-including server/node_modules
// in the deployed function bundle, which it does not do reliably --
// confirmed in production via "Cannot find module '@prisma/client/wasm'".
// A relative sibling-file import needs no module resolution/bundler
// cooperation at all.
import { PrismaClient } from "../../netlify/functions/generated/prisma-client/wasm.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Netlify Functions run on Node, not the Edge runtime, so the Neon
// serverless driver needs a WebSocket implementation supplied explicitly.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });
