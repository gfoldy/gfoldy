// Central app store: loads the current profile's data into memory and exposes
// typed mutators that write through to SQLite and keep the in-memory copy fresh.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  type Profile, type Split, type LogSet, type Meal, type BodyEntry, type MesoConfig,
  uid, starterSplit,
} from '@ironlog/core';
import * as DB from './index';

export interface Store {
  ready: boolean;
  profile: Profile | null;
  profiles: Profile[];
  split: Split;
  logs: LogSet[];
  meals: Meal[];
  body: BodyEntry[];
  meso: MesoConfig | null;
  goals: { cal: number; prot: number } | null;
  createProfile: (name: string, seedStarter: boolean) => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  saveSplit: (days: Split) => Promise<void>;
  upsertSet: (date: string, exName: string, muscle: string, setIndex: number, patch: Partial<LogSet>) => Promise<void>;
  deleteSet: (rec: LogSet) => Promise<void>;
  addMeal: (m: Omit<Meal, 'id' | 'profileId' | 'createdAt'>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  saveBody: (date: string, values: Record<string, number>) => Promise<void>;
  saveGoals: (g: { cal: number; prot: number }) => Promise<void>;
  saveMeso: (m: MesoConfig | null) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [split, setSplit] = useState<Split>([]);
  const [logs, setLogs] = useState<LogSet[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [body, setBody] = useState<BodyEntry[]>([]);
  const [meso, setMeso] = useState<MesoConfig | null>(null);
  const [goals, setGoals] = useState<{ cal: number; prot: number } | null>(null);

  const loadProfile = useCallback(async (pid: string, all: Profile[]) => {
    setProfile(all.find((p) => p.id === pid) ?? null);
    setSplit(await DB.getSplit(pid));
    setLogs(await DB.logsByProfile(pid));
    setMeals(await DB.mealsByProfile(pid));
    setBody(await DB.bodyByProfile(pid));
    setMeso(await DB.getMeso(pid));
    setGoals(await DB.getGoals(pid));
    await DB.setCurrentProfileId(pid);
  }, []);

  useEffect(() => {
    (async () => {
      const all = await DB.allProfiles();
      setProfiles(all);
      const cur = await DB.getCurrentProfileId();
      const pick = (cur && all.find((p) => p.id === cur)) || all[0];
      if (pick) await loadProfile(pick.id, all);
      setReady(true);
    })();
  }, [loadProfile]);

  const createProfile: Store['createProfile'] = async (name, seedStarter) => {
    const p: Profile = { id: uid(), name: name.trim() || 'Athlete', unit: 'lb', createdAt: Date.now() };
    await DB.putProfile(p);
    await DB.putSplit(p.id, seedStarter ? starterSplit() : []);
    const all = [...profiles, p];
    setProfiles(all);
    await loadProfile(p.id, all);
  };

  const switchProfile: Store['switchProfile'] = async (id) => { await loadProfile(id, profiles); };

  const saveSplit: Store['saveSplit'] = async (days) => {
    if (!profile) return;
    await DB.putSplit(profile.id, days);
    setSplit([...days]);
  };

  const upsertSet: Store['upsertSet'] = async (date, exName, muscle, setIndex, patch) => {
    if (!profile) return;
    let rec = logs.find((l) => l.date === date && l.exercise === exName && l.setIndex === setIndex);
    if (!rec) {
      rec = { id: uid(), profileId: profile.id, date, exercise: exName, muscle: muscle || 'Other',
        setIndex, weight: null, reps: null, done: false, type: 'work', rir: null };
      logs.push(rec);
    }
    if (muscle) rec.muscle = muscle;
    Object.assign(rec, patch, { updatedAt: Date.now() });
    await DB.putLog(rec);
    setLogs([...logs]);
  };

  const deleteSet: Store['deleteSet'] = async (rec) => {
    await DB.delLog(rec.id);
    setLogs(logs.filter((l) => l.id !== rec.id));
  };

  const addMeal: Store['addMeal'] = async (m) => {
    if (!profile) return;
    const meal: Meal = { ...m, id: uid(), profileId: profile.id, createdAt: Date.now() };
    await DB.putMeal(meal);
    setMeals([...meals, meal]);
  };
  const deleteMeal: Store['deleteMeal'] = async (id) => {
    await DB.delMeal(id);
    setMeals(meals.filter((m) => m.id !== id));
  };

  const saveBody: Store['saveBody'] = async (date, values) => {
    if (!profile) return;
    const next = [...body];
    for (const [metric, value] of Object.entries(values)) {
      if (value == null || Number.isNaN(value)) continue;
      let rec = next.find((b) => b.date === date && b.metric === (metric as BodyEntry['metric']));
      if (rec) rec.value = value;
      else {
        rec = { id: uid(), profileId: profile.id, date, metric: metric as BodyEntry['metric'], value, createdAt: Date.now() };
        next.push(rec);
      }
      await DB.putBody(rec);
    }
    setBody(next);
  };

  const saveGoals: Store['saveGoals'] = async (g) => {
    if (!profile) return;
    await DB.setGoals(profile.id, g);
    setGoals(g);
  };
  const saveMeso: Store['saveMeso'] = async (m) => {
    if (!profile) return;
    await DB.setMeso(profile.id, m);
    setMeso(m);
  };

  const value: Store = {
    ready, profile, profiles, split, logs, meals, body, meso, goals,
    createProfile, switchProfile, saveSplit, upsertSet, deleteSet,
    addMeal, deleteMeal, saveBody, saveGoals, saveMeso,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
