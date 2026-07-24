import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const TOKEN_TTL = "8h";

export interface AuthTokenPayload {
  userId: string;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

export async function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, 10);
}

export async function compareSecret(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

export const AUTH_COOKIE_NAME = "lhike_erp_token";
