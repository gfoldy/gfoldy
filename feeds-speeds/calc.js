/*
 * calc.js — pure feeds & speeds math. No DOM, no globals mutated.
 *
 * Everything is computed internally in imperial units (inches, SFM, in/min)
 * and converted for display by the UI layer.
 *
 * Formulas
 *   RPM        = (SFM x 12) / (pi x D)                     [spindle speed]
 *   Feed (mill)= RPM x Fz x Z                              [Fz=chip load, Z=flutes]
 *   Feed (drill)= RPM x Fr                                 [Fr=feed per rev]
 *   MRR        = Ap x Ae x Feed                            [material removal rate]
 *   Chip thinning (radial): when Ae < D/2 the real chip is thinner, so the
 *     programmed feed can be raised by RCTF = 1 / (2 x sqrt(r - r^2)), r=Ae/D.
 */

const IN_PER_MM = 1 / 25.4;
const MM_PER_IN = 25.4;
const SFM_PER_MPM = 1 / 0.3048; // 1 m/min = 3.281 SFM

// Linear interpolation over a sorted [[x,y]...] table, clamped at the ends.
function interp(table, x) {
  if (x <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

// Baseline chip load (in) for a given diameter (in), scaled by material.
function baselineChipLoad(diaIn, material) {
  return interp(CHIPLOAD_BASE, diaIn) * material.chipMult;
}

// Feed per revolution (in) for a drill of given diameter (in), scaled by class.
function drillFeedPerRev(diaIn, material) {
  // ~0.02 x D is a common rule of thumb (D=0.25" -> 0.005"/rev). Scale by how
  // hard the material is to cut.
  const classScale = material.class === "soft" ? 1.2 : material.class === "hard" ? 0.6 : 1.0;
  return 0.02 * diaIn * classScale;
}

// Radial chip thinning factor for radial engagement ratio r = Ae/D.
function chipThinningFactor(r) {
  if (r <= 0) return 1;
  if (r >= 0.5) return 1;
  const f = 1 / (2 * Math.sqrt(r - r * r));
  return Math.min(f, 3); // guard against absurd values at tiny stepovers
}

/*
 * Main entry point.
 *
 * input = {
 *   machineKey, customRpmMin, customRpmMax,
 *   materialKey, toolMaterialKey, toolTypeKey,
 *   diameter, unit ('in'|'mm'), flutes,
 *   operation ('slotting'|'roughing'|'finishing'),
 *   aggressiveness (0|1|2),
 *   chipThinning (bool)
 * }
 *
 * Returns a rich result object plus a warnings array. All display-facing
 * numbers are returned in BOTH unit systems so the UI can just pick.
 */
function computeFeedsSpeeds(input) {
  const warnings = [];
  const machine = MACHINES[input.machineKey];
  const material = MATERIALS[input.materialKey];
  const toolMat = TOOL_MATERIALS[input.toolMaterialKey];
  const toolType = TOOL_TYPES[input.toolTypeKey];
  const agg = AGGRESSIVENESS[input.aggressiveness] || AGGRESSIVENESS[1];

  // Diameter -> inches.
  const diaIn = input.unit === "mm" ? input.diameter * IN_PER_MM : input.diameter;
  if (!(diaIn > 0)) {
    return { error: "Enter a tool diameter greater than zero." };
  }

  const flutes = Math.max(1, Math.round(input.flutes || toolType.defaultFlutes));

  // --- Surface speed -> spindle RPM -----------------------------------------
  const sfmRange = material.sfm[toolMat.sfmKey];
  const sfm = sfmRange[0] + agg.sfmT * (sfmRange[1] - sfmRange[0]);
  let rpm = (sfm * 12) / (Math.PI * diaIn);

  // Clamp to the machine's spindle limits.
  const rpmMin = input.machineKey === "custom" ? input.customRpmMin : machine.rpmMin;
  const rpmMax = input.machineKey === "custom" ? input.customRpmMax : machine.rpmMax;
  let rpmClamped = false, rpmFloored = false;
  if (rpm > rpmMax) { rpm = rpmMax; rpmClamped = true; }
  if (rpm < rpmMin) { rpm = rpmMin; rpmFloored = true; }

  if (rpmClamped) {
    warnings.push(
      `Ideal speed exceeds this machine's ${Math.round(rpmMax).toLocaleString()} RPM max, so RPM is capped. ` +
      `Feed was reduced to match — surface speed will be below ideal.`
    );
  }
  if (rpmFloored) {
    warnings.push(
      `Ideal speed is below this machine's ${Math.round(rpmMin).toLocaleString()} RPM minimum. ` +
      `RPM was raised to the minimum — expect to cut faster than the reference speed (watch for heat/rubbing).`
    );
  }

  // --- Feed rate ------------------------------------------------------------
  let feedPerToothIn, feedPerRevIn, feedIpm;
  if (toolType.model === "drilling") {
    feedPerRevIn = drillFeedPerRev(diaIn, material) * agg.chipScale;
    feedPerToothIn = feedPerRevIn / flutes; // for reference only
    feedIpm = rpm * feedPerRevIn;
  } else {
    feedPerToothIn = baselineChipLoad(diaIn, material) * agg.chipScale;
    feedPerRevIn = feedPerToothIn * flutes;
    feedIpm = rpm * feedPerToothIn * flutes;
  }

  // --- Depth / width of cut -------------------------------------------------
  const doc = DOC_BY_CLASS[material.class];
  const scale = machine.rigidity * agg.docScale;
  let apFrac, aeFrac, opNote;

  if (toolType.model === "drilling") {
    // Drilling has no radial DOC concept in the same way; report peck guidance.
    apFrac = null; aeFrac = null;
    opNote = "Peck-drill in steps of roughly 1x-3x the drill diameter, clearing chips between pecks. Deeper than ~4x diameter: peck and add coolant/air.";
  } else {
    if (input.operation === "slotting") {
      aeFrac = 1.0;                 // full-width engagement
      apFrac = doc.slotAp * scale;
      opNote = "Slot is fully engaged (Ae = tool diameter), so keep the depth per pass modest and clear chips well.";
    } else if (input.operation === "finishing") {
      aeFrac = doc.finishAe;        // light radial for a clean wall
      apFrac = Math.min(doc.roughAp, 1.5) * scale;
      opNote = "Light radial stepover for a clean wall finish; you can take the full depth axially in one pass.";
    } else { // roughing / side milling
      aeFrac = doc.roughAe * agg.docScale; // rigidity applies via scale below
      apFrac = doc.roughAp * scale;
      opNote = "Roughing profile: moderate radial engagement with a deeper axial pass removes material efficiently.";
    }
  }

  // Convert fractions to real depths (inches), then apply chip thinning.
  let apIn = apFrac == null ? null : apFrac * diaIn;
  let aeIn = aeFrac == null ? null : aeFrac * diaIn;

  let thinningApplied = false, thinningFactor = 1;
  if (input.chipThinning && toolType.model === "milling" && aeIn != null) {
    thinningFactor = chipThinningFactor(aeIn / diaIn);
    if (thinningFactor > 1.001) {
      feedIpm *= thinningFactor;
      feedPerToothIn *= thinningFactor;
      feedPerRevIn = feedPerToothIn * flutes;
      thinningApplied = true;
    }
  }

  // --- Material removal rate ------------------------------------------------
  let mrrCuIn = null;
  if (apIn != null && aeIn != null) {
    mrrCuIn = apIn * aeIn * feedIpm; // in^3/min
  }

  // --- Sanity warnings ------------------------------------------------------
  if (toolType.model === "milling" && flutes >= 3 && material.class === "soft" &&
      (input.materialKey.startsWith("alu") || material.group === "Plastic")) {
    warnings.push("Soft/gummy materials clear chips better with 1-2 flute tools; 3+ flutes can pack chips and weld to the cutter.");
  }
  if (input.toolMaterialKey === "hss" && material.class === "hard") {
    warnings.push("HSS in hard materials wears fast — carbide is strongly recommended here.");
  }
  if (diaIn < 0.125) {
    warnings.push("Small-diameter tools are fragile: this feed/depth is a ceiling, not a target. Start lower and listen.");
  }

  // --- Package results in both unit systems ---------------------------------
  const out = (inches, dp) => ({
    in: round(inches, dp),
    mm: round(inches * MM_PER_IN, dp != null ? Math.max(0, dp - 1) : 3),
  });

  return {
    machine, material, toolMat, toolType, agg,
    warnings,
    diameter: { in: round(diaIn, 4), mm: round(diaIn * MM_PER_IN, 3) },
    flutes,
    sfm: round(sfm, 0),
    vc_mpm: round(sfm / SFM_PER_MPM, 1),           // surface speed in m/min
    rpm: Math.round(rpm),
    rpmClamped, rpmFloored,
    feed: { ipm: round(feedIpm, 1), mmpm: round(feedIpm * MM_PER_IN, 0) },
    feedPerTooth: { in: round(feedPerToothIn, 4), mm: round(feedPerToothIn * MM_PER_IN, 3) },
    feedPerRev: { in: round(feedPerRevIn, 4), mm: round(feedPerRevIn * MM_PER_IN, 3) },
    ap: apIn == null ? null : out(apIn, 3),        // axial depth of cut per pass
    ae: aeIn == null ? null : out(aeIn, 3),        // radial width of cut / stepover
    mrr: mrrCuIn == null ? null : { cuin: round(mrrCuIn, 3), cc: round(mrrCuIn * 16.387, 2) },
    thinningApplied, thinningFactor: round(thinningFactor, 2),
    opNote,
  };
}

function round(x, dp) {
  if (dp == null) dp = 2;
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
}

// Export for non-browser (tests) while staying a plain browser global.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { computeFeedsSpeeds, interp, chipThinningFactor };
}
