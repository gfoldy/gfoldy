// Cloud session: holds the auth token + signed-in user (persisted in
// AsyncStorage) and exposes a typed client for every API endpoint. The app is
// local-first; this lights up People, Feed, Ranks and Groups when signed in.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? '';
const TOKEN_KEY = 'ironlog.cloud.token';
const USER_KEY = 'ironlog.cloud.user';

export interface CloudUser { id: string; username: string; display_name: string; }
export interface PublicProfile {
  id: string; username: string; display_name: string;
  stats?: { sessions: number; sets: number; volume: number };
  top_lifts?: { exercise: string; weight: number; reps: number; e1rm: number }[];
  is_private?: boolean;
}
export interface FeedItem {
  id: string; user_id: string; type: string; date: string | null; data: Record<string, unknown>;
  created_at: string; username: string; display_name: string; comment_count: number;
}
export interface Comment {
  id: string; activity_id: string; user_id: string; body: string; created_at: string;
  username: string; display_name: string;
}
export interface Group {
  id: string; name: string; description: string; is_public: boolean; invite_code: string;
  owner_id: string; created_at: string; member_count?: number;
}
export interface GroupMember { user_id: string; joined_at: string; username: string; display_name: string; stats?: unknown; }
export interface GroupMessage {
  id: string; group_id: string; user_id: string; body: string; created_at: string;
  username: string; display_name: string;
}

export interface Cloud {
  ready: boolean;
  token: string | null;
  user: CloudUser | null;
  configured: boolean;
  signup: (username: string, password: string, displayName: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // reads
  people: () => Promise<PublicProfile[]>;
  ranks: (metric: string) => Promise<PublicProfile[]>;
  getUser: (id: string) => Promise<{ profile: PublicProfile & { split: unknown[] }; following: boolean; follows_me: boolean }>;
  follows: () => Promise<string[]>;
  feed: () => Promise<FeedItem[]>;
  comments: (activityId: string) => Promise<Comment[]>;
  groups: (scope: 'mine' | 'public') => Promise<Group[]>;
  group: (id: string) => Promise<{ group: Group; members: GroupMember[]; isMember: boolean }>;
  groupMessages: (id: string) => Promise<GroupMessage[]>;
  // writes
  follow: (id: string) => Promise<void>;
  unfollow: (id: string) => Promise<void>;
  addComment: (activityId: string, body: string) => Promise<Comment>;
  deleteComment: (id: string) => Promise<void>;
  createGroup: (name: string, description: string, isPublic: boolean) => Promise<Group>;
  joinGroup: (id: string, invite?: string) => Promise<void>;
  leaveGroup: (id: string) => Promise<void>;
  sendMessage: (id: string, body: string) => Promise<GroupMessage>;
  pushLogs: (logs: unknown[]) => Promise<void>;
  pushSplit: (days: unknown[]) => Promise<void>;
  postActivity: (a: { id: string; type: string; date?: string; data?: unknown }) => Promise<void>;
}

const Ctx = createContext<Cloud | null>(null);
export const useCloud = (): Cloud => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCloud must be used inside <CloudProvider>');
  return c;
};

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CloudUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(USER_KEY)]);
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch { /* ignore */ }
      setReady(true);
    })();
  }, []);

  const req = useCallback(async <T,>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> => {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (init?.body) headers['content-type'] = 'application/json';
    if (init?.auth !== false && token) headers['authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers as object) } });
    if (!res.ok) {
      const msg = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((msg as { error?: string }).error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }, [token]);

  const persist = async (t: string, u: CloudUser) => {
    setToken(t); setUser(u);
    try { await AsyncStorage.setItem(TOKEN_KEY, t); await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)); } catch { /* ignore */ }
  };

  const auth = async (action: 'signup' | 'login', username: string, password: string, displayName?: string) => {
    const r = await req<{ token: string; profile: CloudUser }>('/api/auth', {
      method: 'POST', auth: false,
      body: JSON.stringify({ action, username, password, display_name: displayName }),
    });
    await persist(r.token, r.profile);
  };

  const value: Cloud = {
    ready, token, user, configured: !!BASE,
    signup: (u, p, d) => auth('signup', u, p, d),
    login: (u, p) => auth('login', u, p),
    logout: async () => {
      setToken(null); setUser(null);
      try { await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]); } catch { /* ignore */ }
    },
    people: () => req('/api/people', { auth: false }),
    ranks: (metric) => req(`/api/ranks?metric=${encodeURIComponent(metric)}`, { auth: false }),
    getUser: (id) => req(`/api/users/${id}`),
    follows: () => req('/api/follows'),
    feed: () => req('/api/activity'),
    comments: (activityId) => req(`/api/comments?activity=${encodeURIComponent(activityId)}`),
    groups: (scope) => req(`/api/groups?scope=${scope}`),
    group: (id) => req(`/api/groups/${id}`),
    groupMessages: (id) => req(`/api/groups/${id}/messages`),
    follow: (id) => req('/api/follows', { method: 'POST', body: JSON.stringify({ followee: id }) }),
    unfollow: (id) => req(`/api/follows?followee=${id}`, { method: 'DELETE' }),
    addComment: (activityId, body) => req('/api/comments', { method: 'POST', body: JSON.stringify({ activity_id: activityId, body }) }),
    deleteComment: (id) => req(`/api/comments?id=${id}`, { method: 'DELETE' }),
    createGroup: (name, description, isPublic) => req('/api/groups', { method: 'POST', body: JSON.stringify({ name, description, is_public: isPublic }) }),
    joinGroup: (id, invite) => req(`/api/groups/${id}/membership`, { method: 'POST', body: JSON.stringify({ invite }) }),
    leaveGroup: (id) => req(`/api/groups/${id}/membership`, { method: 'DELETE' }),
    sendMessage: (id, body) => req(`/api/groups/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
    pushLogs: (logs) => req('/api/logs', { method: 'POST', body: JSON.stringify(logs) }),
    pushSplit: (days) => req('/api/splits', { method: 'PUT', body: JSON.stringify(days) }),
    postActivity: (a) => req('/api/activity', { method: 'POST', body: JSON.stringify(a) }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
