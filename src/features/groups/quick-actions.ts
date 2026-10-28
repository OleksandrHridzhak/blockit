import { Platform } from 'react-native';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { screenTime } from '@/features/screen-time/client';

const KEY = 'blockit.quick-actions.v1';
export type ProtectionOverrides = Record<string, number>;
export type QuickTarget = { scope: string; name: string; kind: 'app' | 'group'; id: string };

export function activeOverride(values: ProtectionOverrides, scope: string, now = Date.now()): number | undefined {
  const until = values[scope];
  return until === 0 || (Number.isFinite(until) && until > now) ? until : undefined;
}

export async function loadOverrides(demo: boolean): Promise<ProtectionOverrides> {
  if (!demo) return screenTime.protectionOverrides();
  try {
    const raw = Platform.OS === 'web' ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, until]) => typeof until === 'number' && (until === 0 || until > Date.now())));
  } catch { return {}; }
}

// -1: disable, 0: resume, positive: suspend for that many minutes.
export async function setOverride(demo: boolean, scope: string, minutes: number) {
  if (!Number.isInteger(minutes) || minutes < -1 || minutes > 1440) throw new Error('Введи від 1 до 1440 хвилин.');
  if (!demo) return screenTime.setProtectionOverride(scope, minutes);
  const values = await loadOverrides(true);
  if (minutes === 0) delete values[scope];
  else values[scope] = minutes === -1 ? 0 : Date.now() + minutes * 60000;
  const raw = JSON.stringify(values);
  if (Platform.OS === 'web') localStorage.setItem(KEY, raw);
  else BlockitBridge.setString(KEY, raw);
}
