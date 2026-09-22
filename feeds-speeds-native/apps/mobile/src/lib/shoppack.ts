// Shop packs — export/import your machines-worth of setup (tool crib, saved
// jobs, learned calibrations, defaults) as a single plain JSON file. File-based
// and offline: back it up, move phones, or hand it to a friend. No network.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { Calibration } from '@feedspeed/core';
import type { SavedTool, SavedJob, Settings } from '../store/store';

export const PACK_VERSION = 1;
const FILE_NAME = 'feeds-speeds-shop-pack.json';

export interface ShopPack {
  app: 'feeds-speeds';
  kind: 'shop-pack';
  version: number;
  exportedAt: string;
  tools: SavedTool[];
  jobs: SavedJob[];
  calibrations: Record<string, Calibration>;
  settings: Partial<Settings>;
}

export function buildPack(data: {
  tools: SavedTool[]; jobs: SavedJob[];
  calibrations: Record<string, Calibration>; settings: Settings;
}): ShopPack {
  return {
    app: 'feeds-speeds',
    kind: 'shop-pack',
    version: PACK_VERSION,
    exportedAt: new Date().toISOString(),
    tools: data.tools,
    jobs: data.jobs,
    calibrations: data.calibrations,
    settings: data.settings,
  };
}

/** Write the pack to a temp file and open the OS share sheet. */
export async function exportPack(pack: ShopPack): Promise<'shared' | 'unavailable'> {
  const uri = (FileSystem.cacheDirectory ?? '') + FILE_NAME;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(pack, null, 2));
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Share Feeds & Speeds shop pack',
    UTI: 'public.json',
  });
  return 'shared';
}

/** Let the user pick a pack file and parse/validate it. Returns null if cancelled. */
export async function pickPack(): Promise<ShopPack | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
  let pack: unknown;
  try {
    pack = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const p = pack as Partial<ShopPack>;
  if (p?.app !== 'feeds-speeds' || p?.kind !== 'shop-pack') {
    throw new Error("That doesn't look like a Feeds & Speeds shop pack.");
  }
  return p as ShopPack;
}
