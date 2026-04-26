import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  SETTINGS_ENCRYPTION_KEY: z.string().min(32),

  ENABLE_MOCK_PAYMENTS: z
    .string()
    .default("true")
    .transform((v) => v === "true")
});

export const env = envSchema.parse(process.env);

