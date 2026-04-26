export function clampInt(n: number) {
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function sumCents(values: number[]) {
  return values.reduce((acc, v) => acc + clampInt(v), 0);
}

