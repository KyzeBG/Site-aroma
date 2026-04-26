import { z } from "zod";

export const apiBaseUrl =
  typeof window === "undefined"
    ? process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  schema?: z.ZodType<T>
): Promise<T> {
  const csrf = getCookie("csrf_token");
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...(init?.headers ?? {})
    },
    cache: init?.cache ?? "no-store",
    credentials: "include"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as unknown;
  return schema ? schema.parse(json) : (json as T);
}

