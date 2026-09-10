// Progression plan + lagging body-part flags — the "add a set when a muscle
// plateaus" engine. Pure over the weekly aggregates.

import type { WeekAgg } from './analytics.ts';
import { targetFor, volumeZone } from './volume.ts';

export type PlanClass = 'de' | 'high' | 'under' | 'add' | 'ok';

export interface PlanRow {
  m: string;
  cur: number;
  lo: number;
  hi: number;
  rec: string;
  cls: PlanClass;
  next: number;
  nextTxt: string;
}

const setsIn = (w: WeekAgg | undefined, m: string): number => (w ? w.byMuscle[m] ?? 0 : 0);

/** Per-muscle recommendation from the last three weeks of working sets. */
export function progressionPlan(
  weeks: WeekAgg[], buckets: string[], opts: { deload?: boolean } = {},
): PlanRow[] {
  const deload = !!opts.deload;
  const last = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  const prev2 = weeks[weeks.length - 3];
  return buckets.map((m) => {
    const [lo, hi] = targetFor(m);
    const cur = setsIn(last, m), p1 = setsIn(prev, m), p2 = setsIn(prev2, m);
    const flat = cur <= p1 && (prev2 ? p1 <= p2 : true);
    let rec: string, cls: PlanClass, next: number;
    if (deload) { rec = 'Deload — pull volume back'; cls = 'de'; next = Math.max(2, Math.round(lo / 2)); }
    else if (cur > hi) { rec = 'High volume — hold & recover'; cls = 'high'; next = hi; }
    else if (cur < lo) { rec = 'Below minimum — build up'; cls = 'under'; next = Math.min(cur + 2, lo); }
    else if (cur >= hi) { rec = 'Near the ceiling — hold, then deload'; cls = 'high'; next = hi; }
    else if (flat) { rec = 'Plateaued — add a set'; cls = 'add'; next = Math.min(cur + 1, hi); }
    else { rec = 'Progressing — hold this volume'; cls = 'ok'; next = cur; }
    const nextTxt = next === cur ? `keep ${cur}/wk` : `${next > cur ? '→ ' : '↓ '}${next}/wk`;
    volumeZone(cur, m); // (zone kept available for callers; classification above is intentional)
    return { m, cur, lo, hi, rec, cls, next, nextTxt };
  });
}

export interface LaggingRow { m: string; avg: number; lo: number; gap: number; }

/** Muscles trained recently but averaging below their weekly minimum. */
export function laggingMuscles(weeks: WeekAgg[], buckets: string[]): LaggingRow[] {
  const recent = weeks.slice(-3);
  if (!recent.length) return [];
  return buckets
    .map((m) => {
      const vals = recent.map((w) => w.byMuscle[m] ?? 0);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const [lo] = targetFor(m);
      return { m, avg: Math.round(avg * 10) / 10, lo, gap: lo - avg };
    })
    .filter((x) => x.gap > 0.5)
    .sort((a, b) => b.gap - a.gap);
}
