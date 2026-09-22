import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFeedsSpeeds, chipThinningFactor, interp,
  effectiveCoating, applyOutcome, applyObservedRatio, DEFAULT_CALIBRATION,
  scallopFromStepover, stepoverFromScallop, effectiveBallDiameter, finishGrade,
  computeTapping, THREADS,
} from '../src/index.ts';
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

test('feed & depth shorten life even when speed is unchanged (capped RPM)', () => {
  // On the VMC, a 1/4" tool in 6061 wants > 12000 RPM at both nominal and
  // aggressive, so both cap at 12000 -> identical realized surface speed.
  // The only difference left is feed & depth, which must still cut tool life.
  const nominal = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', aggressiveness: 1 }));
  const aggressive = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', aggressiveness: 2 }));
  assert.equal(nominal.rpmClamped, true);
  assert.equal(aggressive.rpmClamped, true);
  assert.equal(nominal.rpm, aggressive.rpm); // same speed
  assert.ok(aggressive.toolLifeMin! < nominal.toolLifeMin!); // feed+depth still bite
});

test('lighter radial engagement (finishing) gives longer life than slotting', () => {
  const slot = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', operation: 'slotting' }));
  const finish = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', operation: 'finishing' }));
  assert.ok(finish.toolLifeMin! > slot.toolLifeMin!);
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

test('a coating multiplies tool life', () => {
  const uncoated = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', materialKey: 'steel_mild', coatingKey: 'none' }));
  const coated = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', materialKey: 'steel_mild', coatingKey: 'altin' }));
  assert.ok(coated.toolLifeMin! > uncoated.toolLifeMin!);
  assert.equal(coated.coatingLifeMult, 2.8);
});

test('coating benefit is material-aware', () => {
  // AlTiN helps steel a lot but barely helps aluminium.
  assert.equal(effectiveCoating('altin', 'Ferrous').mult, 2.8);
  assert.equal(effectiveCoating('altin', 'Non-ferrous').mult, 1.0);
  // Diamond is great on non-ferrous but must warn (and cut life) on steel.
  assert.equal(effectiveCoating('diamond', 'Non-ferrous').mult, 5.0);
  const badDiamond = effectiveCoating('diamond', 'Ferrous');
  assert.ok(badDiamond.mult < 1 && badDiamond.warning);
});

test('diamond on steel warns and shortens life in a full calc', () => {
  const r = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', materialKey: 'steel_mild', coatingKey: 'diamond' }));
  assert.ok(r.warnings.some((w) => w.toLowerCase().includes('diamond')));
  const plain = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', materialKey: 'steel_mild', coatingKey: 'none' }));
  assert.ok(r.toolLifeMin! < plain.toolLifeMin!);
});

test('calibration multiplier scales tool life and cost', () => {
  const base = computeFeedsSpeeds(baseInput({ machineKey: 'vmc' }));
  const tuned = computeFeedsSpeeds(baseInput({ machineKey: 'vmc', lifeCalibration: 0.5 }));
  assert.ok(Math.abs(tuned.toolLifeMin! - base.toolLifeMin! * 0.5) < 0.5);
  assert.equal(tuned.lifeCalibration, 0.5);
});

test('logging outcomes nudges the calibration factor the right way', () => {
  let cal = DEFAULT_CALIBRATION;
  const start = cal.factor;
  cal = applyOutcome(cal, 'broke');       // life shorter than predicted
  assert.ok(cal.factor < start);
  assert.equal(cal.samples, 2);
  // Repeated "broke" keeps pulling it down, but stays clamped above the floor.
  for (let i = 0; i < 20; i++) cal = applyOutcome(cal, 'broke');
  assert.ok(cal.factor >= 0.25);

  let up = applyOutcome(DEFAULT_CALIBRATION, 'long'); // lasted longer than predicted
  assert.ok(up.factor > 1);
});

test('applyObservedRatio moves toward an exact ratio and ignores nonsense', () => {
  const moved = applyObservedRatio(DEFAULT_CALIBRATION, 0.5);
  assert.ok(moved.factor < 1);
  const ignored = applyObservedRatio(DEFAULT_CALIBRATION, -3);
  assert.equal(ignored.factor, DEFAULT_CALIBRATION.factor);
});

test('ball-nose scallop and stepover are exact inverses', () => {
  const dia = 0.25; // 1/4" ball
  const stepover = 0.02;
  const h = scallopFromStepover(dia, stepover);
  assert.ok(h > 0 && h < dia / 2);
  const back = stepoverFromScallop(dia, h);
  assert.ok(Math.abs(back - stepover) < 1e-9);
});

test('tighter stepover gives a smaller scallop', () => {
  const dia = 0.25;
  assert.ok(scallopFromStepover(dia, 0.01) < scallopFromStepover(dia, 0.04));
});

test('scallop caps at the ball radius for a stepover >= diameter', () => {
  assert.equal(scallopFromStepover(0.25, 0.25), 0.125);
  assert.equal(scallopFromStepover(0.25, 1.0), 0.125);
});

test('effective ball diameter is smaller than nominal at shallow depth and equals D at r', () => {
  assert.ok(effectiveBallDiameter(0.25, 0.01) < 0.25);
  assert.ok(Math.abs(effectiveBallDiameter(0.25, 0.125) - 0.25) < 1e-9); // Ap = r -> full D
});

test('finish grade sharpens as scallop shrinks', () => {
  assert.equal(finishGrade(0.0001).grade, 'mirror');
  assert.equal(finishGrade(0.003).grade, 'visible');
  assert.equal(finishGrade(0.010).grade, 'rough');
});

test('tap drill for 1/4-20 @ 75% matches the #7 drill (0.201")', () => {
  const t = THREADS.find((x) => x.key === '1/4-20')!;
  const r = computeTapping({ majorIn: t.majorIn, pitchIn: t.pitchIn, pctThread: 75, materialKey: 'alu_6061', machineKey: 'vmc' });
  assert.ok(Math.abs(r.tapDrill.in - 0.201) < 0.001, `got ${r.tapDrill.in}`);
  assert.equal(r.tpi, 20);
});

test('tap drill for M6 × 1.0 @ 75% is ~5.0 mm', () => {
  const t = THREADS.find((x) => x.key === 'M6 × 1.0')!;
  const r = computeTapping({ majorIn: t.majorIn, pitchIn: t.pitchIn, pctThread: 75, materialKey: 'steel_mild', machineKey: 'vmc' });
  assert.ok(Math.abs(r.tapDrill.mm - 5.0) < 0.1, `got ${r.tapDrill.mm}`);
});

test('tapping feed is locked to the pitch (feed = rpm × pitch)', () => {
  const t = THREADS.find((x) => x.key === '1/4-20')!;
  const r = computeTapping({ majorIn: t.majorIn, pitchIn: t.pitchIn, pctThread: 75, materialKey: 'alu_6061', machineKey: 'vmc' });
  assert.ok(Math.abs(r.feedIpm - r.rpm * t.pitchIn) < 0.11);
  assert.ok(Math.abs(r.feedPerRev.in - t.pitchIn) < 1e-6);
});

test('a higher %thread makes a smaller tap-drill hole and warns past ~80%', () => {
  const t = THREADS.find((x) => x.key === '1/4-20')!;
  const lo = computeTapping({ majorIn: t.majorIn, pitchIn: t.pitchIn, pctThread: 65, materialKey: 'alu_6061', machineKey: 'vmc' });
  const hi = computeTapping({ majorIn: t.majorIn, pitchIn: t.pitchIn, pctThread: 85, materialKey: 'alu_6061', machineKey: 'vmc' });
  assert.ok(hi.tapDrill.in < lo.tapDrill.in);
  assert.ok(hi.warnings.some((w) => w.toLowerCase().includes('thread')));
});

test('tapping runs slower in hard material than soft', () => {
  const t = THREADS.find((x) => x.key === '1/4-20')!;
  const soft = computeTapping({ majorIn: t.majorIn, pitchIn: t.pitchIn, pctThread: 75, materialKey: 'alu_6061', machineKey: 'vmc' });
  const hard = computeTapping({ majorIn: t.majorIn, pitchIn: t.pitchIn, pctThread: 75, materialKey: 'ss_304', machineKey: 'vmc' });
  assert.ok(hard.rpm < soft.rpm);
});

test('computeFeedsSpeeds refuses a tap (uses the tapping panel)', () => {
  const r = computeFeedsSpeeds(baseInput({ toolTypeKey: 'tap' }));
  assert.ok(r.error);
});

test('interp clamps at the ends', () => {
  const table = [[0, 0], [1, 10]] as const;
  assert.equal(interp(table, -5), 0);
  assert.equal(interp(table, 5), 10);
  assert.equal(interp(table, 0.5), 5);
});
