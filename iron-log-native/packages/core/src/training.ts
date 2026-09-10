// Per-exercise training logic: working-set rules, e1RM, and double progression.

import type { LogSet, SetType, Unit } from './types.ts';

/** Set-type metadata: [key, label, short badge]. */
export const SET_TYPES: [SetType, string, string][] = [
  ['work', 'Working set', ''],
  ['warmup', 'Warm-up', 'WU'],
  ['drop', 'Drop set', 'DROP'],
  ['failure', 'To failure', 'F'],
  ['restpause', 'Rest-pause', 'RP'],
  ['myo', 'Myo-reps', 'MYO'],
];

/** A completed set (counts for the Today badges). */
export const isCompleted = (l: Pick<LogSet, 'done'>): boolean => !!l.done;

/** A "working set" — what hypertrophy analytics count. Warm-ups are excluded. */
export const isWorking = (l: Pick<LogSet, 'done' | 'type'>): boolean =>
  !!l.done && l.type !== 'warmup';

/** Short badge for a set: its type tag, else "@rir", else a neutral dot. */
export function setTagShort(l: Pick<LogSet, 'type' | 'rir'>): string {
  if (l.type && l.type !== 'work') {
    const found = SET_TYPES.find((s) => s[0] === l.type);
    if (found && found[2]) return found[2];
  }
  return l.rir != null ? '@' + l.rir : '·';
}

/** Estimated 1-rep max (Epley) — compares lifts across rep ranges. */
export const e1rm = (w: number, r: number): number => Math.round(w * (1 + r / 30));

export interface RepRange { low: number; high: number; }

/** Parse "8-10" / "5" / "10/leg" into a numeric range. */
export function parseRepRange(reps: string | null | undefined): RepRange | null {
  const m = String(reps ?? '').match(/(\d+)\s*(?:[-–]\s*(\d+))?/);
  if (!m) return null;
  const low = parseInt(m[1]!, 10);
  return { low, high: m[2] ? parseInt(m[2], 10) : low };
}

export const roundHalf = (w: number): number => Math.round(w * 2) / 2;

export interface SessionSummary {
  date: string;
  sets: { weight: number; reps: number }[];
  top: { weight: number; reps: number } | null;
}

/** The most recent PRIOR session for an exercise (working sets only). */
export function lastSession(
  logs: LogSet[], exName: string, beforeDate: string,
): SessionSummary | null {
  const prior = logs.filter(
    (l) => l.exercise === exName && l.date < beforeDate && isWorking(l) && (l.weight || l.reps),
  );
  if (!prior.length) return null;
  const date = prior.reduce((m, l) => (l.date > m ? l.date : m), '0000-00-00');
  const sets = prior
    .filter((l) => l.date === date)
    .sort((a, b) => a.setIndex - b.setIndex)
    .map((l) => ({ weight: l.weight || 0, reps: l.reps || 0 }));
  const top = sets
    .filter((s) => s.weight > 0 && s.reps > 0)
    .reduce<{ weight: number; reps: number } | null>(
      (b, s) => (!b || e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b), null,
    );
  return { date, sets, top };
}

export interface Suggestion { weight: number; hint: string; up: boolean; }

/** Double progression: top of the rep range → add weight; else chase reps. */
export function suggestNext(
  logs: LogSet[], exName: string, reps: string, beforeDate: string, unit: Unit,
): Suggestion | null {
  const ls = lastSession(logs, exName, beforeDate);
  if (!ls || !ls.top) return null;
  const rr = parseRepRange(reps);
  const inc = unit === 'kg' ? 2.5 : 5;
  const W = ls.top.weight, R = ls.top.reps;
  if (W <= 0) return null;
  if (rr && R >= rr.high) return { weight: roundHalf(W + inc), hint: `${rr.low}–${rr.high} reps`, up: true };
  if (rr) return { weight: W, hint: `aim ${Math.min(R + 1, rr.high)}–${rr.high} reps`, up: false };
  return { weight: W, hint: `beat ${R} reps`, up: false };
}
