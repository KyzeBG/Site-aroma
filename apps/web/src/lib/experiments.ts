"use client";

export type ExperimentAssignment = {
  experiment: string;
  variant: string;
};

export function getOrAssignVariant(experiment: string, variants: string[]) {
  if (typeof window === "undefined") return variants[0] ?? "A";
  const key = `exp:${experiment}`;
  const existing = window.localStorage.getItem(key);
  if (existing && variants.includes(existing)) return existing;
  const picked = variants[Math.floor(Math.random() * variants.length)] ?? variants[0] ?? "A";
  window.localStorage.setItem(key, picked);
  return picked;
}

export function recordExposure(experiment: string, variant: string) {
  if (typeof window === "undefined") return;
  const key = `exp:exposure:${experiment}`;
  const prev = window.localStorage.getItem(key);
  if (prev === variant) return;
  window.localStorage.setItem(key, variant);
}

