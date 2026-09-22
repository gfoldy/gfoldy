// @feedspeed/core — the feeds & speeds engine. Pure functions, no DOM.
//
// Everything is computed internally in imperial units and returned in both
// systems. Formulas:
//   RPM         = (SFM x 12) / (pi x D)
//   Feed (mill) = RPM x Fz x Z            (Fz = chip load, Z = flutes)
//   Feed (drill)= RPM x Fr                (Fr = feed per rev)
//   MRR         = Ap x Ae x Feed
//   Power(hp)   = MRR x unit-power / efficiency
//   Torque      = hp x 63025 / RPM
//   Deflection  = Ft x L^3 / (3 E I)      (cantilever, end-load approximation)
//   Chip thinning (radial): Fz can rise by 1 / (2 sqrt(r - r^2)), r = Ae/D.

import type { CalcInput, CalcResult, DualValue } from './types.ts';
import {
  MACHINES, MATERIALS, TOOL_MATERIALS, TOOL_TYPES,
  CHIPLOAD_BASE, DOC_BY_CLASS, OPERATIONS, AGGRESSIVENESS, REF_LIFE_MIN_BY_CLASS,
  TAYLOR_FEED_EXP, TAYLOR_DEPTH_EXP, TAYLOR_ENGAGEMENT_EXP,
} from './data.ts';
import { IN_PER_MM, MM_PER_IN, SFM_PER_MPM, CC_PER_CUIN, round, interp, dual } from './units.ts';
import { effectiveCoating } from './coatings.ts';

const SPINDLE_EFFICIENCY = 0.8;

function baselineChipLoad(diaIn: number, chipMult: number): number {
  return interp(CHIPLOAD_BASE, diaIn) * chipMult;
}

function drillFeedPerRev(diaIn: number, cls: string): number {
  const classScale = cls === 'soft' ? 1.2 : cls === 'hard' ? 0.6 : 1.0;
  return 0.02 * diaIn * classScale;
}

/** Radial chip thinning factor for radial engagement ratio r = Ae/D. */
export function chipThinningFactor(r: number): number {
  if (r <= 0 || r >= 0.5) return 1;
  return Math.min(1 / (2 * Math.sqrt(r - r * r)), 3);
}

const nil: DualValue | null = null;

export function computeFeedsSpeeds(input: CalcInput): CalcResult {
  const warnings: string[] = [];
  const notes: string[] = [];

  const machine = MACHINES[input.machineKey] ?? MACHINES.custom!;
  const material = MATERIALS[input.materialKey];
  const toolMat = TOOL_MATERIALS[input.toolMaterialKey];
  const toolType = TOOL_TYPES[input.toolTypeKey];
  const agg = AGGRESSIVENESS[input.aggressiveness] ?? AGGRESSIVENESS[1]!;

  const base = (label = ''): CalcResult => ({
    warnings, notes,
    machineLabel: machine.label,
    materialLabel: material?.label ?? '',
    toolMaterialLabel: toolMat?.label ?? '',
    toolTypeLabel: toolType?.label ?? '',
    aggLabel: agg.label,
    operationLabel: OPERATIONS[input.operation]?.label ?? '',
    diameter: { in: 0, mm: 0 }, flutes: 0,
    sfm: 0, vcMpm: 0, rpm: 0, rpmClamped: false, rpmFloored: false,
    feedIpm: 0, feedMmpm: 0,
    feedPerTooth: { in: 0, mm: 0 }, feedPerRev: { in: 0, mm: 0 },
    ap: nil, ae: nil, aePercent: null,
    mrrCuin: null, mrrCc: null,
    powerHp: null, powerPct: null, torqueInLb: null,
    deflectionIn: null, deflectionMm: null,
    thinningApplied: false, thinningFactor: 1,
    toolLifeMin: null, coatingLifeMult: null, lifeCalibration: 1,
    costPerCuin: null, costPerCc: null,
    jobTimeMin: null, jobCost: null, toolWearPct: null, toolsPerJob: null,
    error: label || undefined,
  });

  if (!material || !toolMat || !toolType) return base('Unknown machine, tool or material.');

  const diaIn = input.unit === 'mm' ? input.diameter * IN_PER_MM : input.diameter;
  if (!(diaIn > 0)) return base('Enter a tool diameter greater than zero.');

  const flutes = Math.max(1, Math.round(input.flutes || toolType.defaultFlutes));

  // --- Surface speed -> spindle RPM -----------------------------------------
  const sfmRange = material.sfm[toolMat.sfmKey];
  const sfm = sfmRange[0] + agg.sfmT * (sfmRange[1] - sfmRange[0]);
  let rpm = (sfm * 12) / (Math.PI * diaIn);

  const rpmMin = input.machineKey === 'custom' ? (input.customRpmMin ?? machine.rpmMin) : machine.rpmMin;
  const rpmMax = input.machineKey === 'custom' ? (input.customRpmMax ?? machine.rpmMax) : machine.rpmMax;
  const hpAvail = input.machineKey === 'custom' ? (input.customHp ?? machine.hp) : machine.hp;

  let rpmClamped = false, rpmFloored = false;
  if (rpm > rpmMax) { rpm = rpmMax; rpmClamped = true; }
  if (rpm < rpmMin) { rpm = rpmMin; rpmFloored = true; }
  if (rpmClamped) {
    warnings.push(`Ideal speed exceeds this machine's ${Math.round(rpmMax).toLocaleString()} RPM max, so RPM is capped and feed reduced to match — surface speed will be below ideal.`);
  }
  if (rpmFloored) {
    warnings.push(`Ideal speed is below this machine's ${Math.round(rpmMin).toLocaleString()} RPM minimum, so RPM was raised — expect to cut faster than the reference speed (watch for heat / rubbing).`);
  }

  // --- Feed rate ------------------------------------------------------------
  let feedPerToothIn: number, feedPerRevIn: number, feedIpm: number;
  if (toolType.model === 'drilling') {
    feedPerRevIn = drillFeedPerRev(diaIn, material.class) * agg.chipScale;
    feedPerToothIn = feedPerRevIn / flutes;
    feedIpm = rpm * feedPerRevIn;
  } else {
    feedPerToothIn = baselineChipLoad(diaIn, material.chipMult) * agg.chipScale;
    feedPerRevIn = feedPerToothIn * flutes;
    feedIpm = rpm * feedPerToothIn * flutes;
  }

  // --- Depth / width of cut -------------------------------------------------
  const doc = DOC_BY_CLASS[material.class]!;
  const scale = machine.rigidity * agg.docScale;
  let apFrac: number | null, aeFrac: number | null;

  if (toolType.model === 'drilling') {
    apFrac = null; aeFrac = null;
    notes.push('Peck-drill in steps of roughly 1x-3x the drill diameter, clearing chips between pecks. Beyond ~4x diameter, peck deeper and add coolant/air.');
  } else if (input.operation === 'slotting') {
    aeFrac = 1.0; apFrac = doc.slotAp * scale;
    notes.push('Slot is fully engaged (Ae = tool diameter) — keep depth per pass modest and clear chips well.');
  } else if (input.operation === 'finishing') {
    aeFrac = doc.finishAe; apFrac = Math.min(doc.roughAp, 1.5) * scale;
    notes.push('Light radial stepover for a clean wall finish; you can take the full depth axially in one pass.');
  } else if (input.operation === 'adaptive') {
    aeFrac = 0.10;
    const axial = material.class === 'soft' ? 2.0 : material.class === 'medium' ? 1.5 : 1.0;
    apFrac = axial * scale;
    notes.push('Adaptive / HSM: light radial engagement with a deep axial pass. Requires a toolpath that keeps engagement constant (trochoidal) — chip thinning is doing a lot of the work here.');
  } else { // roughing
    aeFrac = doc.roughAe * agg.docScale; apFrac = doc.roughAp * scale;
    notes.push('Roughing profile: moderate radial engagement with a deeper axial pass removes material efficiently.');
  }

  let apIn = apFrac == null ? null : apFrac * diaIn;
  let aeIn = aeFrac == null ? null : aeFrac * diaIn;

  // --- Radial chip thinning -------------------------------------------------
  let thinningApplied = false, thinningFactor = 1;
  if (input.chipThinning && toolType.model === 'milling' && aeIn != null) {
    thinningFactor = chipThinningFactor(aeIn / diaIn);
    if (thinningFactor > 1.001) {
      feedIpm *= thinningFactor;
      feedPerToothIn *= thinningFactor;
      feedPerRevIn = feedPerToothIn * flutes;
      thinningApplied = true;
    }
  }

  // --- Material removal rate + power + torque -------------------------------
  let mrrCuin: number | null = null;
  let powerHp: number | null = null, powerPct: number | null = null, torqueInLb: number | null = null;
  if (apIn != null && aeIn != null) {
    mrrCuin = apIn * aeIn * feedIpm;
    powerHp = (mrrCuin * material.hpUnit) / SPINDLE_EFFICIENCY;
    powerPct = hpAvail > 0 ? (powerHp / hpAvail) * 100 : null;
    torqueInLb = rpm > 0 ? (powerHp * 63025) / rpm : null;
    if (powerPct != null && powerPct > 100) {
      warnings.push(`This cut needs about ${powerHp.toFixed(2)} hp but the machine has ~${hpAvail} hp — reduce depth, width or feed (or take lighter passes).`);
    } else if (powerPct != null && powerPct > 80) {
      notes.push(`Heavy cut: ~${Math.round(powerPct)}% of available spindle power.`);
    }
  }

  // --- Tool deflection estimate (optional) ----------------------------------
  let deflectionIn: number | null = null;
  const stickoutIn = input.stickout == null ? null
    : (input.unit === 'mm' ? input.stickout * IN_PER_MM : input.stickout);
  if (stickoutIn != null && stickoutIn > 0 && torqueInLb != null && toolType.model === 'milling') {
    const ft = torqueInLb / (diaIn / 2);            // tangential cutting force (lbf)
    const effDia = 0.8 * diaIn;                     // fluted section is weaker than solid
    const I = (Math.PI / 64) * Math.pow(effDia, 4); // second moment of area
    deflectionIn = (ft * Math.pow(stickoutIn, 3)) / (3 * toolMat.modulusPsi * I);
    if (deflectionIn > 0.002) {
      warnings.push(`Estimated tool deflection ~${(deflectionIn * 1000).toFixed(1)} thou at this stick-out — shorten the tool or lighten the cut for accuracy.`);
    } else if (deflectionIn > 0.001) {
      notes.push(`Estimated deflection ~${(deflectionIn * 1000).toFixed(1)} thou — fine for roughing, tighten up for a precision finish.`);
    }
  }

  // --- Tool life (extended Taylor) + cost ----------------------------------
  // Generalized Taylor: life falls with cutting speed, feed per tooth, axial
  // depth and radial engagement, each relative to the material's nominal cut:
  //   T = Tref x (Vref/V)^(1/n) x (Fref/F)^fe x (Dref/Ap)^de x (AeRef/Ae)^ee
  // Speed dominates (exponent 1/n); feed moderate; depth & engagement mild.
  let toolLifeMin: number | null = null;
  let coatingLifeMult: number | null = null;
  const lifeCalibration = input.lifeCalibration != null && input.lifeCalibration > 0 ? input.lifeCalibration : 1;
  const realizedSfm = (rpm * Math.PI * diaIn) / 12;
  const vRef = (sfmRange[0] + sfmRange[1]) / 2;
  if (realizedSfm > 0 && vRef > 0) {
    const clampRatio = (x: number) => Math.min(Math.max(x, 0.2), 5);
    const refLife = (REF_LIFE_MIN_BY_CLASS[material.class] ?? 60) * (material.wearFactor ?? 1);
    let life = refLife * Math.pow(vRef / realizedSfm, 1 / toolMat.taylorN);
    // Feed term: uses the intended chip thickness (the aggressiveness chip-load
    // scale), NOT the programmed feed — chip thinning raises feed to keep the
    // real chip thickness on target, so it must not be double-counted here.
    life *= Math.pow(1 / agg.chipScale, TAYLOR_FEED_EXP);
    // Axial depth + radial engagement terms (milling only; drilling has neither).
    if (toolType.model === 'milling' && apIn != null && aeIn != null) {
      const dRef = doc.roughAp * diaIn;   // nominal axial depth
      const aeRef = doc.roughAe * diaIn;  // nominal radial engagement
      life *= Math.pow(clampRatio(dRef / apIn), TAYLOR_DEPTH_EXP);
      life *= Math.pow(clampRatio(aeRef / aeIn), TAYLOR_ENGAGEMENT_EXP);
    }
    // Coating multiplier (material-adjusted).
    const eff = effectiveCoating(input.coatingKey, material.group);
    coatingLifeMult = eff.mult;
    if (eff.warning) warnings.push(eff.warning);
    if (eff.note) notes.push(eff.note);
    life *= eff.mult;
    // Personal calibration from logged results.
    life *= lifeCalibration;

    toolLifeMin = Math.max(0.1, Math.min(life, 100000));
    if (toolLifeMin < 5) {
      warnings.push(`Estimated tool life is only ~${toolLifeMin.toFixed(1)} min of cutting — back off speed, feed or depth for anything but a one-off.`);
    }
  }

  let costPerCuin: number | null = null;
  let jobTimeMin: number | null = null, jobCost: number | null = null;
  let toolWearPct: number | null = null, toolsPerJob: number | null = null;

  const machineCostPerMin = input.machineRate != null && input.machineRate > 0 ? input.machineRate / 60 : null;
  const toolCostPerMin = input.toolPrice != null && input.toolPrice > 0 && toolLifeMin != null
    ? input.toolPrice / toolLifeMin : null;
  const hasCost = machineCostPerMin != null || toolCostPerMin != null;
  const costPerMin = (machineCostPerMin ?? 0) + (toolCostPerMin ?? 0);

  if (mrrCuin != null && mrrCuin > 0 && hasCost) {
    costPerCuin = costPerMin / mrrCuin;
  }
  if (input.removeVolume != null && input.removeVolume > 0 && mrrCuin != null && mrrCuin > 0) {
    const volCuin = input.unit === 'mm' ? input.removeVolume / CC_PER_CUIN : input.removeVolume;
    jobTimeMin = volCuin / mrrCuin;
    if (hasCost) jobCost = jobTimeMin * costPerMin;
    if (toolLifeMin != null) {
      toolsPerJob = jobTimeMin / toolLifeMin;
      toolWearPct = toolsPerJob * 100;
    }
  }

  // --- Sanity warnings ------------------------------------------------------
  const gummy = input.materialKey.startsWith('alu') || material.group === 'Plastic';
  if (toolType.model === 'milling' && flutes >= 3 && material.class === 'soft' && gummy) {
    warnings.push('Soft/gummy materials clear chips better with 1-2 flute tools; 3+ flutes can pack chips and weld to the cutter.');
  }
  if (input.toolMaterialKey === 'hss' && material.class === 'hard') {
    warnings.push('HSS in hard materials wears fast — carbide is strongly recommended here.');
  }
  if (diaIn < 0.125) {
    warnings.push('Small-diameter tools are fragile: treat this feed/depth as a ceiling, not a target. Start lower and listen.');
  }

  return {
    warnings, notes,
    machineLabel: machine.label,
    materialLabel: material.label,
    toolMaterialLabel: toolMat.label,
    toolTypeLabel: toolType.label,
    aggLabel: agg.label,
    operationLabel: OPERATIONS[input.operation]?.label ?? '',
    diameter: { in: round(diaIn, 4), mm: round(diaIn * MM_PER_IN, 3) },
    flutes,
    sfm: round(sfm, 0),
    vcMpm: round(sfm / SFM_PER_MPM, 1),
    rpm: Math.round(rpm),
    rpmClamped, rpmFloored,
    feedIpm: round(feedIpm, 1),
    feedMmpm: round(feedIpm * MM_PER_IN, 0),
    feedPerTooth: { in: round(feedPerToothIn, 4), mm: round(feedPerToothIn * MM_PER_IN, 3) },
    feedPerRev: { in: round(feedPerRevIn, 4), mm: round(feedPerRevIn * MM_PER_IN, 3) },
    ap: apIn == null ? null : dual(apIn, 3),
    ae: aeIn == null ? null : dual(aeIn, 3),
    aePercent: aeIn == null ? null : Math.round((aeIn / diaIn) * 100),
    mrrCuin: mrrCuin == null ? null : round(mrrCuin, 3),
    mrrCc: mrrCuin == null ? null : round(mrrCuin * CC_PER_CUIN, 2),
    powerHp: powerHp == null ? null : round(powerHp, 2),
    powerPct: powerPct == null ? null : round(powerPct, 0),
    torqueInLb: torqueInLb == null ? null : round(torqueInLb, 1),
    deflectionIn: deflectionIn == null ? null : round(deflectionIn, 4),
    deflectionMm: deflectionIn == null ? null : round(deflectionIn * MM_PER_IN, 3),
    thinningApplied, thinningFactor: round(thinningFactor, 2),
    toolLifeMin: toolLifeMin == null ? null : round(toolLifeMin, 1),
    coatingLifeMult: coatingLifeMult == null ? null : round(coatingLifeMult, 2),
    lifeCalibration: round(lifeCalibration, 2),
    costPerCuin: costPerCuin == null ? null : round(costPerCuin, 3),
    costPerCc: costPerCuin == null ? null : round(costPerCuin / CC_PER_CUIN, 4),
    jobTimeMin: jobTimeMin == null ? null : round(jobTimeMin, 1),
    jobCost: jobCost == null ? null : round(jobCost, 2),
    toolWearPct: toolWearPct == null ? null : round(toolWearPct, 1),
    toolsPerJob: toolsPerJob == null ? null : round(toolsPerJob, 2),
  };
}
