// Thin client for the Next.js API on Vercel. Base URL comes from app config
// (app.json → expo.extra.apiBaseUrl), overridable per build.

import Constants from 'expo-constants';

const BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? '';

export interface PublicProfile {
  id: string;
  username: string;
  display_name: string;
  stats?: { sessions: number; sets: number; volume: number };
  top_lifts?: { exercise: string; weight: number; reps: number; e1rm: number }[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  base: BASE,
  health: () => get<{ ok: boolean }>('/api/health'),
  people: () => get<PublicProfile[]>('/api/people'),
  ranks: (metric: string) => get<PublicProfile[]>(`/api/ranks?metric=${encodeURIComponent(metric)}`),
};
