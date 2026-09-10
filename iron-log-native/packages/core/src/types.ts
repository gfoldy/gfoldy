// Domain model — shared by the native app and the API. Kept framework-free.

export type Unit = 'lb' | 'kg';

/** A training profile (device-local, or a cloud account when username is set). */
export interface Profile {
  id: string;
  name: string;
  unit: Unit;
  createdAt: number;
  username?: string;
}

/** One planned exercise inside a split day. */
export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string; // e.g. "8-10", "5", "10/leg"
}

/** One training day in a split. weekday: 0=Sun..6=Sat, or null for "no weekday". */
export interface Day {
  id: string;
  name: string;
  weekday: number | null;
  exercises: Exercise[];
}

export type Split = Day[];

/** Set-type tags. 'work' is a normal working set (the default). */
export type SetType = 'work' | 'warmup' | 'drop' | 'failure' | 'restpause' | 'myo';

/** One logged set. Keyed by exercise NAME + date (never by split position). */
export interface LogSet {
  id: string;
  profileId: string;
  date: string; // YYYY-MM-DD
  exercise: string;
  muscle: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  done: boolean;
  type: SetType;
  rir: number | null;
  updatedAt?: number;
}

/** A nutrition entry (device-local). */
export interface Meal {
  id: string;
  profileId: string;
  date: string;
  kcal: number;
  protein: number;
  label: string;
  createdAt: number;
}

export type BodyMetricKey =
  | 'weight' | 'bodyfat' | 'chest' | 'shoulders' | 'arm' | 'waist' | 'thigh' | 'calf';

/** One body measurement point (one row per date+metric). */
export interface BodyEntry {
  id: string;
  profileId: string;
  date: string;
  metric: BodyMetricKey;
  value: number;
  createdAt: number;
}

/** Mesocycle config: a training block starting `start`, `weeks` long incl. deload. */
export interface MesoConfig {
  start: string; // YYYY-MM-DD (snapped to its Monday when evaluated)
  weeks: number; // total weeks including the final deload week
}
