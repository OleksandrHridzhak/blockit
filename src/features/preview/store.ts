import { Platform } from 'react-native';
import { APP_CATALOG } from '@/core/catalog';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { type PauseMode, type ProtectionStatus, screenTime } from '@/features/screen-time/client';

const KEY = 'blockit.preview.v1';
export interface PreviewConfig { apps: string[]; seconds: number; mode: PauseMode; enabled: boolean }
const initial: PreviewConfig = { apps: [], seconds: 20, mode: 'countdown', enabled: true };
export const previewApps = APP_CATALOG.map(app => ({ id: app.id, name: app.name }));

export function readPreview(): PreviewConfig {
  try {
    const raw = Platform.OS === 'web' && typeof localStorage !== 'undefined'
      ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    if (!raw) return { ...initial, apps: [] };
    const saved = JSON.parse(raw) as Partial<PreviewConfig>;
    return {
      apps: Array.isArray(saved.apps) ? [...new Set(saved.apps.filter(id => previewApps.some(app => app.id === id)))] : [],
      seconds: [10, 20, 30, 60].includes(saved.seconds ?? 0) ? saved.seconds! : 20,
      mode: saved.mode === 'typing' || saved.mode === 'reflection' ? saved.mode : 'countdown',
      enabled: saved.enabled !== false,
    };
  } catch { return { ...initial, apps: [] }; }
}

export function savePreview(patch: Partial<PreviewConfig>): void {
  const next = { ...readPreview(), ...patch };
  const raw = JSON.stringify(next);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, raw);
  else BlockitBridge.setString(KEY, raw);
}

export interface ProtectionView extends ProtectionStatus { demo: boolean; apps: string[] }
export async function loadProtectionView(): Promise<ProtectionView> {
  const status = await screenTime.status();
  if (status.available) return { ...status, demo: false, apps: [] };
  const preview = readPreview();
  return { ...status, ...preview, count: preview.apps.length, demo: true };
}

export async function saveRule(view: ProtectionView, patch: Partial<Pick<PreviewConfig, 'enabled' | 'seconds' | 'mode'>>): Promise<void> {
  if (view.demo) { savePreview(patch); return; }
  await screenTime.save(patch.enabled ?? view.enabled, patch.seconds ?? view.seconds, patch.mode ?? view.mode);
}
