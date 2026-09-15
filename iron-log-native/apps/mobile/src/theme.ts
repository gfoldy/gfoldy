// Light "forest" palette — warm paper, white cards, deep-green accent.
// Token names are kept from the original noir theme so every screen re-themes
// from here; gold* now maps to the forest-green accent.

export const T = {
  // surfaces
  bg: '#f6f5f2',        // warm paper
  bgElev: '#ffffff',    // cards
  bgElev2: '#efeee8',   // inputs, tracks, tags, inactive chips
  border: '#e7e6e0',
  borderStrong: '#dcdbd3',
  hairline: '#ecebe4',  // separators + chart gridlines
  // text
  text: '#191a19',
  textDim: '#6c6f6b',
  textFaint: '#a6a7a1',
  // accent (forest green) — gold* names retained for compatibility
  gold: '#2f5d3a',
  goldLt: '#35663f',
  goldDim: '#234a2d',
  goldSoft: '#e8efe9',
  goldInk: '#ffffff',   // text/icons on the accent
  // neutral (used for "hold / high volume")
  silver: '#64707a',
  silverDim: '#98a2aa',
  // success / done (same forest family for cohesion)
  green: '#2f5d3a',
  greenSoft: '#e8efe9',
  greenDim: '#234a2d',
  // alert
  red: '#c24f3f',
  redSoft: '#f5e4e0',
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

// Subtle depth for cards and the tab bar (spread into a style object).
export const shadow = {
  shadowColor: '#171712',
  shadowOpacity: 0.07,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;
export const shadowSm = {
  shadowColor: '#171712',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

// Progression-plan chip colours, keyed by the core PlanClass. Kept distinct so
// "add a set" (accent), "hold" (neutral), "below" (amber) and "high" (clay)
// don't blur together.
export const PLAN_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  add: { bg: '#e8efe9', fg: '#2f5d3a', border: '#cfe0d4' },
  ok: { bg: '#eef0f1', fg: '#5f6b73', border: '#dde1e3' },
  under: { bg: '#f6ecdd', fg: '#a5741e', border: '#e9d7b8' },
  high: { bg: '#f3e7e1', fg: '#a5634e', border: '#e6d3c8' },
  de: { bg: '#e8efe9', fg: '#2f5d3a', border: '#cfe0d4' },
};

// Volume-zone bar colours (semantic, not the brand accent).
export const ZONE_COLORS = { optimal: '#2f5d3a', high: '#a5634e', under: '#c08a2e' } as const;
