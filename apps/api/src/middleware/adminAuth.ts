import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AdminJwtPayload = {
  sub: string;
  email: string;
};

export type AuthedAdminRequest = Request & {
  admin?: AdminJwtPayload;
};

export function signAdminToken(payload: AdminJwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function requireAdminAuth(
  req: AuthedAdminRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const cookieToken = (req as any).cookies?.admin_token as string | undefined;
  const token = bearer ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

