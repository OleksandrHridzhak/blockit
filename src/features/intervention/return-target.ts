import { Platform } from 'react-native';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { getCatalogApp } from '@/core/catalog';
import { screenTime } from '@/features/screen-time/client';
import { openGuardedTargetApp } from './open-target-app';

const KEY = 'blockit.return-targets.v1';
function readTargets(): Record<string, string> {
  try {
    const raw = Platform.OS === 'web' && typeof localStorage !== 'undefined'
      ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, target]) => id.length > 0 && typeof target === 'string' && getCatalogApp(target)));
  } catch { return {}; }
}
export function getReturnTarget(tokenId: string | undefined): string | null {
  return tokenId ? readTargets()[tokenId] ?? null : null;
}
export function setReturnTarget(tokenId: string, target: string | null) {
  const values = readTargets();
  if (target && getCatalogApp(target)) values[tokenId] = target;
  else delete values[tokenId];
  const raw = JSON.stringify(values);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, raw);
  else BlockitBridge.setString(KEY, raw);
}
export async function finishAndReturn(requestId: string, answer: string, tokenId?: string): Promise<boolean> {
  const target = getReturnTarget(tokenId);
  // The native grant must succeed before attempting to launch another app.
  await screenTime.finish(requestId, answer);
  return target ? openGuardedTargetApp(target) : false;
}
