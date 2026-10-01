// @feedspeed/core — tool coatings and their effect on tool life.
//
// A coating multiplies tool life, but the benefit is material-dependent: the
// aluminium-bearing coatings (TiAlN/AlTiN/AlCrN/nACo) shine on hot ferrous work
// yet gall in aluminium, while diamond/PCD is spectacular on non-ferrous and
// abrasives but destroys itself on steel. So the effective multiplier is a
// function of (coating, material group). Values are conservative starting
// points — a specific grade/brand will differ.

export interface Coating {
  label: string;
}

// Ordered roughly general-purpose -> hot ferrous -> non-ferrous -> specials.
export const COATINGS: Record<string, Coating> = {
  none:    { label: 'Uncoated' },
  oxide:   { label: 'Black / steam oxide (HSS)' },
  tin:     { label: 'TiN — Titanium Nitride (general)' },
  ticn:    { label: 'TiCN — Titanium Carbonitride' },
  tialn:   { label: 'TiAlN — Titanium Aluminium Nitride' },
  altin:   { label: 'AlTiN — Aluminium Titanium Nitride (high heat)' },
  alcrn:   { label: 'AlCrN — Aluminium Chromium Nitride' },
  naco:    { label: 'nACo / AlTiSiN nanocomposite (hardened)' },
  crn:     { label: 'CrN — Chromium Nitride (anti-BUE)' },
  tib2:    { label: 'TiB₂ — Titanium Diboride (aluminium)' },
  zrn:     { label: 'ZrN — Zirconium Nitride (non-ferrous)' },
  dlc:     { label: 'DLC — Diamond-Like Carbon (non-ferrous)' },
  ws2:     { label: 'WS₂ — Tungsten Disulfide (lubricious top-coat)' },
  diamond: { label: 'Diamond / PCD / CVD (non-ferrous & abrasives)' },
};

export interface CoatingEffect {
  mult: number;
  /** A hard mismatch (routed to warnings). */
  warning?: string;
  /** A "there's a better choice" hint (routed to notes). */
  note?: string;
}

/** Effective tool-life multiplier for a coating on a given material group. */
export function effectiveCoating(coatingKey: string | undefined, group: string): CoatingEffect {
  const soft = group === 'Non-ferrous' || group === 'Plastic' || group === 'Wood';
  const hotMetal = group === 'Ferrous' || group === 'Stainless / exotic';

  switch (coatingKey) {
    case 'oxide':
      // Steam/black oxide on HSS: holds coolant, eases built-up edge. Mild, broad.
      return { mult: 1.3 };
    case 'tin':
      return { mult: 1.8 };
    case 'ticn':
      if (group === 'Stainless / exotic')
        return { mult: 1.4, note: 'TiCN softens at high heat — an aluminium-bearing coating (AlTiN/AlCrN) suits stainless/titanium better.' };
      return { mult: 2.2 };
    case 'tialn':
      if (soft)
        return { mult: 1.0, note: 'TiAlN adds little in aluminium/plastic and can promote built-up edge — uncoated, ZrN, TiB₂ or DLC is better.' };
      return { mult: 2.6 };
    case 'altin':
      if (soft)
        return { mult: 1.0, note: 'AlTiN adds little in aluminium/plastic and can promote built-up edge — uncoated, ZrN, TiB₂ or DLC is better.' };
      return { mult: 2.8 };
    case 'alcrn':
      if (soft)
        return { mult: 1.1, note: 'AlCrN is aimed at hot ferrous/stainless work; limited benefit in non-ferrous.' };
      return { mult: 2.8 };
    case 'naco':
      if (soft)
        return { mult: 1.0, note: 'Nanocomposite (AlTiSiN) coatings are for hardened ferrous & exotics; little benefit in non-ferrous.' };
      return { mult: 3.2 };
    case 'crn':
      // Low built-up-edge coating for gummy/soft metals, copper, titanium.
      return { mult: 1.4 };
    case 'tib2':
      if (hotMetal)
        return { mult: 0.9, note: 'TiB₂ is an aluminium/non-ferrous coating — not meant for steel.' };
      return { mult: 2.0 };
    case 'zrn':
      if (hotMetal)
        return { mult: 1.1, note: 'ZrN is aimed at non-ferrous; limited benefit on steel.' };
      return { mult: 1.7 };
    case 'dlc':
      if (hotMetal)
        return { mult: 0.9, note: 'DLC suits aluminium, plastics and graphite; it offers little on steel and sheds at high heat.' };
      return { mult: 2.5 };
    case 'ws2':
      // Lubricious top-coat (often over another coating): anti-galling, low friction.
      return soft ? { mult: 1.5 } : { mult: 1.3 };
    case 'diamond':
      if (hotMetal)
        return { mult: 0.25, warning: 'Diamond/PCD reacts with steel and fails fast — never run it on ferrous. Use AlTiN/AlCrN or uncoated carbide.' };
      return { mult: 5.0 };
    default:
      return { mult: 1.0 }; // uncoated / unknown
  }
}
