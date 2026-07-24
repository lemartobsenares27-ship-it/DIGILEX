import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { AUTH_COOKIE_NAME, compareSecret, hashSecret, signToken } from "../auth.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const isProd = process.env.NODE_ENV === "production";

function setAuthCookie(res: import("express").Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 8 * 60 * 60 * 1000,
  });
}

// Module 9, SOP 9-2: the employee -- not the administrator -- sets their
// own username/password. This only succeeds against an Employee No. that
// an administrator already created via Add User (SOP 9-1).
const requestAccessSchema = z.object({
  employeeNo: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(8),
  securityQuestion: z.string().min(1),
  securityAnswer: z.string().min(1),
});

authRouter.post("/request-access", async (req, res) => {
  const parsed = requestAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const { employeeNo, username, password, securityQuestion, securityAnswer } = parsed.data;

  const user = await prisma.user.findUnique({ where: { employeeNo } });
  if (!user) {
    return res.status(404).json({
      error: "No account record found for that Employee No. Ask your administrator to add you first (Add User).",
    });
  }
  if (user.username) {
    return res.status(409).json({ error: "Access has already been requested for this account." });
  }
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return res.status(409).json({ error: "That username is already taken." });
  }

  const passwordHash = await hashSecret(password);
  const securityAnswerHash = await hashSecret(securityAnswer.toLowerCase().trim());

  await prisma.user.update({
    where: { id: user.id },
    data: {
      username,
      passwordHash,
      securityQuestion,
      securityAnswerHash,
      requestedAccessAt: new Date(),
      // enabled stays false -- an administrator must still Enable the account (SOP 9-3).
    },
  });

  res.status(201).json({
    message: "Account created, contact your Administrator for verification.",
  });
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  const ok = await compareSecret(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  if (!user.enabled) {
    return res.status(403).json({
      error: "Your account has not been enabled yet. Contact your administrator, or click Request Access.",
    });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const token = signToken({ userId: user.id });
  setAuthCookie(res, token);
  res.json({ message: "Signed in." });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ message: "Signed out." });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Not found." });
  res.json({
    id: user.id,
    employeeNo: user.employeeNo,
    username: user.username,
    fullName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" "),
    position: user.position,
    employmentStatus: user.employmentStatus,
    lastLogin: user.lastLogin,
    permissions: JSON.parse(user.permissions),
    isMotherAccount: user.isMotherAccount,
  });
});
