import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";

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

