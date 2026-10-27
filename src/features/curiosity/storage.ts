import { Platform } from 'react-native';
import { BlockitBridge } from '../../../modules/blockit-bridge';

const KEY = 'blockit.curiosity.v1';
interface CuriosityPreferences { enabled: boolean; groups: Record<string, boolean>; saved: string[] }
function empty(): CuriosityPreferences { return { enabled: false, groups: {}, saved: [] }; }
export function normalizeCuriosity(value: unknown): CuriosityPreferences {
  if (!value || typeof value !== 'object') return empty();
  const raw = value as Partial<CuriosityPreferences>;
  const groups: Record<string, boolean> = {};
  if (raw.groups && typeof raw.groups === 'object' && !Array.isArray(raw.groups)) {
    for (const [id, enabled] of Object.entries(raw.groups)) {
      if (id !== '__proto__' && id !== 'constructor' && id !== 'prototype' && typeof enabled === 'boolean') groups[id] = enabled;
    }
  }
  return { enabled: raw.enabled === true, groups, saved: Array.isArray(raw.saved)
    ? [...new Set(raw.saved.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, 200) : [] };
}
export function readCuriosity(): CuriosityPreferences {
  try {
    const raw = Platform.OS === 'web' && typeof localStorage !== 'undefined'
      ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    return raw ? normalizeCuriosity(JSON.parse(raw)) : empty();
  } catch { return empty(); }
}
function write(next: CuriosityPreferences) {
  const raw = JSON.stringify(next);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, raw);
  else BlockitBridge.setString(KEY, raw);
}
export function curiosityEnabled(groupId?: string): boolean {
  const settings = readCuriosity();
  return groupId && Object.hasOwn(settings.groups, groupId) ? settings.groups[groupId] : settings.enabled;
}
export function setCuriosityEnabled(enabled: boolean) { write({ ...readCuriosity(), enabled }); }
export function setGroupCuriosity(groupId: string, enabled: boolean) {
  const settings = readCuriosity();
  write({ ...settings, groups: { ...settings.groups, [groupId]: enabled } });
}
export function toggleSavedStory(id: string): string[] {
  const settings = readCuriosity();
  const saved = settings.saved.includes(id) ? settings.saved.filter(value => value !== id) : [...settings.saved, id];
  write({ ...settings, saved });
  return saved;
}
export function appCuriosityEnabled(appId: string, groupId?: string): boolean {
  const settings = readCuriosity();
  const key = `app:${appId}`;
  return Object.hasOwn(settings.groups, key) ? settings.groups[key] : curiosityEnabled(groupId);
}
export function interventionDestination(groupId?: string, appId?: string): '/curiosity' | '/intervene' {
  try { return (groupId && groupId !== 'legacy' ? curiosityEnabled(groupId) : appId ? appCuriosityEnabled(appId, groupId) : curiosityEnabled(groupId)) ? '/curiosity' : '/intervene'; } catch { return '/intervene'; }
}
