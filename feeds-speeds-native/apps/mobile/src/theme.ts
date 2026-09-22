// Dark "machine shop" palette — near-black surfaces, machining orange accent,
// blue for secondary/derived values. Mirrors the web feeds-speeds styling.

export const T = {
  // surfaces
  bg: '#0d0d0f',
  bgElev: '#16161a',    // cards
  bgElev2: '#1e1e24',   // inputs, tracks, tags, inactive chips
  border: '#2a2a31',
  borderStrong: '#34343d',
  hairline: '#232329',
  // text
  text: '#f2f2f4',
  textDim: '#9a9aa6',
  textFaint: '#6c6c78',
  // accent (machining orange)
  accent: '#ff8a3d',
  accentDim: '#c96a2b',
  accentSoft: '#241a12',
  accentInk: '#1a0f06',   // text/icons on the accent
  // secondary (derived / info)
  blue: '#4da3ff',
  blueSoft: '#12202f',
  // status
  warn: '#ffcf5c',
  warnSoft: '#2a2410',
  red: '#ff6b6b',
  redSoft: '#2a1414',
  green: '#5ecb8a',
  greenSoft: '#122318',
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
  info: { bg: T.blueSoft, fg: T.blue, border: '#1f4266' },
  error: { bg: T.redSoft, fg: T.red, border: '#5a2626' },
} as const;
