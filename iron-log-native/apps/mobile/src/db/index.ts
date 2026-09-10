// SQLite persistence (durable on-device storage — the native equivalent of the
// web app's IndexedDB). One row per set/meal/body-entry; splits stored as JSON;
// a small key/value table for the current profile, nutrition goals, and meso.

import * as SQLite from 'expo-sqlite';
import type { Profile, Split, LogSet, Meal, BodyEntry, MesoConfig } from '@ironlog/core';

let _db: SQLite.SQLiteDatabase | null = null;

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  const d = await SQLite.openDatabaseAsync('ironlog.db');
  await d.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS splits (profileId TEXT PRIMARY KEY, days TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY, profileId TEXT NOT NULL, date TEXT NOT NULL,
      exercise TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS logs_profile ON logs(profileId);
    CREATE TABLE IF NOT EXISTS meals (id TEXT PRIMARY KEY, profileId TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS meals_profile ON meals(profileId);
    CREATE TABLE IF NOT EXISTS body (id TEXT PRIMARY KEY, profileId TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS body_profile ON body(profileId);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  `);
  _db = d;
  return d;
}

/* ---- key/value (current profile, goals, mesocycle) ---------------------- */
export async function kvGet<T>(key: string): Promise<T | null> {
  const d = await db();
  const row = await d.getFirstAsync<{ v: string }>('SELECT v FROM kv WHERE k = ?', key);
  if (!row) return null;
  try { return JSON.parse(row.v) as T; } catch { return null; }
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', key, JSON.stringify(value));
}
export async function kvDel(key: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM kv WHERE k = ?', key);
}

const goalsKey = (pid: string) => `goals:${pid}`;
const mesoKey = (pid: string) => `meso:${pid}`;
export const getGoals = (pid: string) => kvGet<{ cal: number; prot: number }>(goalsKey(pid));
export const setGoals = (pid: string, g: { cal: number; prot: number }) => kvSet(goalsKey(pid), g);
export const getMeso = (pid: string) => kvGet<MesoConfig>(mesoKey(pid));
export const setMeso = (pid: string, m: MesoConfig | null) =>
  m ? kvSet(mesoKey(pid), m) : kvDel(mesoKey(pid));
export const getCurrentProfileId = () => kvGet<string>('currentProfile');
export const setCurrentProfileId = (id: string) => kvSet('currentProfile', id);

/* ---- profiles ----------------------------------------------------------- */
export async function allProfiles(): Promise<Profile[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ data: string }>('SELECT data FROM profiles');
  return rows.map((r) => JSON.parse(r.data) as Profile);
}
export async function putProfile(p: Profile): Promise<void> {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO profiles (id, data) VALUES (?, ?)', p.id, JSON.stringify(p));
}

/* ---- splits ------------------------------------------------------------- */
export async function getSplit(pid: string): Promise<Split> {
  const d = await db();
  const row = await d.getFirstAsync<{ days: string }>('SELECT days FROM splits WHERE profileId = ?', pid);
  return row ? (JSON.parse(row.days) as Split) : [];
}
export async function putSplit(pid: string, days: Split): Promise<void> {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO splits (profileId, days) VALUES (?, ?)', pid, JSON.stringify(days));
}

/* ---- logs --------------------------------------------------------------- */
export async function logsByProfile(pid: string): Promise<LogSet[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ data: string }>('SELECT data FROM logs WHERE profileId = ?', pid);
  return rows.map((r) => JSON.parse(r.data) as LogSet);
}
export async function putLog(l: LogSet): Promise<void> {
  const d = await db();
  await d.runAsync(
    'INSERT OR REPLACE INTO logs (id, profileId, date, exercise, data) VALUES (?, ?, ?, ?, ?)',
    l.id, l.profileId, l.date, l.exercise, JSON.stringify(l),
  );
}
export async function delLog(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM logs WHERE id = ?', id);
}

/* ---- meals -------------------------------------------------------------- */
export async function mealsByProfile(pid: string): Promise<Meal[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ data: string }>('SELECT data FROM meals WHERE profileId = ?', pid);
  return rows.map((r) => JSON.parse(r.data) as Meal);
}
export async function putMeal(m: Meal): Promise<void> {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO meals (id, profileId, data) VALUES (?, ?, ?)', m.id, m.profileId, JSON.stringify(m));
}
export async function delMeal(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM meals WHERE id = ?', id);
}

/* ---- body --------------------------------------------------------------- */
export async function bodyByProfile(pid: string): Promise<BodyEntry[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ data: string }>('SELECT data FROM body WHERE profileId = ?', pid);
  return rows.map((r) => JSON.parse(r.data) as BodyEntry);
}
export async function putBody(b: BodyEntry): Promise<void> {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO body (id, profileId, data) VALUES (?, ?, ?)', b.id, b.profileId, JSON.stringify(b));
}
