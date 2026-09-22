// @feedspeed/core — unit conversions and small numeric helpers.

export const IN_PER_MM = 1 / 25.4;
export const MM_PER_IN = 25.4;
export const SFM_PER_MPM = 1 / 0.3048; // 1 m/min = 3.281 SFM
export const CC_PER_CUIN = 16.387064;

export function round(x: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
}

/** Linear interpolation over a sorted [[x,y]...] table, clamped at the ends. */
export function interp(table: ReadonlyArray<readonly [number, number]>, x: number): number {
  const first = table[0];
  const last = table[table.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const cur = table[i];
    const prev = table[i - 1];
    if (!cur || !prev) break;
    if (x <= cur[0]) {
      const t = (x - prev[0]) / (cur[0] - prev[0]);
      return prev[1] + t * (cur[1] - prev[1]);
    }
  }
  return last[1];
}

/** Build a dual imperial/metric value from an inch measurement. */
export function dual(inches: number, dpIn = 3): { in: number; mm: number } {
  return { in: round(inches, dpIn), mm: round(inches * MM_PER_IN, Math.max(0, dpIn - 1)) };
}
