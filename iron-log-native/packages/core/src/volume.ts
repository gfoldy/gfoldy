// Muscle grouping, colour palette (CVD-safe on the dark surface), and weekly
// hypertrophy volume landmarks.

export const MUSCLE_ORDER = [
  'Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Calves',
];

export const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#3987e5', Back: '#d95926', Shoulders: '#199e70', Legs: '#c98500',
  Biceps: '#d55181', Triceps: '#008300', Core: '#9085e9', Calves: '#e66767',
};

export const OTHER_COLOR = '#8a8a94';

export const muscleBucket = (m: string): string => (MUSCLE_COLORS[m] ? m : 'Other');
export const muscleColor = (m: string): string => MUSCLE_COLORS[m] ?? OTHER_COLOR;

/** Weekly working-set landmarks per muscle [low, high] (sets/week). */
export const MUSCLE_TARGETS: Record<string, [number, number]> = {
  Chest: [10, 20], Back: [10, 20], Shoulders: [8, 20], Legs: [12, 22],
  Biceps: [8, 16], Triceps: [8, 16], Calves: [8, 16], Glutes: [8, 16],
  Core: [6, 14], Traps: [6, 14], Forearms: [6, 14], Other: [8, 18],
};

export const targetFor = (m: string): [number, number] => MUSCLE_TARGETS[m] ?? [8, 18];

export type VolumeZone = 'under' | 'optimal' | 'high';

export function volumeZone(sets: number, m: string): VolumeZone {
  const [lo, hi] = targetFor(m);
  return sets < lo ? 'under' : sets > hi ? 'high' : 'optimal';
}
