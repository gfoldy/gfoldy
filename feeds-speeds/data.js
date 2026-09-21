/*
 * data.js — reference data for the Feeds & Speeds calculator.
 *
 * All values are conservative *starting points* drawn from common machinist
 * references (tooling catalogs, Machinery's Handbook style tables). They are
 * meant to get you into a safe ballpark — always trust your ears, your chips,
 * and the tool manufacturer's data over any generic chart.
 *
 * Canonical units in the data are IMPERIAL:
 *   - Cutting speed: SFM (surface feet per minute)
 *   - Diameter / chip load: inches
 * The app converts to metric (Vc m/min, mm) for display when asked.
 */

// ---------------------------------------------------------------------------
// Machines — mainly constrain spindle RPM and how hard you can push depth of
// cut. `rigidity` (0-1) scales the recommended depth/width of cut.
// ---------------------------------------------------------------------------
const MACHINES = {
  router_hobby:   { label: "CNC Router — hobby (Shapeoko, X-Carve, Onefinity)", rpmMin: 8000, rpmMax: 24000, rigidity: 0.55 },
  router_pro:     { label: "CNC Router — industrial / gantry",                   rpmMin: 6000, rpmMax: 24000, rigidity: 0.80 },
  vmc:            { label: "CNC Mill — VMC (Haas, Tormach 1100, etc.)",          rpmMin: 100,  rpmMax: 12000, rigidity: 1.00 },
  benchtop_cnc:   { label: "CNC Mill — benchtop (PM-25, G0704, CNC conversion)", rpmMin: 100,  rpmMax: 5000,  rigidity: 0.75 },
  mini_mill:      { label: "Mini mill (Sieg X2 / SX2, hobby)",                   rpmMin: 100,  rpmMax: 5000,  rigidity: 0.45 },
  knee_mill:      { label: "Manual knee mill (Bridgeport)",                      rpmMin: 60,   rpmMax: 4200,  rigidity: 0.85 },
  drill_press:    { label: "Drill press",                                        rpmMin: 200,  rpmMax: 3000,  rigidity: 0.70 },
  custom:         { label: "Custom (enter spindle limits)",                      rpmMin: 100,  rpmMax: 10000, rigidity: 0.80 },
};

// ---------------------------------------------------------------------------
// Tool materials — pick the surface-speed column.
// ---------------------------------------------------------------------------
const TOOL_MATERIALS = {
  hss:     { label: "HSS (high speed steel)", sfmKey: "hss" },
  carbide: { label: "Carbide",                sfmKey: "carbide" },
};

// ---------------------------------------------------------------------------
// Tool types.
//   endmill / ballnose -> feed per tooth (chip load) model
//   drill              -> feed per revolution model (2 cutting lips)
// ---------------------------------------------------------------------------
const TOOL_TYPES = {
  endmill:  { label: "End mill (flat / square)", model: "milling", defaultFlutes: 2 },
  ballnose: { label: "Ball-nose end mill",       model: "milling", defaultFlutes: 2 },
  drill:    { label: "Drill",                    model: "drilling", defaultFlutes: 2 },
};

// ---------------------------------------------------------------------------
// Materials being cut.
//   sfm.hss / sfm.carbide : [conservative, aggressive] surface speed (SFM)
//   chipMult : scales the diameter-based baseline chip load
//   class    : "soft" | "medium" | "hard" -> drives depth-of-cut recommendations
// ---------------------------------------------------------------------------
const MATERIALS = {
  // --- Aluminium & soft non-ferrous ---
  alu_6061:  { label: "Aluminium 6061 / 7075", group: "Non-ferrous", class: "soft",   chipMult: 1.5, sfm: { hss: [250, 400], carbide: [600, 1200] } },
  alu_cast:  { label: "Aluminium — cast",       group: "Non-ferrous", class: "soft",   chipMult: 1.4, sfm: { hss: [200, 350], carbide: [500, 1000] } },
  brass:     { label: "Brass",                  group: "Non-ferrous", class: "soft",   chipMult: 1.1, sfm: { hss: [150, 250], carbide: [350, 600] } },
  bronze:    { label: "Bronze",                 group: "Non-ferrous", class: "medium", chipMult: 1.0, sfm: { hss: [90, 150],  carbide: [250, 450] } },
  copper:    { label: "Copper",                 group: "Non-ferrous", class: "medium", chipMult: 1.1, sfm: { hss: [100, 200], carbide: [300, 500] } },

  // --- Steels & ferrous ---
  steel_mild:  { label: "Mild / low-carbon steel (1018)", group: "Ferrous", class: "medium", chipMult: 1.0, sfm: { hss: [80, 110], carbide: [300, 450] } },
  steel_alloy: { label: "Alloy steel (4140/4340)",        group: "Ferrous", class: "hard",   chipMult: 0.8, sfm: { hss: [50, 80],  carbide: [200, 350] } },
  tool_steel:  { label: "Tool steel (hardened)",          group: "Ferrous", class: "hard",   chipMult: 0.7, sfm: { hss: [40, 70],  carbide: [150, 300] } },
  cast_iron:   { label: "Cast iron",                      group: "Ferrous", class: "medium", chipMult: 0.9, sfm: { hss: [50, 90],  carbide: [250, 400] } },

  // --- Stainless & exotic ---
  ss_304:    { label: "Stainless steel (304/316)", group: "Stainless / exotic", class: "hard", chipMult: 0.7, sfm: { hss: [40, 70], carbide: [150, 300] } },
  ss_174:    { label: "Stainless steel (17-4 PH)", group: "Stainless / exotic", class: "hard", chipMult: 0.6, sfm: { hss: [30, 60], carbide: [120, 250] } },
  titanium:  { label: "Titanium",                  group: "Stainless / exotic", class: "hard", chipMult: 0.5, sfm: { hss: [30, 50], carbide: [100, 200] } },

  // --- Plastics ---
  acrylic:   { label: "Acrylic / polycarbonate",   group: "Plastic", class: "soft", chipMult: 1.3, sfm: { hss: [300, 500], carbide: [500, 1200] } },
  delrin:    { label: "Delrin / nylon (POM)",      group: "Plastic", class: "soft", chipMult: 1.5, sfm: { hss: [400, 600], carbide: [600, 1200] } },
  hdpe:      { label: "HDPE / UHMW / ABS",         group: "Plastic", class: "soft", chipMult: 1.6, sfm: { hss: [400, 700], carbide: [800, 1500] } },

  // --- Wood ---
  hardwood:  { label: "Hardwood (oak, maple)",     group: "Wood", class: "soft", chipMult: 1.8, sfm: { hss: [400, 700], carbide: [600, 1200] } },
  softwood:  { label: "Softwood / plywood / MDF",  group: "Wood", class: "soft", chipMult: 2.0, sfm: { hss: [500, 900], carbide: [800, 1500] } },
};

// ---------------------------------------------------------------------------
// Baseline chip load (feed per tooth, inches) vs. tool diameter (inches).
// Reference curve for a "medium" material; MATERIALS[*].chipMult scales it.
// The app linearly interpolates between points and clamps at the ends.
// ---------------------------------------------------------------------------
const CHIPLOAD_BASE = [
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

// ---------------------------------------------------------------------------
// Depth / width of cut recommendations as a fraction of tool diameter,
// keyed by material class. Radial engagement (Ae) = width of cut / stepover;
// axial engagement (Ap) = depth per pass. These are further scaled by the
// machine rigidity and the aggressiveness setting at calc time.
// ---------------------------------------------------------------------------
const DOC_BY_CLASS = {
  soft:   { slotAp: 1.00, roughAp: 1.50, roughAe: 0.50, finishAe: 0.10 },
  medium: { slotAp: 0.50, roughAp: 1.00, roughAe: 0.40, finishAe: 0.08 },
  hard:   { slotAp: 0.25, roughAp: 0.75, roughAe: 0.30, finishAe: 0.05 },
};

// Operations the user can pick.
const OPERATIONS = {
  slotting:  { label: "Slotting (full-width channel)" },
  roughing:  { label: "Roughing / side milling (profile)" },
  finishing: { label: "Finishing pass (walls)" },
};

// Aggressiveness -> where in the SFM range we sit, chip-load scale, DOC scale.
const AGGRESSIVENESS = {
  0: { label: "Conservative", sfmT: 0.15, chipScale: 0.80, docScale: 0.80 },
  1: { label: "Nominal",      sfmT: 0.50, chipScale: 1.00, docScale: 1.00 },
  2: { label: "Aggressive",   sfmT: 0.90, chipScale: 1.20, docScale: 1.20 },
};
