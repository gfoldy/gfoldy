import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeedsSpeeds, chipThinningFactor, interp } from '../src/index.ts';
import type { CalcInput } from '../src/index.ts';

const baseInput = (over: Partial<CalcInput> = {}): CalcInput => ({
  machineKey: 'vmc',
  materialKey: 'alu_6061',
  toolMaterialKey: 'carbide',
  toolTypeKey: 'endmill',
  diameter: 0.25,
  unit: 'in',
  flutes: 3,
  operation: 'roughing',
  aggressiveness: 1,
  chipThinning: true,
  ...over,
});

test('RPM follows the surface-speed formula', () => {
  // 6061 + carbide nominal SFM = mid of [600,1200] = 900; D=0.25.
  // router_pro spans 6000-24000 RPM so the ideal ~13751 is not clamped.
  const r = computeFeedsSpeeds(baseInput({ flutes: 2, machineKey: 'router_pro' }));
  const expectedRpm = Math.round((900 * 12) / (Math.PI * 0.25));
  assert.equal(r.sfm, 900);
  assert.equal(r.rpmClamped, false);
  assert.equal(r.rpm, expectedRpm);
});

test('feed = rpm x chip load x flutes (no thinning at full-ish engagement)', () => {
  const r = computeFeedsSpeeds(baseInput({ flutes: 2, operation: 'slotting' }));
  // slotting -> Ae = D, no chip thinning
  assert.equal(r.thinningApplied, false);
  const expected = Math.round(r.rpm * r.feedPerTooth.in * 2 * 10) / 10;
  assert.ok(Math.abs(r.feedIpm - expected) < 0.2, `${r.feedIpm} vs ${expected}`);
});

test('RPM is capped to the machine spindle max with a warning', () => {
  // hobby router min 8000; a 1" tool in alu wants a low RPM -> floored.
  const r = computeFeedsSpeeds(baseInput({ machineKey: 'router_hobby', diameter: 1.0 }));
  assert.equal(r.rpm, 8000);
  assert.equal(r.rpmFloored, true);
  assert.ok(r.warnings.some((w) => w.includes('minimum')));
});

test('metric diameter input converts correctly', () => {
  const inch = computeFeedsSpeeds(baseInput({ diameter: 0.25, unit: 'in' }));
  const mm = computeFeedsSpeeds(baseInput({ diameter: 6.35, unit: 'mm' }));
  assert.ok(Math.abs(inch.rpm - mm.rpm) <= 1);
});

test('chip thinning raises feed for light stepovers', () => {
  const r = computeFeedsSpeeds(baseInput({ operation: 'finishing', chipThinning: true }));
  assert.equal(r.thinningApplied, true);
  assert.ok(r.thinningFactor > 1);
});

test('power check warns when the cut exceeds available spindle hp', () => {
  // Mini mill (0.5 hp) taking an aggressive slot in tool steel -> over budget.
  const r = computeFeedsSpeeds(baseInput({
    machineKey: 'mini_mill', materialKey: 'tool_steel', operation: 'slotting',
    diameter: 0.5, aggressiveness: 2,
  }));
  assert.ok(r.powerHp != null && r.powerHp > 0.5);
  assert.ok(r.warnings.some((w) => w.includes('hp')));
});

test('deflection is reported only when stick-out is given', () => {
  const without = computeFeedsSpeeds(baseInput());
  assert.equal(without.deflectionIn, null);
  const withStickout = computeFeedsSpeeds(baseInput({ stickout: 1.0 }));
  assert.ok(withStickout.deflectionIn != null && withStickout.deflectionIn > 0);
});

test('drilling returns feed-per-rev and no radial DOC', () => {
  const r = computeFeedsSpeeds(baseInput({ toolTypeKey: 'drill', diameter: 0.5 }));
  assert.equal(r.ap, null);
  assert.equal(r.ae, null);
  assert.ok(r.feedPerRev.in > 0);
});

test('zero / negative diameter is an error', () => {
  assert.ok(computeFeedsSpeeds(baseInput({ diameter: 0 })).error);
  assert.ok(computeFeedsSpeeds(baseInput({ diameter: -1 })).error);
});

test('HSS in hard material warns', () => {
  const r = computeFeedsSpeeds(baseInput({ toolMaterialKey: 'hss', materialKey: 'ss_304' }));
  assert.ok(r.warnings.some((w) => w.toLowerCase().includes('carbide')));
});

test('chipThinningFactor is 1 at/above half engagement and >1 below', () => {
  assert.equal(chipThinningFactor(0.5), 1);
  assert.equal(chipThinningFactor(0.6), 1);
  assert.ok(chipThinningFactor(0.1) > 1);
});

test('tool life is reported and falls as speed rises', () => {
  const conservative = computeFeedsSpeeds(baseInput({ machineKey: 'router_pro', aggressiveness: 0 }));
  const aggressive = computeFeedsSpeeds(baseInput({ machineKey: 'router_pro', aggressiveness: 2 }));
  assert.ok(conservative.toolLifeMin != null && conservative.toolLifeMin > 0);
  assert.ok(aggressive.toolLifeMin != null && aggressive.toolLifeMin > 0);
  // Pushing harder (higher surface speed) shortens Taylor tool life.
  assert.ok(aggressive.toolLifeMin! < conservative.toolLifeMin!);
});

test('exotic materials wear tools faster than aluminium at nominal', () => {
  const alu = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', materialKey: 'alu_6061', aggressiveness: 1 }));
  const ti = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', materialKey: 'titanium', aggressiveness: 1 }));
  assert.ok(ti.toolLifeMin! < alu.toolLifeMin!);
});

test('cost per volume needs a cost input; job cost needs a volume', () => {
  const noCost = computeFeedsSpeeds(baseInput({ machineKey: 'vmc' }));
  assert.equal(noCost.costPerCuin, null);
  assert.equal(noCost.jobCost, null);

  const withRate = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', machineRate: 75 }));
  assert.ok(withRate.costPerCuin != null && withRate.costPerCuin > 0);
  assert.equal(withRate.jobTimeMin, null); // no volume yet

  const job = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', machineRate: 75, toolPrice: 40, removeVolume: 2 }));
  assert.ok(job.jobTimeMin != null && job.jobTimeMin > 0);
  assert.ok(job.jobCost != null && job.jobCost > 0);
  assert.ok(job.toolWearPct != null && job.toolWearPct > 0);
});

test('tool price raises cost per volume above machine-only cost', () => {
  const rateOnly = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', machineRate: 75 }));
  const rateAndTool = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', machineRate: 75, toolPrice: 60 }));
  assert.ok(rateAndTool.costPerCuin! > rateOnly.costPerCuin!);
});

test('job time is independent of cost inputs', () => {
  const a = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', removeVolume: 3 }));
  const b = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', removeVolume: 3, machineRate: 90 }));
  assert.ok(a.jobTimeMin != null && b.jobTimeMin != null);
  assert.equal(a.jobTimeMin, b.jobTimeMin);
  assert.equal(a.jobCost, null);
  assert.ok(b.jobCost != null);
});

test('interp clamps at the ends', () => {
  const table = [[0, 0], [1, 10]] as const;
  assert.equal(interp(table, -5), 0);
  assert.equal(interp(table, 5), 10);
  assert.equal(interp(table, 0.5), 5);
});
