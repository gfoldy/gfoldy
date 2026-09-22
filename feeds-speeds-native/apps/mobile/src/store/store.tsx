import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  uid, applyOutcome, DEFAULT_CALIBRATION,
  type UnitSystem, type Aggressiveness, type CalcInput, type Calibration, type CutOutcome,
} from '@feedspeed/core';

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
  price?: number;
  coatingKey?: string;
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
  /** Shop / machine operating rate ($ per hour), used for cost estimates. */
  machineRate?: number;
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
  /** Per-material tool-life calibration learned from logged results. */
  calibrations: Record<string, Calibration>;
  getCalibration: (materialKey: string) => Calibration;
  logOutcome: (materialKey: string, outcome: CutOutcome) => Calibration;
  resetCalibrations: () => void;
  /** Merge an imported shop pack; returns how many new tools/jobs were added. */
  importData: (data: {
    tools?: SavedTool[]; jobs?: SavedJob[];
    calibrations?: Record<string, Calibration>; settings?: Partial<Settings>;
  }) => { toolsAdded: number; jobsAdded: number };
}

const KEY = 'feedspeed.v1';
const DEFAULT_SETTINGS: Settings = { unit: 'in', aggressiveness: 1, chipThinning: true };

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [tools, setTools] = useState<SavedTool[]>([]);
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [calibrations, setCalibrations] = useState<Record<string, Calibration>>({});
  const loaded = useRef(false);

  // Load once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const data = JSON.parse(raw) as Partial<{
            settings: Settings; tools: SavedTool[]; jobs: SavedJob[]; calibrations: Record<string, Calibration>;
          }>;
          if (data.settings) setSettingsState({ ...DEFAULT_SETTINGS, ...data.settings });
          if (Array.isArray(data.tools)) setTools(data.tools);
          if (Array.isArray(data.jobs)) setJobs(data.jobs);
          if (data.calibrations && typeof data.calibrations === 'object') setCalibrations(data.calibrations);
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
    AsyncStorage.setItem(KEY, JSON.stringify({ settings, tools, jobs, calibrations })).catch(() => {});
  }, [settings, tools, jobs, calibrations]);

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
    calibrations,
    getCalibration: (materialKey) => calibrations[materialKey] ?? DEFAULT_CALIBRATION,
    logOutcome: (materialKey, outcome) => {
      const next = applyOutcome(calibrations[materialKey] ?? DEFAULT_CALIBRATION, outcome);
      setCalibrations((c) => ({ ...c, [materialKey]: next }));
      return next;
    },
    resetCalibrations: () => setCalibrations({}),
    importData: (data) => {
      // Append only tools/jobs whose ids aren't already present (idempotent on
      // re-import of your own pack; additive when merging a friend's).
      const toolIds = new Set(tools.map((t) => t.id));
      const newTools = (data.tools ?? []).filter((t) => t && t.id && !toolIds.has(t.id));
      const jobIds = new Set(jobs.map((j) => j.id));
      const newJobs = (data.jobs ?? []).filter((j) => j && j.id && !jobIds.has(j.id));
      if (newTools.length) setTools((cur) => [...newTools, ...cur]);
      if (newJobs.length) setJobs((cur) => [...newJobs, ...cur]);
      if (data.calibrations) setCalibrations((cur) => ({ ...cur, ...data.calibrations }));
      if (data.settings) setSettingsState((cur) => ({ ...cur, ...data.settings }));
      return { toolsAdded: newTools.length, jobsAdded: newJobs.length };
    },
  }), [ready, settings, tools, jobs, calibrations]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
