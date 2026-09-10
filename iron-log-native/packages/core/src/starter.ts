// The Iron Log starter split + the built-in movement library.

import type { Day, Exercise, Split } from './types.ts';
import { uid } from './id.ts';

const ex = (name: string, muscle: string, sets: number, reps: string): Exercise => ({
  id: uid(), name, muscle, sets, reps,
});

/** Fresh copy of the default 5-day split (new ids each call). */
export function starterSplit(): Split {
  const day = (name: string, weekday: number, exercises: Exercise[]): Day => ({
    id: uid(), name, weekday, exercises,
  });
  return [
    day('Chest (Strength) · Shoulders (Light) · Triceps', 1, [
      ex('Barbell Bench Press', 'Chest', 4, '4-6'),
      ex('Incline DB Press', 'Chest', 3, '6-8'),
      ex('Weighted Dips', 'Chest', 3, '8-10'),
      ex('Cable Lateral Raise', 'Shoulders', 3, '12-15'),
      ex('Rear Delt Fly', 'Shoulders', 3, '12-15'),
      ex('Close-Grip Bench or Skull Crusher', 'Triceps', 3, '8-10'),
      ex('Rope Pushdown', 'Triceps', 3, '10-12'),
    ]),
    day('Back (Thickness) · Biceps', 2, [
      ex('Deadlift or Rack Pull', 'Back', 3, '5'),
      ex('Barbell or T-Bar Row', 'Back', 4, '8-10'),
      ex('Chest-Supported Row or Seated Cable Row', 'Back', 3, '10-12'),
      ex('Barbell Curl', 'Biceps', 3, '8-10'),
      ex('Incline DB Curl', 'Biceps', 3, '10-12'),
    ]),
    day('Legs', 3, [
      ex('Back Squat', 'Legs', 4, '6-8'),
      ex('Romanian Deadlift', 'Legs', 3, '8-10'),
      ex('Leg Press', 'Legs', 3, '10-12'),
      ex('Leg Curl', 'Legs', 3, '10-12'),
      ex('Walking Lunges', 'Legs', 3, '10/leg'),
      ex('Standing Calf Raise', 'Calves', 4, '12-15'),
    ]),
    day('Chest (Width) · Shoulders (Heavy) · Triceps', 4, [
      ex('Incline Cable Fly', 'Chest', 3, '12-15'),
      ex('Pec Deck', 'Chest', 3, '12-15'),
      ex('Low-to-High Cable Fly', 'Chest', 3, '12-15'),
      ex('Seated Barbell or DB OHP', 'Shoulders', 4, '6-8'),
      ex('Arnold Press', 'Shoulders', 3, '8-10'),
      ex('Overhead DB Extension', 'Triceps', 3, '10-12'),
      ex('Dips or Pushdown Variation', 'Triceps', 3, '10-12'),
    ]),
    day('Back (Width/Lats) · Biceps', 5, [
      ex('Wide-Grip Lat Pulldown', 'Back', 4, '10-12'),
      ex('Straight-Arm Pulldown', 'Back', 3, '12-15'),
      ex('Cable Pullover or Wide DB Row', 'Back', 3, '12-15'),
      ex('Hammer Curl', 'Biceps', 3, '10-12'),
      ex('Cable Curl', 'Biceps', 3, '12-15'),
    ]),
  ];
}

export interface Movement { name: string; muscle: string; }

/** Built-in library so exercise names stay consistent (keeps analytics aligned). */
export const MOVEMENTS: Movement[] = ([
  // Chest
  ['Barbell Bench Press', 'Chest'], ['Incline Barbell Bench Press', 'Chest'], ['Incline DB Press', 'Chest'],
  ['Flat DB Press', 'Chest'], ['Decline Bench Press', 'Chest'], ['Machine Chest Press', 'Chest'],
  ['Weighted Dips', 'Chest'], ['Push-Up', 'Chest'], ['Cable Fly', 'Chest'], ['Incline Cable Fly', 'Chest'],
  ['Low-to-High Cable Fly', 'Chest'], ['Pec Deck', 'Chest'], ['DB Fly', 'Chest'], ['Landmine Press', 'Chest'],
  // Back
  ['Deadlift', 'Back'], ['Rack Pull', 'Back'], ['Barbell Row', 'Back'], ['Pendlay Row', 'Back'], ['T-Bar Row', 'Back'],
  ['Seated Cable Row', 'Back'], ['Chest-Supported Row', 'Back'], ['Single-Arm DB Row', 'Back'],
  ['Wide-Grip Lat Pulldown', 'Back'], ['Close-Grip Lat Pulldown', 'Back'], ['Pull-Up', 'Back'], ['Chin-Up', 'Back'],
  ['Straight-Arm Pulldown', 'Back'], ['Cable Pullover', 'Back'], ['Machine Row', 'Back'], ['Meadows Row', 'Back'],
  ['Inverted Row', 'Back'],
  // Shoulders
  ['Overhead Press', 'Shoulders'], ['Seated DB Shoulder Press', 'Shoulders'], ['Arnold Press', 'Shoulders'],
  ['Machine Shoulder Press', 'Shoulders'], ['Cable Lateral Raise', 'Shoulders'], ['DB Lateral Raise', 'Shoulders'],
  ['Rear Delt Fly', 'Shoulders'], ['Reverse Pec Deck', 'Shoulders'], ['Face Pull', 'Shoulders'],
  ['Front Raise', 'Shoulders'], ['Upright Row', 'Shoulders'],
  // Biceps
  ['Barbell Curl', 'Biceps'], ['EZ-Bar Curl', 'Biceps'], ['DB Curl', 'Biceps'], ['Incline DB Curl', 'Biceps'],
  ['Hammer Curl', 'Biceps'], ['Cable Curl', 'Biceps'], ['Preacher Curl', 'Biceps'], ['Concentration Curl', 'Biceps'],
  ['Spider Curl', 'Biceps'],
  // Triceps
  ['Close-Grip Bench Press', 'Triceps'], ['Skull Crusher', 'Triceps'], ['Rope Pushdown', 'Triceps'],
  ['Straight-Bar Pushdown', 'Triceps'], ['Overhead DB Extension', 'Triceps'], ['Overhead Cable Extension', 'Triceps'],
  ['Triceps Dips', 'Triceps'], ['Triceps Kickback', 'Triceps'], ['JM Press', 'Triceps'],
  // Legs
  ['Back Squat', 'Legs'], ['Front Squat', 'Legs'], ['Hack Squat', 'Legs'], ['Leg Press', 'Legs'],
  ['Romanian Deadlift', 'Legs'], ['Stiff-Leg Deadlift', 'Legs'], ['Bulgarian Split Squat', 'Legs'],
  ['Walking Lunge', 'Legs'], ['Leg Extension', 'Legs'], ['Lying Leg Curl', 'Legs'], ['Seated Leg Curl', 'Legs'],
  ['Goblet Squat', 'Legs'], ['Belt Squat', 'Legs'], ['Step-Up', 'Legs'],
  // Glutes
  ['Hip Thrust', 'Glutes'], ['Glute Bridge', 'Glutes'], ['Cable Kickback', 'Glutes'], ['Sumo Deadlift', 'Glutes'],
  // Calves
  ['Standing Calf Raise', 'Calves'], ['Seated Calf Raise', 'Calves'], ['Leg Press Calf Raise', 'Calves'],
  // Core
  ['Hanging Leg Raise', 'Core'], ['Cable Crunch', 'Core'], ['Plank', 'Core'], ['Ab Wheel', 'Core'],
  ['Russian Twist', 'Core'], ['Decline Sit-Up', 'Core'],
  // Traps / Forearms
  ['Barbell Shrug', 'Traps'], ['DB Shrug', 'Traps'], ['Wrist Curl', 'Forearms'], ['Reverse Curl', 'Forearms'],
  ['Farmer Carry', 'Forearms'],
] as [string, string][]).map(([name, muscle]) => ({ name, muscle }));

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes',
  'Calves', 'Core', 'Traps', 'Forearms', 'Other',
];

export const BODY_METRICS: { key: string; label: string; unit: 'lb' | 'kg' | '%' | 'in' }[] = [
  { key: 'weight', label: 'Bodyweight', unit: 'lb' },
  { key: 'bodyfat', label: 'Body fat', unit: '%' },
  { key: 'chest', label: 'Chest', unit: 'in' },
  { key: 'shoulders', label: 'Shoulders', unit: 'in' },
  { key: 'arm', label: 'Arms', unit: 'in' },
  { key: 'waist', label: 'Waist', unit: 'in' },
  { key: 'thigh', label: 'Thighs', unit: 'in' },
  { key: 'calf', label: 'Calves', unit: 'in' },
];
