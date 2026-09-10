// Mesocycle / deload tracking — pure over a config + a reference date.

import type { MesoConfig } from './types.ts';
import { mondayOf, parseDate, todayStr } from './dates.ts';

export interface MesoStatus {
  start: string;
  weeks: number;
  week: number;       // 1-based current week (0 before the block starts)
  deloadDue: boolean; // true on the final week of the block
  done: boolean;      // block finished
  before: boolean;    // reference date is before the block starts
  phase: 'Accumulation' | 'Deload' | 'Block complete' | 'Starts soon';
  wIdx: number;       // raw week index (can be <1 or >weeks)
}

/** Where are we in the block relative to `dateStr`? null when not tracking. */
export function mesoStatus(cfg: MesoConfig | null | undefined, dateStr?: string): MesoStatus | null {
  if (!cfg || !cfg.start) return null;
  const weeks = Math.max(2, Math.min(12, cfg.weeks || 5));
  const startMon = mondayOf(parseDate(cfg.start));
  const curMon = mondayOf(parseDate(dateStr ?? todayStr()));
  const wIdx = Math.round((curMon.getTime() - startMon.getTime()) / (7 * 86400000)) + 1;
  const done = wIdx > weeks;
  const before = wIdx < 1;
  const week = before ? 0 : done ? weeks : wIdx;
  const deloadDue = !done && !before && week === weeks;
  const phase: MesoStatus['phase'] =
    before ? 'Starts soon' : done ? 'Block complete' : deloadDue ? 'Deload' : 'Accumulation';
  return { start: cfg.start, weeks, week, deloadDue, done, before, phase, wIdx };
}
