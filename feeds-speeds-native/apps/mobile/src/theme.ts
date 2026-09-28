// Method Machining palette — black ground, vivid Method green accent, and
// chrome/silver for secondary/derived values. Matches the company branding.

export const T = {
  // surfaces
  bg: '#000000',        // true black, like the logo
  bgElev: '#0e100e',    // cards
  bgElev2: '#181b18',   // inputs, tracks, tags, inactive chips
  border: '#262a26',
  borderStrong: '#39423a',
  hairline: '#1b1e1b',
  // text
  text: '#f2f5f2',
  textDim: '#9aa39c',
  textFaint: '#5f665f',
  // accent (Method green)
  accent: '#2fc63a',
  accentDim: '#1c9a28',
  accentSoft: '#0d2712',
  accentInk: '#04140a',   // text/icons on the accent
  // secondary (derived / info) — chrome / silver
  blue: '#b7c0c8',        // "steel" — token name kept for compatibility
  blueSoft: '#151a1c',
  // status
  warn: '#ffcf5c',
  warnSoft: '#2a2410',
  red: '#ff6b6b',
  redSoft: '#2a1414',
  green: '#2fc63a',
  greenSoft: '#0d2712',
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
  shadowColor: '#000000',
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;
export const shadowSm = {
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

// Severity colours for result notices.
export const NOTICE_COLORS = {
  warn: { bg: T.warnSoft, fg: T.warn, border: '#5a4a1e' },
  info: { bg: T.blueSoft, fg: T.blue, border: '#39423a' },
  error: { bg: T.redSoft, fg: T.red, border: '#5a2626' },
} as const;
