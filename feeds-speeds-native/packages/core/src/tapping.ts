// @feedspeed/core — tapping (cutting internal threads on a mill).
//
// Three things a tapping calc must get right:
//   1. Tap-drill size — the hole to drill before tapping, from the thread's
//      major diameter, pitch and the % thread engagement you want:
//        hole = major - (%thread × pitch) / 76.98
//      (76.98 is the standard constant that ties % thread to the minor
//      diameter; e.g. 1/4-20 @ 75% -> 0.201", which is the #7 drill.)
//   2. Speed — tapping runs much slower than drilling; RPM from a per-material
//      tapping surface speed.
//   3. Feed is LOCKED to the pitch — the tap advances exactly one pitch per
//      revolution, so feed = RPM × pitch. This is non-negotiable.

import type { DualValue } from './types.ts';
import { MACHINES, MATERIALS } from './data.ts';
import { IN_PER_MM, MM_PER_IN, round, dual } from './units.ts';

// Conservative HSS-tap surface speeds (SFM) by material class.
export const TAP_SFM_BY_CLASS: Record<string, number> = {
  soft: 70,
  medium: 40,
  hard: 20,
};

export interface Thread {
  key: string;
  label: string;
  group: string;
  majorIn: number;
  pitchIn: number;
}

// Build metric (major & pitch given in mm) and inch (major in inch, pitch=1/TPI).
const metric = (key: string, group: string, majorMm: number, pitchMm: number): Thread => ({
  key, group, label: key, majorIn: majorMm * IN_PER_MM, pitchIn: pitchMm * IN_PER_MM,
});
const inch = (key: string, group: string, majorIn: number, tpi: number): Thread => ({
  key, group, label: key, majorIn, pitchIn: 1 / tpi,
});

export const THREADS: Thread[] = [
  metric('M3 × 0.5', 'Metric coarse', 3, 0.5),
  metric('M4 × 0.7', 'Metric coarse', 4, 0.7),
  metric('M5 × 0.8', 'Metric coarse', 5, 0.8),
  metric('M6 × 1.0', 'Metric coarse', 6, 1.0),
  metric('M8 × 1.25', 'Metric coarse', 8, 1.25),
  metric('M10 × 1.5', 'Metric coarse', 10, 1.5),
  metric('M12 × 1.75', 'Metric coarse', 12, 1.75),
  metric('M16 × 2.0', 'Metric coarse', 16, 2.0),
  metric('M20 × 2.5', 'Metric coarse', 20, 2.5),

  metric('M8 × 1.0', 'Metric fine', 8, 1.0),
  metric('M10 × 1.25', 'Metric fine', 10, 1.25),
  metric('M12 × 1.25', 'Metric fine', 12, 1.25),

  inch('#4-40', 'Unified UNC', 0.112, 40),
  inch('#6-32', 'Unified UNC', 0.138, 32),
  inch('#8-32', 'Unified UNC', 0.164, 32),
  inch('#10-24', 'Unified UNC', 0.190, 24),
  inch('1/4-20', 'Unified UNC', 0.25, 20),
  inch('5/16-18', 'Unified UNC', 0.3125, 18),
  inch('3/8-16', 'Unified UNC', 0.375, 16),
  inch('1/2-13', 'Unified UNC', 0.5, 13),
  inch('5/8-11', 'Unified UNC', 0.625, 11),
  inch('3/4-10', 'Unified UNC', 0.75, 10),

  inch('#10-32', 'Unified UNF', 0.190, 32),
  inch('1/4-28', 'Unified UNF', 0.25, 28),
  inch('5/16-24', 'Unified UNF', 0.3125, 24),
  inch('3/8-24', 'Unified UNF', 0.375, 24),
  inch('1/2-20', 'Unified UNF', 0.5, 20),
];

const THREAD_CONST = 76.98; // ties % thread to hole diameter

export interface TapInput {
  majorIn: number;
  pitchIn: number;
  pctThread: number;     // desired thread engagement, e.g. 75
  materialKey: string;
  machineKey: string;
}

export interface TapResult {
  error?: string;
  warnings: string[];
  notes: string[];
  major: DualValue;
  pitch: DualValue;
  tpi: number | null;    // for inch threads, informational
  pctThread: number;
  tapDrill: DualValue;
  sfm: number;
  rpm: number;
  rpmClamped: boolean;
  rpmFloored: boolean;
  feedIpm: number;
  feedMmpm: number;
  feedPerRev: DualValue;
}

export function computeTapping(input: TapInput): TapResult {
  const warnings: string[] = [];
  const notes: string[] = [];
  const material = MATERIALS[input.materialKey];
  const machine = MACHINES[input.machineKey] ?? MACHINES.custom!;
  const empty = { in: 0, mm: 0 };

  const err = (msg: string): TapResult => ({
    error: msg, warnings, notes,
    major: empty, pitch: empty, tpi: null, pctThread: input.pctThread,
    tapDrill: empty, sfm: 0, rpm: 0, rpmClamped: false, rpmFloored: false,
    feedIpm: 0, feedMmpm: 0, feedPerRev: empty,
  });

  if (!material) return err('Unknown material.');
  if (!(input.majorIn > 0) || !(input.pitchIn > 0)) return err('Enter a thread size (major diameter and pitch).');

  const pct = Math.min(Math.max(input.pctThread, 40), 90);
  const tapDrillIn = input.majorIn - (pct * input.pitchIn) / THREAD_CONST;

  const sfm = TAP_SFM_BY_CLASS[material.class] ?? 40;
  let rpm = (sfm * 12) / (Math.PI * input.majorIn);
  let rpmClamped = false, rpmFloored = false;
  if (rpm > machine.rpmMax) { rpm = machine.rpmMax; rpmClamped = true; }
  if (rpm < machine.rpmMin) { rpm = machine.rpmMin; rpmFloored = true; }

  const feedIpm = rpm * input.pitchIn; // feed is locked to the pitch

  // Guidance.
  notes.push('Feed is locked to the pitch: the tap self-feeds one pitch per rev. Use rigid (synchronized) tapping or a tension/compression holder, and the spindle must reverse to back out.');
  notes.push('Use tapping fluid. In blind or deep holes use a spiral-flute (pulls chips up) or spiral-point “gun” tap (pushes chips ahead in through holes), and peck-retract to clear chips.');
  if (pct > 80) {
    warnings.push('Above ~75% thread the tapping torque and breakage risk climb fast for almost no extra strength — 65-75% is the usual sweet spot.');
  }
  if (rpmClamped) {
    warnings.push(`Ideal tapping speed exceeds this machine's ${Math.round(machine.rpmMax).toLocaleString()} RPM max, so RPM is capped.`);
  }
  if (rpmFloored) {
    warnings.push(`Ideal tapping speed is below this machine's ${Math.round(machine.rpmMin).toLocaleString()} RPM minimum — RPM was raised to it.`);
  }
  if (material.class === 'hard') {
    notes.push('For stainless/exotics, form (roll) taps in ductile material or a quality coated cut tap help a lot; go slower if in doubt.');
  }

  // TPI only meaningful for inch pitches that are 1/integer.
  const tpi = Math.round(1 / input.pitchIn);
  const isInchTpi = Math.abs(1 / input.pitchIn - tpi) < 0.02;

  return {
    warnings, notes,
    major: { in: round(input.majorIn, 4), mm: round(input.majorIn * MM_PER_IN, 3) },
    pitch: { in: round(input.pitchIn, 4), mm: round(input.pitchIn * MM_PER_IN, 3) },
    tpi: isInchTpi ? tpi : null,
    pctThread: pct,
    tapDrill: dual(tapDrillIn, 4),
    sfm,
    rpm: Math.round(rpm),
    rpmClamped, rpmFloored,
    feedIpm: round(feedIpm, 1),
    feedMmpm: round(feedIpm * MM_PER_IN, 0),
    feedPerRev: dual(input.pitchIn, 4),
  };
}
