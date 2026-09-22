// @feedspeed/core — tool coatings and their effect on tool life.
//
// A coating multiplies tool life, but the benefit is material-dependent: AlTiN
// shines on hot ferrous work yet gums up in aluminium, and diamond/PCD is
// spectacular on non-ferrous/abrasives but destroys itself on steel. So the
// effective multiplier is a function of (coating, material group).

export interface Coating {
  label: string;
}

export const COATINGS: Record<string, Coating> = {
  none:    { label: 'Uncoated' },
  tin:     { label: 'TiN — general purpose' },
  ticn:    { label: 'TiCN' },
  altin:   { label: 'AlTiN / TiAlN — high heat' },
  zrn:     { label: 'ZrN — bright, non-ferrous' },
  diamond: { label: 'Diamond / PCD — non-ferrous only' },
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
  switch (coatingKey) {
    case 'tin':
      return { mult: 1.8 };
    case 'ticn':
      if (group === 'Stainless / exotic')
        return { mult: 1.4, note: 'TiCN softens at high heat — AlTiN suits stainless/titanium better.' };
      return { mult: 2.2 };
    case 'altin':
      if (group === 'Non-ferrous' || group === 'Plastic')
        return { mult: 1.0, note: 'AlTiN adds little in aluminium/plastic and can promote built-up edge — uncoated, ZrN or DLC is better.' };
      return { mult: 2.8 };
    case 'zrn':
      if (group === 'Ferrous' || group === 'Stainless / exotic')
        return { mult: 1.1, note: 'ZrN is aimed at non-ferrous; limited benefit on steel.' };
      return { mult: 1.7 };
    case 'diamond':
      if (group === 'Ferrous' || group === 'Stainless / exotic')
        return { mult: 0.25, warning: 'Diamond/PCD reacts with steel and fails fast — never run it on ferrous. Use AlTiN or uncoated carbide.' };
      return { mult: 5.0 };
    default:
      return { mult: 1.0 }; // uncoated / unknown
  }
}
