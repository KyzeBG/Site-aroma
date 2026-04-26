import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export type AdminJwtPayload = { sub: string; email: string };

const secret = process.env.JWT_SECRET ?? "preview_jwt_secret_change_me_please";

export function signAdminToken(payload: AdminJwtPayload) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const cookieToken = (req as any).cookies?.admin_token as string | undefined;
  const token = bearer ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

export function createCsrfToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  const cookieToken = (req as any).cookies?.csrf_token as string | undefined;
  const headerToken = req.header("x-csrf-token") ?? undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: "csrf" });
    return;
  }

  next();
}

