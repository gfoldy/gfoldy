// @feedspeed/core — reference data (machines, tools, materials, tables).
//
// All values are conservative *starting points* from common machinist
// references. Canonical units are imperial (SFM, inches). See calc.ts.

import type {
  Machine, ToolMaterial, ToolType, Material, DocFractions, AggProfile,
} from './types.ts';

// ---------------------------------------------------------------------------
// Machines — each carries the real capabilities the calculator acts on:
//   rpmMin/rpmMax : spindle range (clamps the ideal RPM)
//   hp            : usable spindle power at the cutter (drives the power check)
//   rigidity      : 0-1 stiffness (scales recommended depth/width of cut)
//   maxFeedIpm    : the fastest cutting feed the machine can drive (caps feed)
// Numbers are typical published specs / conservative starting points — a given
// unit varies by spindle option, drawbar, and condition. 'Custom' lets you
// enter your own spindle limits and power.
// ---------------------------------------------------------------------------
export const MACHINES: Record<string, Machine> = {
  // --- Desktop / micro CNC ---
  sherline_cnc: { label: 'Sherline CNC mill', category: 'Desktop CNC', rpmMin: 100, rpmMax: 10000, hp: 0.33, rigidity: 0.30, maxFeedIpm: 30 },
  taig_cnc:     { label: 'Taig / MicroProto CNC', category: 'Desktop CNC', rpmMin: 1000, rpmMax: 10000, hp: 0.25, rigidity: 0.35, maxFeedIpm: 60 },
  nomad3:       { label: 'Carbide 3D Nomad 3', category: 'Desktop CNC', rpmMin: 2000, rpmMax: 10000, hp: 0.20, rigidity: 0.40, maxFeedIpm: 60 },
  bantam:       { label: 'Bantam Tools Desktop', category: 'Desktop CNC', rpmMin: 6000, rpmMax: 26000, hp: 0.20, rigidity: 0.35, maxFeedIpm: 120 },
  mini_mill:    { label: 'Mini mill (Sieg X2 / SX2)', category: 'Desktop CNC', rpmMin: 100, rpmMax: 5000, hp: 0.5, rigidity: 0.45, maxFeedIpm: 40 },
  sx2_7:        { label: 'Sieg SX2.7 / KX1 (CNC)', category: 'Desktop CNC', rpmMin: 100, rpmMax: 5000, hp: 1.0, rigidity: 0.50, maxFeedIpm: 50 },

  // --- Benchtop CNC ---
  benchtop_cnc: { label: 'Benchtop CNC (G0704 / PM-25 / BF20 conversion)', category: 'Benchtop CNC', rpmMin: 100, rpmMax: 5000, hp: 1.5, rigidity: 0.60, maxFeedIpm: 80 },
  sx3:          { label: 'Sieg SX3 / KX3', category: 'Benchtop CNC', rpmMin: 100, rpmMax: 5000, hp: 1.6, rigidity: 0.62, maxFeedIpm: 80 },
  pm30:         { label: 'PM-30MV / RF-45 conversion', category: 'Benchtop CNC', rpmMin: 100, rpmMax: 5000, hp: 2.0, rigidity: 0.65, maxFeedIpm: 100 },

  // --- Prosumer / tabletop industrial ---
  tormach_440:  { label: 'Tormach PCNC 440', category: 'Prosumer CNC', rpmMin: 250, rpmMax: 10000, hp: 0.5, rigidity: 0.60, maxFeedIpm: 100 },
  tormach_770:  { label: 'Tormach 770M / 770MX', category: 'Prosumer CNC', rpmMin: 250, rpmMax: 10000, hp: 1.0, rigidity: 0.65, maxFeedIpm: 135 },
  tormach_1100: { label: 'Tormach 1100M / 1100MX', category: 'Prosumer CNC', rpmMin: 250, rpmMax: 10000, hp: 1.5, rigidity: 0.70, maxFeedIpm: 165 },
  syil_x5:      { label: 'SYIL X5', category: 'Prosumer CNC', rpmMin: 200, rpmMax: 15000, hp: 4, rigidity: 0.75, maxFeedIpm: 400 },
  syil_x7:      { label: 'SYIL X7 (BT30)', category: 'Prosumer CNC', rpmMin: 100, rpmMax: 12000, hp: 9, rigidity: 0.82, maxFeedIpm: 600 },
  pocketnc:     { label: 'Pocket NC / Penta (5-axis)', category: 'Prosumer CNC', rpmMin: 1000, rpmMax: 50000, hp: 0.2, rigidity: 0.40, maxFeedIpm: 40 },
  datron_neo:   { label: 'Datron neo (HS spindle)', category: 'Prosumer CNC', rpmMin: 8000, rpmMax: 40000, hp: 5.4, rigidity: 0.85, maxFeedIpm: 900 },

  // --- Industrial VMC ---
  haas_minimill: { label: 'Haas Mini Mill', category: 'Industrial VMC', rpmMin: 100, rpmMax: 6000, hp: 7.5, rigidity: 0.88, maxFeedIpm: 400 },
  haas_tm1:      { label: 'Haas TM-1 / TM-2 (toolroom)', category: 'Industrial VMC', rpmMin: 100, rpmMax: 6000, hp: 7.5, rigidity: 0.80, maxFeedIpm: 200 },
  haas_dm1:      { label: 'Haas DM-1 / DM-2 (drill-mill)', category: 'Industrial VMC', rpmMin: 100, rpmMax: 15000, hp: 22, rigidity: 0.90, maxFeedIpm: 1400 },
  haas_vf2:      { label: 'Haas VF-2', category: 'Industrial VMC', rpmMin: 100, rpmMax: 8100, hp: 30, rigidity: 1.00, maxFeedIpm: 500 },
  haas_vf2ss:    { label: 'Haas VF-2SS (Super Speed)', category: 'Industrial VMC', rpmMin: 100, rpmMax: 12000, hp: 30, rigidity: 1.00, maxFeedIpm: 1000 },
  haas_vf3:      { label: 'Haas VF-3 (6k spindle)', category: 'Industrial VMC', rpmMin: 100, rpmMax: 6000, hp: 30, rigidity: 1.00, maxFeedIpm: 500 },
  haas_vf4:      { label: 'Haas VF-4 / VF-5', category: 'Industrial VMC', rpmMin: 100, rpmMax: 8100, hp: 30, rigidity: 1.00, maxFeedIpm: 500 },
  haas_umc750:   { label: 'Haas UMC-750 (5-axis)', category: 'Industrial VMC', rpmMin: 100, rpmMax: 8100, hp: 30, rigidity: 1.00, maxFeedIpm: 500 },
  haas_ec400:    { label: 'Haas EC-400 (horizontal)', category: 'Industrial VMC', rpmMin: 100, rpmMax: 12000, hp: 30, rigidity: 1.00, maxFeedIpm: 900 },
  brother_s700:  { label: 'Brother Speedio S700X1', category: 'Industrial VMC', rpmMin: 100, rpmMax: 16000, hp: 13, rigidity: 0.95, maxFeedIpm: 1500 },
  brother_s1000: { label: 'Brother Speedio S1000X1', category: 'Industrial VMC', rpmMin: 100, rpmMax: 16000, hp: 18, rigidity: 0.95, maxFeedIpm: 1500 },
  robodrill:     { label: 'Fanuc Robodrill α-D21', category: 'Industrial VMC', rpmMin: 100, rpmMax: 24000, hp: 20, rigidity: 0.92, maxFeedIpm: 1900 },
  doosan_dnm:    { label: 'Doosan / DN Solutions DNM 4500', category: 'Industrial VMC', rpmMin: 100, rpmMax: 8000, hp: 20, rigidity: 1.00, maxFeedIpm: 600 },
  mazak_vcn:     { label: 'Mazak VCN-530C', category: 'Industrial VMC', rpmMin: 100, rpmMax: 12000, hp: 30, rigidity: 1.00, maxFeedIpm: 800 },
  okuma_genos:   { label: 'Okuma Genos M560-V', category: 'Industrial VMC', rpmMin: 100, rpmMax: 15000, hp: 30, rigidity: 1.00, maxFeedIpm: 1500 },
  dmg_cmx:       { label: 'DMG Mori CMX 1100 V', category: 'Industrial VMC', rpmMin: 100, rpmMax: 12000, hp: 20, rigidity: 0.98, maxFeedIpm: 1000 },
  hurco_vm10:    { label: 'Hurco VM10i', category: 'Industrial VMC', rpmMin: 100, rpmMax: 10000, hp: 20, rigidity: 0.95, maxFeedIpm: 700 },
  fadal_4020:    { label: 'Fadal VMC 4020', category: 'Industrial VMC', rpmMin: 100, rpmMax: 10000, hp: 15, rigidity: 0.90, maxFeedIpm: 400 },

  // --- CNC routers ---
  router_hobby: { label: 'CNC Router — hobby (Shapeoko, X-Carve, Onefinity)', category: 'CNC Router', rpmMin: 8000, rpmMax: 24000, hp: 1.25, rigidity: 0.55, maxFeedIpm: 200 },
  router_pro:   { label: 'CNC Router — industrial / gantry', category: 'CNC Router', rpmMin: 6000, rpmMax: 24000, hp: 10, rigidity: 0.80, maxFeedIpm: 900 },

  // --- Manual / other (hand or power feed — no hard feed cap) ---
  knee_mill:    { label: 'Manual knee mill (Bridgeport Series I)', category: 'Manual / other', rpmMin: 60, rpmMax: 4200, hp: 2, rigidity: 0.85 },
  bridgeport_ii:{ label: 'Bridgeport Series II', category: 'Manual / other', rpmMin: 60, rpmMax: 4200, hp: 4, rigidity: 0.88 },
  roundcol:     { label: 'Round-column mill/drill (RF-45)', category: 'Manual / other', rpmMin: 100, rpmMax: 2500, hp: 1.5, rigidity: 0.55 },
  drill_press:  { label: 'Drill press', category: 'Manual / other', rpmMin: 200, rpmMax: 3000, hp: 0.75, rigidity: 0.70 },

  custom:       { label: 'Custom (enter spindle limits)', category: 'Custom', rpmMin: 100, rpmMax: 10000, hp: 2, rigidity: 0.80 },
};

// ---------------------------------------------------------------------------
// Tool (cutter) materials. modulusPsi feeds the deflection estimate.
// ---------------------------------------------------------------------------
export const TOOL_MATERIALS: Record<string, ToolMaterial> = {
  hss:     { label: 'HSS (high speed steel)', sfmKey: 'hss',     modulusPsi: 30e6, taylorN: 0.13 },
  carbide: { label: 'Carbide',                sfmKey: 'carbide', modulusPsi: 87e6, taylorN: 0.25 },
};

// Reference tool life (minutes of cutting) expected at a material's *nominal*
// cut — nominal surface speed, nominal chip load, and a nominal roughing depth
// & engagement. The extended Taylor model scales from here. wearFactor tweaks
// per material.
export const REF_LIFE_MIN_BY_CLASS: Record<string, number> = {
  soft: 120,
  medium: 60,
  hard: 30,
};

// Extended-Taylor sensitivity exponents. Tool life scales by (ref/actual)^exp
// for each variable. Speed uses 1/taylorN (steepest — carbide ≈ 4, HSS ≈ 8);
// feed is moderate; axial depth and radial engagement are mild. This ordering
// (speed > feed > depth) matches the classic generalized Taylor equation.
export const TAYLOR_FEED_EXP = 1.0;
export const TAYLOR_DEPTH_EXP = 0.25;
export const TAYLOR_ENGAGEMENT_EXP = 0.2;

export const TOOL_TYPES: Record<string, ToolType> = {
  // --- Milling cutters ---
  endmill:   { label: 'End mill (flat / square)', category: 'Milling cutters', model: 'milling', defaultFlutes: 2 },
  ballnose:  { label: 'Ball-nose end mill',        category: 'Milling cutters', model: 'milling', defaultFlutes: 2 },
  facemill:  { label: 'Face mill (indexable)',     category: 'Milling cutters', model: 'milling', defaultFlutes: 5, feedMult: 1.3, facing: true,
    note: 'Face milling: a shallow axial pass over a wide swath. Keep radial engagement around 70% of the cutter and keep the cutter centerline off the part edge for the best insert entry.' },
  flycutter: { label: 'Fly cutter (single point)', category: 'Milling cutters', model: 'milling', defaultFlutes: 1, speedMult: 0.8, facing: true,
    note: 'Single-point facing for a fine finish — one edge, light depth, let it sweep; a slower speed keeps the finish clean.' },
  chamfer:   { label: 'Chamfer / spot mill',        category: 'Milling cutters', model: 'milling', defaultFlutes: 2, speedMult: 0.9, feedMult: 0.6,
    note: 'Light chamfer/spot cut — program by the chamfer width (part of the flute) and ease in; run a touch slower than an end mill.' },
  slittingsaw:{ label: 'Slitting saw / slot cutter', category: 'Milling cutters', model: 'milling', defaultFlutes: 24, speedMult: 0.85, feedMult: 0.35, simpleMill: true,
    note: 'Keep feed-per-tooth tiny (many teeth), climb-cut, and back off speed — slitting saws are thin and chatter easily. Feed shown is per the cutting edge.' },
  woodruff:  { label: 'Woodruff / keyseat cutter',  category: 'Milling cutters', model: 'milling', defaultFlutes: 8, speedMult: 0.8, feedMult: 0.6, simpleMill: true,
    note: 'Full-width side cut — feed gently, it is a fragile cutter. Plunge to depth, then feed along the keyway.' },
  engraver:  { label: 'Engraving / V-bit',          category: 'Milling cutters', model: 'milling', defaultFlutes: 1, feedMult: 0.4, simpleMill: true,
    note: 'Tiny tool: run high RPM and a light feed; depth sets the engraved width on a V-bit. Treat the feed as a ceiling.' },

  // --- Holes ---
  drill:     { label: 'Drill',                      category: 'Holes', model: 'drilling', defaultFlutes: 2, peck: true },
  spotdrill: { label: 'Spot / center drill',        category: 'Holes', model: 'drilling', defaultFlutes: 2, speedMult: 0.8, feedMult: 0.5,
    note: 'Spot just deep enough to start/chamfer the hole — the pilot tip is fragile, so ease in and do not peck. For a true center drill, stop at the body.' },
  reamer:    { label: 'Reamer',                     category: 'Holes', model: 'drilling', defaultFlutes: 6, speedMult: 0.65, feedMult: 2.2,
    note: 'Run a reamer slow and feed it fast — do NOT peck. Leave ~0.010-0.015" (small holes less) of stock for it to clean up to size.' },
  countersink:{ label: 'Countersink',               category: 'Holes', model: 'drilling', defaultFlutes: 3, speedMult: 0.6, feedMult: 0.5,
    note: 'Run slow and light to avoid chatter; step down to the depth that gives the head diameter you want.' },
  boring:    { label: 'Boring head (single point)', category: 'Holes', model: 'drilling', defaultFlutes: 1, feedMult: 0.5,
    note: 'Single-point finishing of a bore: light feed per rev, and take a spring (zero-depth) pass for size and finish.' },

  // --- Threads ---
  threadmill:{ label: 'Thread mill',                category: 'Threads', model: 'milling', defaultFlutes: 3, feedMult: 0.6, simpleMill: true,
    note: 'Helical interpolation. The feed shown is at the cutting edge — on an INTERNAL thread the programmed (tool-center) feed is slower: Fcenter = Fedge × (Dhole − Dtool) / Dhole. Compensate or the thread runs fast.' },
  tap:       { label: 'Tap (threading)',            category: 'Threads', model: 'tapping',  defaultFlutes: 0 },
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
  steel_alloy: { label: 'Alloy steel (4140/4340, annealed)',group: 'Ferrous', class: 'hard', chipMult: 0.8, hpUnit: 1.60, wearFactor: 0.85, sfm: { hss: [50, 80],  carbide: [200, 350] } },
  steel_4140ph:{ label: '4140 pre-hard (28-32 HRC)',       group: 'Ferrous', class: 'hard',   chipMult: 0.72, hpUnit: 1.95, wearFactor: 0.65, sfm: { hss: [40, 60],  carbide: [180, 300] } },
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
