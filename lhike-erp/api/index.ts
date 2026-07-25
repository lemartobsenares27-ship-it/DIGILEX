// Vercel's standard pattern for an Express app: export it directly as the
// default export of a function file, and let vercel.json's rewrites route
// everything under /api/* here. Vercel forwards the original request URL
// (e.g. /api/auth/login) to the function, so Express's own internal
// routing in server/src/app.ts -- which already mounts everything under
// /api/... -- works unmodified.
//
// Imports the *compiled* app (server/dist/app.js, built by the server's
// own `tsc -b`, run as part of the Vercel build command -- see
// vercel.json) rather than the .ts source directly. This keeps the build
// predictable: Vercel's function bundler traces and transpiles arbitrary
// imported TypeScript on the fly, but importing a known, pre-built plain
// JS artifact avoids depending on exactly how well that works for files
// living outside the api/ directory.
import { createApp } from "../server/dist/app.js";

export default createApp();
