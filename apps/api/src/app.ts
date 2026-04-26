import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.APP_ORIGIN,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use("/api", publicRouter);
  app.use("/api/admin", adminRouter);

  app.use(errorHandler);
  return app;
}

