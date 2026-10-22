import { requireOptionalNativeModule } from 'expo-modules-core';

interface NativeBlockitBridge {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  remove(key: string): void;
  setBypassUntil(appId: string, epochMs: number): void;
  getBypassUntil(appId: string): number;
  setAppEnabled(appId: string, enabled: boolean): void;
}

const nativeModule = requireOptionalNativeModule<NativeBlockitBridge>('BlockitBridge');

// Fallback in-memory map for Jest, Web, or environments without the native module
const memoryFallback = new Map<string, string>();
const bypassFallback = new Map<string, number>();
const enabledFallback = new Map<string, boolean>();

export const BlockitBridge = {
  isNativeAvailable: Boolean(nativeModule),

  getString(key: string): string | null {
    if (nativeModule) return nativeModule.getString(key);
    return memoryFallback.get(key) ?? null;
  },

  setString(key: string, value: string): void {
    if (nativeModule) {
      nativeModule.setString(key, value);
      return;
    }
    memoryFallback.set(key, value);
  },

  remove(key: string): void {
    if (nativeModule) {
      nativeModule.remove(key);
      return;
    }
    memoryFallback.delete(key);
  },

  setBypassUntil(appId: string, epochMs: number | null): void {
    const cleanId = appId.trim().toLowerCase();
    const val = epochMs ?? 0;
    if (nativeModule) {
      nativeModule.setBypassUntil(cleanId, val);
      return;
    }
    bypassFallback.set(cleanId, val);
  },

  getBypassUntil(appId: string): number | null {
    const cleanId = appId.trim().toLowerCase();
    const raw = nativeModule
      ? nativeModule.getBypassUntil(cleanId)
      : (bypassFallback.get(cleanId) ?? 0);
    return raw > 0 ? raw : null;
  },

  setAppEnabled(appId: string, enabled: boolean): void {
    const cleanId = appId.trim().toLowerCase();
    if (nativeModule) {
      nativeModule.setAppEnabled(cleanId, enabled);
      return;
    }
    enabledFallback.set(cleanId, enabled);
  },

  __resetFallbackForTests(): void {
    memoryFallback.clear();
    bypassFallback.clear();
    enabledFallback.clear();
  },
};
