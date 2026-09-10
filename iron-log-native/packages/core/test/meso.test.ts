import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesoStatus } from '../src/meso.ts';

// Block: Monday 2026-08-24, 4 weeks (week 4 is the deload).
const cfg = { start: '2026-08-24', weeks: 4 };

test('returns null when not tracking', () => {
  assert.equal(mesoStatus(null, '2026-09-01'), null);
  assert.equal(mesoStatus({ start: '', weeks: 4 }, '2026-09-01'), null);
});

test('week index within the block', () => {
  assert.equal(mesoStatus(cfg, '2026-08-24')?.week, 1);
  assert.equal(mesoStatus(cfg, '2026-08-31')?.week, 2);
  assert.equal(mesoStatus(cfg, '2026-09-07')?.week, 3);
  assert.equal(mesoStatus(cfg, '2026-09-07')?.phase, 'Accumulation');
});

test('final week flags the deload', () => {
  const s = mesoStatus(cfg, '2026-09-14');
  assert.equal(s?.week, 4);
  assert.equal(s?.deloadDue, true);
  assert.equal(s?.phase, 'Deload');
});

test('past the block is "done"', () => {
  const s = mesoStatus(cfg, '2026-09-28');
  assert.equal(s?.done, true);
  assert.equal(s?.deloadDue, false);
  assert.equal(s?.phase, 'Block complete');
});

test('before the block starts', () => {
  const s = mesoStatus(cfg, '2026-08-17');
  assert.equal(s?.before, true);
  assert.equal(s?.week, 0);
  assert.equal(s?.phase, 'Starts soon');
});

test('length is clamped to 2..12', () => {
  assert.equal(mesoStatus({ start: '2026-08-24', weeks: 99 }, '2026-08-24')?.weeks, 12);
  assert.equal(mesoStatus({ start: '2026-08-24', weeks: 1 }, '2026-08-24')?.weeks, 2);
});
