// @feedspeed/core — shared types for the feeds & speeds engine.

export type UnitSystem = 'in' | 'mm';
export type MaterialClass = 'soft' | 'medium' | 'hard';
export type Operation = 'slotting' | 'roughing' | 'finishing' | 'adaptive';
export type ToolModel = 'milling' | 'drilling' | 'tapping';
export type Aggressiveness = 0 | 1 | 2;

export interface Machine {
  label: string;
  rpmMin: number;
  rpmMax: number;
  /** Available spindle power at the cutter, in horsepower. */
  hp: number;
  /** 0-1 stiffness factor scaling recommended depth/width of cut. */
  rigidity: number;
}

export interface ToolMaterial {
  label: string;
  /** Which surface-speed column to read from a material. */
  sfmKey: 'hss' | 'carbide';
  /** Young's modulus (psi) — used for deflection estimates. */
  modulusPsi: number;
  /** Taylor tool-life exponent n (V·T^n = C). Higher = life less sensitive to speed. */
  taylorN: number;
}

export interface ToolType {
  label: string;
  model: ToolModel;
  defaultFlutes: number;
}

export interface Material {
  label: string;
  group: string;
  class: MaterialClass;
  /** Scales the diameter-based baseline chip load. */
  chipMult: number;
  /** Unit power (hp per in^3/min) for a sharp tool — drives the power check. */
  hpUnit: number;
  /** Multiplies the class reference tool life (abrasive/gummy < 1, easy > 1). */
  wearFactor?: number;
  sfm: {
    hss: [number, number];
    carbide: [number, number];
  };
}

export interface DocFractions {
  slotAp: number;
  roughAp: number;
  roughAe: number;
  finishAe: number;
}

export interface AggProfile {
  label: string;
  /** Where in the SFM range to sit (0-1). */
  sfmT: number;
  chipScale: number;
  docScale: number;
}

/** Everything the calculator needs to produce a result. */
export interface CalcInput {
  machineKey: string;
  customRpmMin?: number;
  customRpmMax?: number;
  customHp?: number;
  materialKey: string;
  toolMaterialKey: string;
  toolTypeKey: string;
  /** Diameter in the given `unit`. */
  diameter: number;
  unit: UnitSystem;
  flutes: number;
  /** Exposed tool length (stick-out) in `unit`; enables deflection estimate. */
  stickout?: number;
  operation: Operation;
  aggressiveness: Aggressiveness;
  chipThinning: boolean;
  /** Tool coating key (see COATINGS) — affects tool life. Default 'none'. */
  coatingKey?: string;
  /** Learned per-material tool-life multiplier from logged results. Default 1. */
  lifeCalibration?: number;

  // --- Optional tooling & cost inputs ---
  /** Price of the cutting tool ($) — enables tooling-cost figures. */
  toolPrice?: number;
  /** Machine / shop operating rate ($ per hour). */
  machineRate?: number;
  /** Volume of material to remove, in the active unit system (in^3 or cm^3). */
  removeVolume?: number;
}

/** A value carried in both unit systems so the UI just picks one. */
export interface DualValue {
  in: number;
  mm: number;
}

export interface CalcResult {
  error?: string;
  warnings: string[];
  notes: string[];

  // resolved lookups (labels for display)
  machineLabel: string;
  materialLabel: string;
  toolMaterialLabel: string;
  toolTypeLabel: string;
  aggLabel: string;
  operationLabel: string;

  diameter: DualValue;
  flutes: number;

  sfm: number;          // surface speed, imperial
  vcMpm: number;        // surface speed, m/min
  rpm: number;
  rpmClamped: boolean;
  rpmFloored: boolean;

  feedIpm: number;
  feedMmpm: number;
  feedPerTooth: DualValue;
  feedPerRev: DualValue;

  ap: DualValue | null; // axial depth of cut per pass
  ae: DualValue | null; // radial width of cut / stepover
  aePercent: number | null;

  mrrCuin: number | null;
  mrrCc: number | null;

  powerHp: number | null;       // estimated spindle power required
  powerPct: number | null;      // % of machine's available hp
  torqueInLb: number | null;

  deflectionIn: number | null;  // estimated tool deflection (in)
  deflectionMm: number | null;

  thinningApplied: boolean;
  thinningFactor: number;

  // --- Tool life & cost ---
  /** Estimated tool life in minutes of cutting at the realized surface speed. */
  toolLifeMin: number | null;
  /** Effective coating multiplier applied to tool life (material-adjusted). */
  coatingLifeMult: number | null;
  /** Calibration multiplier applied to tool life (1 = uncalibrated). */
  lifeCalibration: number;
  /** Cost to remove unit volume (machine + tooling), $ per in^3 / per cm^3. */
  costPerCuin: number | null;
  costPerCc: number | null;
  /** For a specific job (removeVolume given): */
  jobTimeMin: number | null;   // cutting time
  jobCost: number | null;      // machine + tooling
  toolWearPct: number | null;  // % of one tool's life this job consumes
  toolsPerJob: number | null;  // tools consumed (fractional allowed)
}
