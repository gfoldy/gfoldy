// Noir palette — the dark/gold/silver design ported from the web app's tokens.

export const T = {
  bg: '#0a0a0c',
  bgElev: '#17171b',
  bgElev2: '#212127',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.14)',
  hairline: 'rgba(255,255,255,0.06)',
  text: '#edecef',
  textDim: '#a0a0ab',
  textFaint: '#6c6c77',
  gold: '#cbab53',
  goldLt: '#e8d193',
  goldDim: '#8a7636',
  goldSoft: 'rgba(203,171,83,0.13)',
  goldInk: '#201a08',
  silver: '#c7cad2',
  silverDim: '#8b8f99',
  green: '#4ccb74',
  greenSoft: 'rgba(76,203,116,0.15)',
  greenDim: '#2b7d45',
  red: '#e0655f',
  redSoft: 'rgba(224,101,95,0.14)',
} as const;

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const space = (n: number) => n * 4;

// Progression-plan chip colours, keyed by the core PlanClass.
export const PLAN_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  add: { bg: T.goldSoft, fg: T.goldLt, border: 'rgba(203,171,83,0.3)' },
  ok: { bg: T.greenSoft, fg: T.green, border: T.greenDim },
  under: { bg: 'rgba(224,101,95,0.14)', fg: T.red, border: 'rgba(224,101,95,0.3)' },
  high: { bg: 'rgba(199,202,210,0.12)', fg: T.silver, border: 'rgba(199,202,210,0.25)' },
  de: { bg: T.goldSoft, fg: T.goldLt, border: 'rgba(203,171,83,0.3)' },
};
