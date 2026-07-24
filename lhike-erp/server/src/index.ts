import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { settingsRouter } from "./routes/settings.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "lhike-erp-server" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/settings", settingsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`LHIKE ERP server listening on http://localhost:${PORT}`);
});
