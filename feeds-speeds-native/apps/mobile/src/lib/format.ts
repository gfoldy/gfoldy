import type { UnitSystem, DualValue } from '@feedspeed/core';

export function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('en-US');
}

/** Pick the value for the active unit system and append the unit word. */
export function pick(v: DualValue, unit: UnitSystem): number {
  return unit === 'mm' ? v.mm : v.in;
}

/** Minutes → "45 min" or "1.5 hr" for longer spans. */
export function fmtMinutes(m: number): string {
  if (m >= 90) return `${(m / 60).toFixed(1)} hr`;
  return `${Math.round(m * 10) / 10} min`;
}

export const lenUnit = (unit: UnitSystem) => (unit === 'mm' ? 'mm' : 'in');
export const feedUnit = (unit: UnitSystem) => (unit === 'mm' ? 'mm/min' : 'in/min');
export const speedUnit = (unit: UnitSystem) => (unit === 'mm' ? 'm/min' : 'SFM');

export function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
