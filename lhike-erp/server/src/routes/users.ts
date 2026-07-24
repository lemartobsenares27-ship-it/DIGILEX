import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { ALL_PERMISSION_KEYS, PERMISSION_TREE } from "../permissions.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

function toSummary(u: {
  id: string;
  employeeNo: string;
  username: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  position: string | null;
  lastLogin: Date | null;
  enabled: boolean;
  employmentStatus: string;
  isMotherAccount: boolean;
}) {
  return {
    id: u.id,
    employeeNo: u.employeeNo,
    username: u.username,
    fullName: [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" "),
    position: u.position,
    lastLogin: u.lastLogin,
    enabled: u.enabled,
    employmentStatus: u.employmentStatus,
    isMotherAccount: u.isMotherAccount,
    hasRequestedAccess: Boolean(u.username),
  };
}

usersRouter.get("/permission-tree", (_req, res) => {
  res.json({ tree: PERMISSION_TREE });
});

usersRouter.get("/", requirePermission("user.userManagement.manage"), async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  res.json({ users: users.map(toSummary) });
});

usersRouter.get("/:id", requirePermission("user.userManagement.manage"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "Not found." });
  res.json({
    ...toSummary(user),
    middleName: user.middleName,
    birthdate: user.birthdate,
    contactNumber: user.contactNumber,
    personalEmail: user.personalEmail,
    companyEmail: user.companyEmail,
    gender: user.gender,
    employmentDate: user.employmentDate,
    permissions: JSON.parse(user.permissions),
  });
});

// SOP 9-1: Administrator creates a bare account record -- no username or
// password yet, and always created disabled.
const addUserSchema = z.object({
  employeeNo: z.string().min(1),
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  birthdate: z.string().optional(),
  contactNumber: z.string().optional(),
  personalEmail: z.string().email().optional().or(z.literal("")),
  companyEmail: z.string().email().optional().or(z.literal("")),
  gender: z.string().optional(),
  position: z.string().optional(),
  employmentDate: z.string().optional(),
  employmentStatus: z.enum(["Active", "Inactive", "Resigned", "Terminated"]).default("Active"),
});

usersRouter.post("/", requirePermission("user.userManagement.manage"), async (req, res) => {
  const parsed = addUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { employeeNo: data.employeeNo } });
  if (existing) {
    return res.status(409).json({ error: "That Employee No. is already in use." });
  }
  const user = await prisma.user.create({
    data: {
      employeeNo: data.employeeNo,
      lastName: data.lastName,
      firstName: data.firstName,
      middleName: data.middleName || null,
      birthdate: data.birthdate ? new Date(data.birthdate) : null,
      contactNumber: data.contactNumber || null,
      personalEmail: data.personalEmail || null,
      companyEmail: data.companyEmail || null,
      gender: data.gender || null,
      position: data.position || null,
      employmentDate: data.employmentDate ? new Date(data.employmentDate) : null,
      employmentStatus: data.employmentStatus,
      enabled: false,
    },
  });
  res.status(201).json(toSummary(user));
});

const editUserSchema = addUserSchema.partial().omit({ employeeNo: true });

usersRouter.patch("/:id", requirePermission("user.userManagement.manage"), async (req, res) => {
  const parsed = editUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const data = parsed.data;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.middleName !== undefined && { middleName: data.middleName || null }),
      ...(data.birthdate !== undefined && { birthdate: data.birthdate ? new Date(data.birthdate) : null }),
      ...(data.contactNumber !== undefined && { contactNumber: data.contactNumber || null }),
      ...(data.personalEmail !== undefined && { personalEmail: data.personalEmail || null }),
      ...(data.companyEmail !== undefined && { companyEmail: data.companyEmail || null }),
      ...(data.gender !== undefined && { gender: data.gender || null }),
      ...(data.position !== undefined && { position: data.position || null }),
      ...(data.employmentDate !== undefined && {
        employmentDate: data.employmentDate ? new Date(data.employmentDate) : null,
      }),
      ...(data.employmentStatus !== undefined && { employmentStatus: data.employmentStatus }),
    },
  });
  res.json(toSummary(user));
});

// SOP 9-3: enable/disable is a distinct action from editing info, and is
// how offboarding (Section 9.10) is performed -- never delete the record.
usersRouter.patch("/:id/enabled", requirePermission("user.userManagement.manage"), async (req, res) => {
  const schema = z.object({ enabled: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "enabled must be a boolean." });

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Not found." });
  if (!target.username && parsed.data.enabled) {
    return res.status(409).json({
      error: "This user has not completed Request Access yet, so there is nothing to enable.",
    });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { enabled: parsed.data.enabled },
  });
  res.json(toSummary(user));
});

// SOP 9-4: Change Role -- an explicit list of granted permission keys, plus
// the separate, tightly-restricted Mother Account flag.
const roleSchema = z.object({
  permissions: z.array(z.string()),
  isMotherAccount: z.boolean().optional(),
});

usersRouter.patch("/:id/role", requirePermission("user.userManagement.manage"), async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const invalid = parsed.data.permissions.filter((k) => !ALL_PERMISSION_KEYS.includes(k));
  if (invalid.length > 0) {
    return res.status(400).json({ error: "Unknown permission key(s).", invalid });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      permissions: JSON.stringify(parsed.data.permissions),
      ...(parsed.data.isMotherAccount !== undefined && { isMotherAccount: parsed.data.isMotherAccount }),
    },
  });
  res.json({ ...toSummary(user), permissions: JSON.parse(user.permissions) });
});
