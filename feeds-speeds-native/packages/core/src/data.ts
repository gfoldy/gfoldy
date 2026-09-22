// @feedspeed/core — reference data (machines, tools, materials, tables).
//
// All values are conservative *starting points* from common machinist
// references. Canonical units are imperial (SFM, inches). See calc.ts.

import type {
  Machine, ToolMaterial, ToolType, Material, DocFractions, AggProfile,
} from './types.ts';

// ---------------------------------------------------------------------------
// Machines — constrain spindle RPM, available power, and how hard you can push.
// hp is the usable power at the cutter; rigidity (0-1) scales depth/width.
// ---------------------------------------------------------------------------
export const MACHINES: Record<string, Machine> = {
  router_hobby: { label: 'CNC Router — hobby (Shapeoko, X-Carve, Onefinity)', rpmMin: 8000, rpmMax: 24000, hp: 1.25, rigidity: 0.55 },
  router_pro:   { label: 'CNC Router — industrial / gantry',                   rpmMin: 6000, rpmMax: 24000, hp: 10,   rigidity: 0.80 },
  vmc:          { label: 'CNC Mill — VMC (Haas, Tormach 1100, etc.)',          rpmMin: 100,  rpmMax: 12000, hp: 15,   rigidity: 1.00 },
  benchtop_cnc: { label: 'CNC Mill — benchtop (PM-25, G0704, conversion)',     rpmMin: 100,  rpmMax: 5000,  hp: 1.5,  rigidity: 0.75 },
  mini_mill:    { label: 'Mini mill (Sieg X2 / SX2, hobby)',                   rpmMin: 100,  rpmMax: 5000,  hp: 0.5,  rigidity: 0.45 },
  knee_mill:    { label: 'Manual knee mill (Bridgeport)',                      rpmMin: 60,   rpmMax: 4200,  hp: 2,    rigidity: 0.85 },
  drill_press:  { label: 'Drill press',                                        rpmMin: 200,  rpmMax: 3000,  hp: 0.75, rigidity: 0.70 },
  custom:       { label: 'Custom (enter spindle limits)',                      rpmMin: 100,  rpmMax: 10000, hp: 2,    rigidity: 0.80 },
};

// ---------------------------------------------------------------------------
// Tool (cutter) materials. modulusPsi feeds the deflection estimate.
// ---------------------------------------------------------------------------
export const TOOL_MATERIALS: Record<string, ToolMaterial> = {
  hss:     { label: 'HSS (high speed steel)', sfmKey: 'hss',     modulusPsi: 30e6, taylorN: 0.13 },
  carbide: { label: 'Carbide',                sfmKey: 'carbide', modulusPsi: 87e6, taylorN: 0.25 },
};

// Reference tool life (minutes of cutting) expected at a material's *nominal*
// surface speed, by class. Taylor's equation scales from here as the realized
// speed moves away from nominal. Material.wearFactor tweaks per material.
export const REF_LIFE_MIN_BY_CLASS: Record<string, number> = {
  soft: 120,
  medium: 60,
  hard: 30,
};

export const TOOL_TYPES: Record<string, ToolType> = {
  endmill:  { label: 'End mill (flat / square)', model: 'milling',  defaultFlutes: 2 },
  ballnose: { label: 'Ball-nose end mill',       model: 'milling',  defaultFlutes: 2 },
  drill:    { label: 'Drill',                    model: 'drilling', defaultFlutes: 2 },
};

// ---------------------------------------------------------------------------
// Materials. sfm.* = [conservative, aggressive] surface speed (SFM).
// ---------------------------------------------------------------------------
export const MATERIALS: Record<string, Material> = {
  alu_6061:  { label: 'Aluminium 6061 / 7075', group: 'Non-ferrous', class: 'soft',   chipMult: 1.5, hpUnit: 0.25, wearFactor: 1.2, sfm: { hss: [250, 400], carbide: [600, 1200] } },
  alu_cast:  { label: 'Aluminium — cast',       group: 'Non-ferrous', class: 'soft',   chipMult: 1.4, hpUnit: 0.28, wearFactor: 1.0, sfm: { hss: [200, 350], carbide: [500, 1000] } },
  brass:     { label: 'Brass',                  group: 'Non-ferrous', class: 'soft',   chipMult: 1.1, hpUnit: 0.55, wearFactor: 1.2, sfm: { hss: [150, 250], carbide: [350, 600] } },
  bronze:    { label: 'Bronze',                 group: 'Non-ferrous', class: 'medium', chipMult: 1.0, hpUnit: 0.65, wearFactor: 1.0, sfm: { hss: [90, 150],  carbide: [250, 450] } },
  copper:    { label: 'Copper',                 group: 'Non-ferrous', class: 'medium', chipMult: 1.1, hpUnit: 0.70, wearFactor: 1.1, sfm: { hss: [100, 200], carbide: [300, 500] } },

  steel_mild:  { label: 'Mild / low-carbon steel (1018)', group: 'Ferrous', class: 'medium', chipMult: 1.0, hpUnit: 1.10, wearFactor: 1.0,  sfm: { hss: [80, 110], carbide: [300, 450] } },
  steel_alloy: { label: 'Alloy steel (4140/4340)',        group: 'Ferrous', class: 'hard',   chipMult: 0.8, hpUnit: 1.60, wearFactor: 0.85, sfm: { hss: [50, 80],  carbide: [200, 350] } },
  tool_steel:  { label: 'Tool steel (hardened)',          group: 'Ferrous', class: 'hard',   chipMult: 0.7, hpUnit: 2.10, wearFactor: 0.6,  sfm: { hss: [40, 70],  carbide: [150, 300] } },
  cast_iron:   { label: 'Cast iron',                      group: 'Ferrous', class: 'medium', chipMult: 0.9, hpUnit: 0.70, wearFactor: 0.9,  sfm: { hss: [50, 90],  carbide: [250, 400] } },

  ss_304:    { label: 'Stainless steel (304/316)', group: 'Stainless / exotic', class: 'hard', chipMult: 0.7, hpUnit: 1.50, wearFactor: 0.8, sfm: { hss: [40, 70], carbide: [150, 300] } },
  ss_174:    { label: 'Stainless steel (17-4 PH)', group: 'Stainless / exotic', class: 'hard', chipMult: 0.6, hpUnit: 1.70, wearFactor: 0.6, sfm: { hss: [30, 60], carbide: [120, 250] } },
  titanium:  { label: 'Titanium',                  group: 'Stainless / exotic', class: 'hard', chipMult: 0.5, hpUnit: 1.30, wearFactor: 0.4, sfm: { hss: [30, 50], carbide: [100, 200] } },

  acrylic:   { label: 'Acrylic / polycarbonate', group: 'Plastic', class: 'soft', chipMult: 1.3, hpUnit: 0.10, wearFactor: 1.5, sfm: { hss: [300, 500], carbide: [500, 1200] } },
  delrin:    { label: 'Delrin / nylon (POM)',    group: 'Plastic', class: 'soft', chipMult: 1.5, hpUnit: 0.10, wearFactor: 1.5, sfm: { hss: [400, 600], carbide: [600, 1200] } },
  hdpe:      { label: 'HDPE / UHMW / ABS',       group: 'Plastic', class: 'soft', chipMult: 1.6, hpUnit: 0.08, wearFactor: 1.5, sfm: { hss: [400, 700], carbide: [800, 1500] } },

  hardwood:  { label: 'Hardwood (oak, maple)',    group: 'Wood', class: 'soft', chipMult: 1.8, hpUnit: 0.06, wearFactor: 0.9, sfm: { hss: [400, 700], carbide: [600, 1200] } },
  softwood:  { label: 'Softwood / plywood / MDF', group: 'Wood', class: 'soft', chipMult: 2.0, hpUnit: 0.05, wearFactor: 0.7, sfm: { hss: [500, 900], carbide: [800, 1500] } },
};

// Baseline chip load (feed per tooth, inches) vs. tool diameter (inches).
// Reference curve for a "medium" material; Material.chipMult scales it.
export const CHIPLOAD_BASE: ReadonlyArray<readonly [number, number]> = [
  [0.0625, 0.0004],
  [0.1250, 0.0008],
  [0.1875, 0.0013],
  [0.2500, 0.0018],
  [0.3750, 0.0026],
  [0.5000, 0.0035],
  [0.6250, 0.0043],
  [0.7500, 0.0050],
  [1.0000, 0.0063],
];

// Depth / width of cut as a fraction of tool diameter, by material class.
export const DOC_BY_CLASS: Record<string, DocFractions> = {
  soft:   { slotAp: 1.00, roughAp: 1.50, roughAe: 0.50, finishAe: 0.10 },
  medium: { slotAp: 0.50, roughAp: 1.00, roughAe: 0.40, finishAe: 0.08 },
  hard:   { slotAp: 0.25, roughAp: 0.75, roughAe: 0.30, finishAe: 0.05 },
};

export const OPERATIONS: Record<string, { label: string }> = {
  slotting:  { label: 'Slotting (full-width channel)' },
  roughing:  { label: 'Roughing / side milling (profile)' },
  finishing: { label: 'Finishing pass (walls)' },
  adaptive:  { label: 'Adaptive / HSM (trochoidal)' },
};

export const AGGRESSIVENESS: Record<number, AggProfile> = {
  0: { label: 'Conservative', sfmT: 0.15, chipScale: 0.80, docScale: 0.80 },
  1: { label: 'Nominal',      sfmT: 0.50, chipScale: 1.00, docScale: 1.00 },
  2: { label: 'Aggressive',   sfmT: 0.90, chipScale: 1.20, docScale: 1.20 },
};
