import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  e1rm, parseRepRange, isWorking, isCompleted, setTagShort, suggestNext, lastSession,
} from '../src/training.ts';
import type { LogSet } from '../src/types.ts';

const mk = (o: Partial<LogSet>): LogSet => ({
  id: o.id ?? 'x', profileId: 'p', date: o.date ?? '2026-01-01', exercise: o.exercise ?? 'Bench',
  muscle: o.muscle ?? 'Chest', setIndex: o.setIndex ?? 0, weight: o.weight ?? null, reps: o.reps ?? null,
  done: o.done ?? false, type: o.type ?? 'work', rir: o.rir ?? null,
});

test('e1rm uses Epley and rounds', () => {
  assert.equal(e1rm(100, 0), 100);
  assert.equal(e1rm(100, 10), 133); // 100*(1+10/30)=133.3
});

test('parseRepRange handles ranges, singles and junk', () => {
  assert.deepEqual(parseRepRange('8-10'), { low: 8, high: 10 });
  assert.deepEqual(parseRepRange('5'), { low: 5, high: 5 });
  assert.deepEqual(parseRepRange('10/leg'), { low: 10, high: 10 });
  assert.equal(parseRepRange('none'), null);
});

test('isWorking excludes warm-ups and undone sets; isCompleted counts any done', () => {
  assert.equal(isWorking(mk({ done: true, type: 'work' })), true);
  assert.equal(isWorking(mk({ done: true, type: 'warmup' })), false);
  assert.equal(isWorking(mk({ done: false, type: 'work' })), false);
  assert.equal(isCompleted(mk({ done: true, type: 'warmup' })), true);
});

test('setTagShort prefers type badge, then RIR, then dot', () => {
  assert.equal(setTagShort(mk({ type: 'drop' })), 'DROP');
  assert.equal(setTagShort(mk({ type: 'work', rir: 2 })), '@2');
  assert.equal(setTagShort(mk({ type: 'work', rir: null })), '·');
});

test('lastSession returns the most recent prior working session and its top set', () => {
  const logs = [
    mk({ date: '2026-01-01', weight: 185, reps: 8, done: true }),
    mk({ date: '2026-01-08', weight: 190, reps: 6, done: true, setIndex: 0 }),
    mk({ date: '2026-01-08', weight: 190, reps: 8, done: true, setIndex: 1 }),
  ];
  const ls = lastSession(logs, 'Bench', '2026-01-15');
  assert.equal(ls?.date, '2026-01-08');
  assert.equal(ls?.sets.length, 2);
  assert.deepEqual(ls?.top, { weight: 190, reps: 8 });
});

test('suggestNext adds weight at top of range, else chases reps', () => {
  const logs = [mk({ date: '2026-01-01', weight: 100, reps: 10, done: true })];
  const up = suggestNext(logs, 'Bench', '8-10', '2026-01-08', 'lb');
  assert.equal(up?.up, true);
  assert.equal(up?.weight, 105);

  const logs2 = [mk({ date: '2026-01-01', weight: 100, reps: 8, done: true })];
  const chase = suggestNext(logs2, 'Bench', '8-10', '2026-01-08', 'lb');
  assert.equal(chase?.up, false);
  assert.equal(chase?.weight, 100);

  assert.equal(suggestNext([], 'Bench', '8-10', '2026-01-08', 'lb'), null);
});
