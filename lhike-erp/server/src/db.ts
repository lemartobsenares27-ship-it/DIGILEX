// Imported by relative path, not the "@prisma/client" package specifier:
// the generator's custom `output` (see schema.prisma) writes the client
// straight into netlify/functions/generated/prisma-client/index.js. A bare
// package specifier depends on Netlify correctly re-including
// server/node_modules in the deployed function bundle, which it does not
// do reliably -- confirmed in production via "Cannot find module
// '@prisma/client/wasm'".
//
// This is the default, native-engine entry point, not the wasm one: the
// wasm engine (paired with the Neon driver adapter) got past that bundling
// problem but then failed to even initialize in the Netlify build
// container itself -- "PrismaClientInitializationError: The loaded wasm
// module was unexpectedly undefined or null once loaded" -- a Prisma/Node
// 24 wasm-loading incompatibility, not something under our control. The
// native binary engine is generated fresh in the same Netlify build
// container it will run in (see server/scripts/provision-db.mjs), so it
// doesn't have the cross-platform mismatch that native engines usually
// risk on serverless platforms.
import { PrismaClient } from "../../netlify/functions/generated/prisma-client/index.js";

export const prisma = new PrismaClient();
