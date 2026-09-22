// @feedspeed/core — ball-nose surface-finish geometry.
//
// A ball-nose tool leaves a row of tiny ridges ("scallops" / cusps) between
// stepover passes. The scallop height is what your eye and finger read as
// finish. It's pure geometry: the ball radius r = D/2 and the stepover.
//
//   scallop  h  = r - sqrt(r^2 - (stepover/2)^2)
//   stepover ae = 2 * sqrt(r^2 - (r - h)^2) = 2 * sqrt(2*r*h - h^2)
//
// Bonus: when a ball nose cuts at a shallow axial depth Ap, only a small band
// near the tip is engaged, so the *effective* cutting diameter — the one that
// sets true surface speed — is smaller than D:
//   De = 2 * sqrt(Ap * (D - Ap))         (for Ap <= r)

/** Scallop (cusp) height left by a given stepover, all in the same length unit. */
export function scallopFromStepover(diameter: number, stepover: number): number {
  const r = diameter / 2;
  const half = Math.min(Math.abs(stepover) / 2, r);
  return r - Math.sqrt(Math.max(0, r * r - half * half));
}

/** Stepover that yields a target scallop height, all in the same length unit. */
export function stepoverFromScallop(diameter: number, scallop: number): number {
  const r = diameter / 2;
  const h = Math.min(Math.max(scallop, 0), r);
  return 2 * Math.sqrt(Math.max(0, 2 * r * h - h * h));
}

/** Effective cutting diameter of a ball nose engaged to axial depth Ap. */
export function effectiveBallDiameter(diameter: number, ap: number): number {
  const r = diameter / 2;
  const d = Math.min(Math.max(ap, 0), r);
  return 2 * Math.sqrt(Math.max(0, d * (diameter - d)));
}

export type FinishGrade = 'mirror' | 'fine' | 'good' | 'visible' | 'rough';

/** A human label for a scallop height given in INCHES. */
export function finishGrade(scallopIn: number): { grade: FinishGrade; label: string } {
  const thou = scallopIn * 1000;
  if (thou < 0.2) return { grade: 'mirror', label: 'Mirror — moulds / optics' };
  if (thou < 0.5) return { grade: 'fine', label: 'Fine — little to no sanding' };
  if (thou < 1.5) return { grade: 'good', label: 'Good — light sanding' };
  if (thou < 4) return { grade: 'visible', label: 'Visible steps — needs finishing' };
  return { grade: 'rough', label: 'Rough — tighten the stepover' };
}
