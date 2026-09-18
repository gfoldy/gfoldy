// Dark "forest" palette — near-black canvas, elevated graphite cards, a bright
// forest-green accent that pops on black. Token names are kept from the
// original theme so every screen re-themes from here; gold* is the green accent.

export const T = {
  // surfaces
  bg: '#0a0c0b',        // near-black, faint green depth
  bgElev: '#141816',    // cards (graphite with a green cast)
  bgElev2: '#1c211e',   // inputs, tracks, tags, inactive chips
  border: '#262c28',
  borderStrong: '#333b36',
  hairline: '#1e231f',  // separators + chart gridlines
  // text
  text: '#f1f4f1',
  textDim: '#9aa39c',
  textFaint: '#616a63',
  // accent (bright forest green) — gold* names retained for compatibility
  gold: '#43c977',
  goldLt: '#5bdc8e',
  goldDim: '#2fa55f',
  goldSoft: '#14251b',  // dark green tint (chip backgrounds)
  goldInk: '#052012',   // dark ink for text/icons ON the accent
  // neutral (used for "hold / high volume")
  silver: '#8b969b',
  silverDim: '#5a646a',
  // success / done (same forest family for cohesion)
  green: '#43c977',
  greenSoft: '#14251b',
  greenDim: '#2fa55f',
  // alert
  red: '#f2705c',
  redSoft: '#2a1613',
} as const;

export const radii = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
export const space = (n: number) => n * 4;

// Font faces (loaded in the root layout). Manrope for body/UI, Bricolage
// Grotesque for display titles + big numbers.
export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  display: 'BricolageGrotesque_800ExtraBold',
} as const;

// Depth for cards and the tab bar (spread into a style object). On a dark
// canvas shadows read as a soft black lift plus the border hairline.
export const shadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.5,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
} as const;
export const shadowSm = {
  shadowColor: '#000000',
  shadowOpacity: 0.4,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

// Progression-plan chip colours, keyed by the core PlanClass. Kept distinct so
// "add a set" (accent), "hold" (neutral), "below" (amber) and "high" (clay)
// don't blur together — tuned for the dark canvas.
export const PLAN_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  add: { bg: '#14251b', fg: '#5bdc8e', border: '#235233' },
  ok: { bg: '#1b2124', fg: '#9aa5ab', border: '#2c3439' },
  under: { bg: '#2a2213', fg: '#e2b65e', border: '#493d1f' },
  high: { bg: '#2a1b14', fg: '#e5977c', border: '#4a3123' },
  de: { bg: '#14251b', fg: '#5bdc8e', border: '#235233' },
};

// Volume-zone bar colours (semantic, not the brand accent).
export const ZONE_COLORS = { optimal: '#43c977', high: '#e5977c', under: '#e2b65e' } as const;

// Hero gradient stops (deep forest → near-black), used by the Today hero.
export const HERO_GRADIENT = ['#1c3a28', '#12251a', '#0b120e'] as const;
