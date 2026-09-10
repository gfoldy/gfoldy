import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressionPlan, laggingMuscles } from '../src/progression.ts';
import type { WeekAgg } from '../src/analytics.ts';

const wk = (byMuscle: Record<string, number>): WeekAgg => ({
  start: new Date(), label: '', sets: 0, byMuscle, vol: 0, dates: new Set(),
});

test('plateaued in-zone muscle gets "add a set"', () => {
  // Chest zone is [10,20]. Flat at 12 for 3 weeks, in zone -> add a set.
  const weeks = [wk({ Chest: 12 }), wk({ Chest: 12 }), wk({ Chest: 12 })];
  const [row] = progressionPlan(weeks, ['Chest']);
  assert.equal(row?.rec, 'Plateaued — add a set');
  assert.equal(row?.cls, 'add');
  assert.equal(row?.next, 13);
});

test('rising in-zone muscle holds volume', () => {
  const weeks = [wk({ Chest: 10 }), wk({ Chest: 11 }), wk({ Chest: 13 })];
  const [row] = progressionPlan(weeks, ['Chest']);
  assert.equal(row?.cls, 'ok');
});

test('below minimum builds up', () => {
  const weeks = [wk({ Biceps: 3 }), wk({ Biceps: 3 }), wk({ Biceps: 3 })];
  const [row] = progressionPlan(weeks, ['Biceps']); // Biceps [8,16]
  assert.equal(row?.cls, 'under');
});

test('above ceiling recommends recover', () => {
  const weeks = [wk({ Chest: 24 })];
  const [row] = progressionPlan(weeks, ['Chest']);
  assert.equal(row?.cls, 'high');
});

test('deload overrides everything', () => {
  const weeks = [wk({ Chest: 12 }), wk({ Chest: 12 }), wk({ Chest: 12 })];
  const [row] = progressionPlan(weeks, ['Chest'], { deload: true });
  assert.equal(row?.cls, 'de');
  assert.ok(row!.next < row!.cur);
});

test('laggingMuscles flags recent under-minimum groups, worst first', () => {
  const weeks = [
    wk({ Chest: 12, Biceps: 2, Calves: 4 }),
    wk({ Chest: 12, Biceps: 2, Calves: 4 }),
    wk({ Chest: 12, Biceps: 2, Calves: 4 }),
  ];
  const lag = laggingMuscles(weeks, ['Chest', 'Biceps', 'Calves']);
  const names = lag.map((x) => x.m);
  assert.ok(!names.includes('Chest'));       // 12 >= 10 min
  assert.deepEqual(names, ['Biceps', 'Calves']); // Biceps gap 6 > Calves gap 4
});
