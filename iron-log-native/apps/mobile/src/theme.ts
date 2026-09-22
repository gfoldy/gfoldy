// LFT palette — pulled from the logo: near-black canvas, brushed-metal silver
// text, and an electric lime-green accent. Token names (gold*) are kept from
// earlier themes so every screen re-themes from this one file; gold* is now the
// electric green accent, and silver* is the metallic neutral.

export const T = {
  // surfaces
  bg: '#0a0a0b',        // near-pure black (logo background)
  bgElev: '#151517',    // cards (neutral graphite)
  bgElev2: '#1f1f22',   // inputs, tracks, tags, inactive chips
  border: '#2a2a2f',
  borderStrong: '#3a3a41',
  hairline: '#202024',  // separators + chart gridlines
  // text (metallic silver → white)
  text: '#f5f6f7',
  textDim: '#a6a9b0',
  textFaint: '#676a72',
  // accent (electric lime green) — gold* names retained for compatibility
  gold: '#76e12c',
  goldLt: '#93f04d',
  goldDim: '#57b517',
  goldSoft: '#172808',  // dark lime tint (chip backgrounds)
  goldInk: '#08160a',   // dark ink for text/icons ON the accent
  // metallic neutral (used for "hold / high volume" + silver accents)
  silver: '#cbced4',
  silverDim: '#8b8f98',
  // success / done (same electric green family for cohesion)
  green: '#76e12c',
  greenSoft: '#172808',
  greenDim: '#57b517',
  // alert
  red: '#ff6a52',
  redSoft: '#2a1512',
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

// Depth for cards and the tab bar (spread into a style object). On a black
// canvas shadows read as a soft black lift plus the border hairline.
export const shadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.55,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
} as const;
export const shadowSm = {
  shadowColor: '#000000',
  shadowOpacity: 0.45,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

// Progression-plan chip colours, keyed by the core PlanClass. Kept distinct so
// "add a set" (accent), "hold" (neutral), "below" (amber) and "high" (clay)
// don't blur together — tuned for the black canvas.
export const PLAN_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  add: { bg: '#172808', fg: '#93f04d', border: '#2f4a17' },
  ok: { bg: '#1c1e22', fg: '#a6a9b0', border: '#2e3138' },
  under: { bg: '#2a2213', fg: '#e2b65e', border: '#493d1f' },
  high: { bg: '#2a1b14', fg: '#e5977c', border: '#4a3123' },
  de: { bg: '#172808', fg: '#93f04d', border: '#2f4a17' },
};

// Volume-zone bar colours (semantic, not the brand accent).
export const ZONE_COLORS = { optimal: '#76e12c', high: '#e5977c', under: '#e2b65e' } as const;

// Hero gradient stops (green-tinged black → pure black) + the green glow used
// by the Today hero, echoing the logo's black plate with a green rim light.
export const HERO_GRADIENT = ['#1d2610', '#13160a', '#0a0a0b'] as const;
export const HERO_GLOW = '#8bff3a';
