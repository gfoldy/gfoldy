// @feedspeed/core — learn-from-your-results tool-life calibration.
//
// The tool-life model gives a physics-based estimate. Real shops differ (rigid
// setup, coolant, tool brand), so we let the user record how a cut actually
// went and nudge a per-material multiplier toward what they observe. Over time
// each material's estimate drifts toward that user's reality.

export type CutOutcome = 'broke' | 'worn' | 'good' | 'long';

// Each qualitative outcome implies where the *true* life sat vs. the estimate.
export const OUTCOME_META: Record<CutOutcome, { label: string; target: number; hint: string }> = {
  broke: { label: 'Broke / chipped', target: 0.4, hint: 'Estimate was optimistic — dial it down.' },
  worn:  { label: 'Dulled fast',     target: 0.7, hint: 'A bit optimistic.' },
  good:  { label: 'As expected',     target: 1.0, hint: 'Estimate confirmed.' },
  long:  { label: 'Lasted great',    target: 1.4, hint: 'Estimate was conservative — you can push more.' },
};

export interface Calibration {
  /** Multiplier applied to the estimated tool life for this material. */
  factor: number;
  /** How many outcomes have contributed (for confidence display). */
  samples: number;
}

export const DEFAULT_CALIBRATION: Calibration = { factor: 1, samples: 1 };

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

/** Exponential moving step toward a target ratio. A fixed, gentle step means
 *  no single (noisy) cut dominates — a few consistent logs are what move it. */
function step(cal: Calibration, target: number, alpha: number): Calibration {
  const factor = clamp(cal.factor + alpha * (target - cal.factor), 0.25, 2.5);
  return { factor: Math.round(factor * 100) / 100, samples: cal.samples + 1 };
}

/** Fold a qualitative outcome into a calibration. */
export function applyOutcome(cal: Calibration, outcome: CutOutcome, alpha = 0.4): Calibration {
  return step(cal, OUTCOME_META[outcome].target, alpha);
}

/** Fold an exact observed/predicted life ratio into a calibration. */
export function applyObservedRatio(cal: Calibration, observedOverPredicted: number, alpha = 0.4): Calibration {
  if (!(observedOverPredicted > 0)) return cal;
  return step(cal, observedOverPredicted, alpha);
}
