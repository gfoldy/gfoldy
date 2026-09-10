import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSummary, buildWeeks, bucketsPresent } from '../src/analytics.ts';
import { dateToStr, mondayOf, addDays } from '../src/dates.ts';
import type { LogSet } from '../src/types.ts';

const mk = (o: Partial<LogSet>): LogSet => ({
  id: o.id ?? Math.random().toString(36), profileId: 'p', date: o.date ?? '2026-01-01',
  exercise: o.exercise ?? 'Bench', muscle: o.muscle ?? 'Chest', setIndex: o.setIndex ?? 0,
  weight: o.weight ?? null, reps: o.reps ?? null, done: o.done ?? true, type: o.type ?? 'work', rir: null,
});

test('computeSummary excludes warm-ups from volume and lifts', () => {
  const logs = [
    mk({ weight: 185, reps: 8, type: 'work' }),
    mk({ weight: 95, reps: 10, type: 'warmup' }),
  ];
  const s = computeSummary(logs);
  assert.equal(s.stats.sets, 1);
  assert.equal(s.stats.volume, 185 * 8);
  assert.equal(s.stats.sessions, 1);
  assert.equal(s.top_lifts.length, 1);
});

test('buildWeeks buckets working sets by Monday-week and muscle', () => {
  const thisMon = mondayOf(new Date());
  const d = dateToStr(addDays(thisMon, 1)); // this week, Tuesday
  const logs = [
    mk({ date: d, muscle: 'Chest', weight: 100, reps: 10 }),
    mk({ date: d, muscle: 'Back', weight: 100, reps: 10, setIndex: 1 }),
  ];
  const weeks = buildWeeks(logs, 4);
  assert.equal(weeks.length, 4);
  const last = weeks[weeks.length - 1]!;
  assert.equal(last.byMuscle['Chest'], 1);
  assert.equal(last.byMuscle['Back'], 1);
  assert.deepEqual(bucketsPresent(weeks), ['Chest', 'Back']);
});
