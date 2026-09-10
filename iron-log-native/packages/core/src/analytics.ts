// Weekly aggregations and profile summaries — the engine behind the Progress
// tab and the cloud leaderboards. Pure functions over a log array.

import type { LogSet } from './types.ts';
import { addDays, dateToStr, mondayOf, parseDate, todayStr, fmtShort } from './dates.ts';
import { isWorking, e1rm } from './training.ts';
import { muscleBucket, MUSCLE_ORDER } from './volume.ts';

export interface WeekAgg {
  start: Date;
  label: string;
  sets: number;
  byMuscle: Record<string, number>;
  vol: number;
  dates: Set<string>;
}

/** Build per-week aggregates for a range: a number of weeks, or 'all'. */
export function buildWeeks(working: LogSet[], range: number | 'all'): WeekAgg[] {
  const thisMon = mondayOf(new Date());
  let n = typeof range === 'number' ? range : 8;
  if (range === 'all') {
    const first = working.reduce((m, l) => (l.date < m ? l.date : m), todayStr());
    const firstMon = mondayOf(parseDate(first));
    n = Math.round((thisMon.getTime() - firstMon.getTime()) / (7 * 86400000)) + 1;
    n = Math.min(Math.max(n, 4), 26);
  }
  const weeks: WeekAgg[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = addDays(thisMon, -7 * i);
    const s = dateToStr(start), e = dateToStr(addDays(start, 7));
    const inWk = working.filter((l) => l.date >= s && l.date < e);
    const byMuscle: Record<string, number> = {};
    inWk.forEach((l) => { const b = muscleBucket(l.muscle); byMuscle[b] = (byMuscle[b] ?? 0) + 1; });
    weeks.push({
      start, label: fmtShort(s), sets: inWk.length, byMuscle,
      vol: inWk.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0),
      dates: new Set(inWk.map((l) => l.date)),
    });
  }
  return weeks;
}

/** Muscle buckets present across the weeks, in the fixed palette order. */
export function bucketsPresent(weeks: WeekAgg[]): string[] {
  const seen = new Set<string>();
  weeks.forEach((w) => Object.keys(w.byMuscle).forEach((m) => seen.add(m)));
  const ordered = MUSCLE_ORDER.filter((m) => seen.has(m));
  if (seen.has('Other')) ordered.push('Other');
  return ordered;
}

export interface TopLift { exercise: string; weight: number; reps: number; date: string; e1rm: number; }
export interface ProfileSummary {
  stats: { sessions: number; sets: number; volume: number };
  top_lifts: TopLift[];
  lifts: Record<string, TopLift>;
}

/** Denormalised profile summary for the People/Ranks tabs. */
export function computeSummary(logs: LogSet[]): ProfileSummary {
  const c = logs.filter(isWorking);
  const sessions = new Set(c.map((l) => l.date)).size;
  const sets = c.length;
  const volume = Math.round(c.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0));
  const lifts: Record<string, TopLift> = {};
  c.filter((l) => (l.weight ?? 0) > 0 && (l.reps ?? 0) > 0).forEach((l) => {
    const e = e1rm(l.weight!, l.reps!);
    const cur = lifts[l.exercise];
    if (!cur || e > cur.e1rm) {
      lifts[l.exercise] = { exercise: l.exercise, weight: l.weight!, reps: l.reps!, date: l.date, e1rm: e };
    }
  });
  const top_lifts = Object.values(lifts).sort((a, b) => b.e1rm - a.e1rm).slice(0, 4);
  return { stats: { sessions, sets, volume }, top_lifts, lifts };
}
