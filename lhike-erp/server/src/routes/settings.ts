import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const settingsRouter = Router();

// Memory storage (not disk) -- Netlify Functions run on a read-only,
// ephemeral filesystem, so the logo is kept as a small base64 data URL in
// the database instead of a file on disk. Works identically in local dev.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1 * 1024 * 1024 } });

// Public: the login page (Module 9, Section 9.8) shows the logo before
// anyone signs in.
settingsRouter.get("/logo", async (_req, res) => {
  const row = await prisma.companySettings.findUnique({ where: { id: 1 } });
  res.json({ logoUrl: row?.logoDataUrl ?? null });
});

settingsRouter.post(
  "/logo",
  requireAuth,
  requirePermission("user.userManagement.manage"),
  upload.single("logo"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    await prisma.companySettings.upsert({
      where: { id: 1 },
      create: { id: 1, logoDataUrl: dataUrl },
      update: { logoDataUrl: dataUrl },
    });
    res.status(201).json({ logoUrl: dataUrl });
  },
);
