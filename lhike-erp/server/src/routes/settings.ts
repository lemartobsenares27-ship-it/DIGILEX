import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const settingsRouter = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `company-logo${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Public: the login page (Module 9, Section 9.8) shows the logo before
// anyone signs in.
settingsRouter.get("/logo", async (_req, res) => {
  const row = await prisma.companySettings.findUnique({ where: { id: 1 } });
  res.json({ logoUrl: row?.logoPath ? `/uploads/${path.basename(row.logoPath)}` : null });
});

settingsRouter.post(
  "/logo",
  requireAuth,
  requirePermission("user.userManagement.manage"),
  upload.single("logo"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    await prisma.companySettings.upsert({
      where: { id: 1 },
      create: { id: 1, logoPath: req.file.filename },
      update: { logoPath: req.file.filename },
    });
    res.status(201).json({ logoUrl: `/uploads/${req.file.filename}` });
  },
);
