import type { Request, Response, NextFunction } from "express";
import { AUTH_COOKIE_NAME, verifyToken } from "../auth.js";
import { prisma } from "../db.js";
import { isMotherAccountKey } from "../permissions.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string | null;
        permissions: string[];
        isMotherAccount: boolean;
        enabled: boolean;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not signed in." });
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.enabled) {
      return res.status(401).json({ error: "Account is not enabled." });
    }
    req.user = {
      id: user.id,
      username: user.username,
      permissions: JSON.parse(user.permissions) as string[],
      isMotherAccount: user.isMotherAccount,
      enabled: user.enabled,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

/**
 * Mother Account (Module 9, Section 9.13) bypasses granular permission
 * checks entirely -- it is the documented super-admin grant.
 */
export function requirePermission(permissionKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not signed in." });
    }
    if (req.user.isMotherAccount) {
      return next();
    }
    if (req.user.permissions.includes(permissionKey) || isMotherAccountKey(permissionKey)) {
      return next();
    }
    return res.status(403).json({ error: `Missing permission: ${permissionKey}` });
  };
}
