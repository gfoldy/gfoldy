import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uid, type UnitSystem, type Aggressiveness, type CalcInput } from '@feedspeed/core';

// A tool the user actually owns — saved once, reused in the calculator.
export interface SavedTool {
  id: string;
  name: string;
  toolTypeKey: string;
  toolMaterialKey: string;
  diameter: number;
  unit: UnitSystem;
  flutes: number;
  stickout?: number;
}

// A saved calculation ("this worked / this is my go-to").
export interface SavedJob {
  id: string;
  name: string;
  createdAt: string;
  input: CalcInput;
}

export interface Settings {
  unit: UnitSystem;
  aggressiveness: Aggressiveness;
  chipThinning: boolean;
}

interface StoreValue {
  ready: boolean;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  tools: SavedTool[];
  addTool: (t: Omit<SavedTool, 'id'>) => SavedTool;
  updateTool: (id: string, patch: Partial<SavedTool>) => void;
  removeTool: (id: string) => void;
  jobs: SavedJob[];
  addJob: (name: string, input: CalcInput) => SavedJob;
  removeJob: (id: string) => void;
}

const KEY = 'feedspeed.v1';
const DEFAULT_SETTINGS: Settings = { unit: 'in', aggressiveness: 1, chipThinning: true };

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [tools, setTools] = useState<SavedTool[]>([]);
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const loaded = useRef(false);

  // Load once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const data = JSON.parse(raw) as Partial<{ settings: Settings; tools: SavedTool[]; jobs: SavedJob[] }>;
          if (data.settings) setSettingsState({ ...DEFAULT_SETTINGS, ...data.settings });
          if (Array.isArray(data.tools)) setTools(data.tools);
          if (Array.isArray(data.jobs)) setJobs(data.jobs);
        }
      } catch {
        // corrupt / unavailable storage — start clean.
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  // Persist on change (after the initial load).
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ settings, tools, jobs })).catch(() => {});
  }, [settings, tools, jobs]);

  const value = useMemo<StoreValue>(() => ({
    ready,
    settings,
    setSettings: (patch) => setSettingsState((s) => ({ ...s, ...patch })),
    tools,
    addTool: (t) => {
      const tool: SavedTool = { ...t, id: uid() };
      setTools((xs) => [tool, ...xs]);
      return tool;
    },
    updateTool: (id, patch) => setTools((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    removeTool: (id) => setTools((xs) => xs.filter((t) => t.id !== id)),
    jobs,
    addJob: (name, input) => {
      const job: SavedJob = { id: uid(), name, createdAt: new Date().toISOString(), input };
      setJobs((xs) => [job, ...xs]);
      return job;
    },
    removeJob: (id) => setJobs((xs) => xs.filter((j) => j.id !== id)),
  }), [ready, settings, tools, jobs]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
