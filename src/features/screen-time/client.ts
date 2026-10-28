import { requireOptionalNativeModule } from 'expo-modules-core';
import type { HistoryEvent } from '@/storage/repository';
export type GroupMode = 'countdown' | 'reflection' | 'typing' | 'microlearning' | 'microlearning-v2';
export interface AppGroup {
  id: string; name: string; seconds: number; mode: GroupMode; appIds: string[];
  sessionMinutes?: number;
  previewRule?: { seconds: number; mode: PauseMode; sessionMinutes?: number; escalating?: boolean; todayOpens?: number; rounds?: number; mathRounds?: number; stroopRounds?: number; codeLength?: number };
}
export interface SelectedApp { id: string; seconds: number; mode: GroupMode; sessionMinutes?: number; groupId?: string; groupName?: string }
export type PauseMode = 'countdown' | 'reflection' | 'typing' | 'breathing' | 'math' | 'passcode' | 'stroop' | 'microlearning' | 'microlearning-v2';
export interface ProtectionStatus {
  available: boolean; authorization: 'approved' | 'denied' | 'notDetermined';
  notifications: boolean; count: number; enabled: boolean;
  seconds: number; mode: PauseMode; grantUntil: number;
  lastError?: string;
  supportsCustomSessions?: boolean;
  supportsShortSessions?: boolean;
  supportsSecondSessions?: boolean;
  supportsMicrolearning?: boolean;
  supportsMicrolearningV2?: boolean;
}
export interface PauseRequest { id: string; readyAt: number; mode: PauseMode; sessionMinutes?: number; groupId?: string; groupName?: string; appId?: string }
interface NativeScreenTime {
  getProtectionOverrides?(): Promise<Record<string, number>>;
  setProtectionOverride?(scope: string, minutes: number): Promise<void>;
  getStatus(): Promise<ProtectionStatus>;
  requestAuthorization(): Promise<void>;
  requestNotifications(): Promise<boolean>;
  savePolicy(enabled: boolean, seconds: number, mode: PauseMode): Promise<void>;
  pickApps(): Promise<boolean>; getPending(): Promise<PauseRequest | null>;
  getDiagnostics?(): Promise<string>;
  setShieldProbeMode?(mode: 'normal' | 'screen' | 'notification'): Promise<void>;
  getActiveAccess?(): Promise<PauseRequest | null>;
  finish(id: string, answer: string): Promise<void>;
  startMicrolearning?(id: string): Promise<PauseRequest>;
  cancelRequest(): Promise<void>; endAccess(): Promise<void>;
  getGroups(): Promise<AppGroup[]>;
  getHistory(): Promise<HistoryEvent[]>;
  saveGroup(id: string, name: string, seconds: number, mode: GroupMode, sessionMinutes?: number): Promise<void>;
  pickGroupApps(id: string, name: string, seconds: number, mode: GroupMode, sessionMinutes?: number): Promise<boolean>;
  deleteGroup(id: string): Promise<void>;
  getSelectedApps(): Promise<SelectedApp[]>;
  saveAppRule(id: string, seconds: number, mode: GroupMode, sessionMinutes?: number): Promise<void>;
  removeSelectedApp?(id: string): Promise<void>;
}
const native = requireOptionalNativeModule<NativeScreenTime>('BlockitScreenTime');
export const unsupportedStatus: ProtectionStatus = {
  available: false, authorization: 'notDetermined', notifications: false,
  count: 0, enabled: false, seconds: 20, mode: 'countdown', grantUntil: 0,
};
function requireNative(): NativeScreenTime {
  if (!native) throw new Error('Блокування доступне в новій iOS-збірці Blockit на iPhone.');
  return native;
}
async function customSessions(module: NativeScreenTime, minutes: number) {
  const status = await module.getStatus();
  if (!Number.isInteger(minutes) && !status.supportsSecondSessions) throw new Error('Онови Blockit, щоб задавати тривалість доступу в секундах.');
  if (minutes < 15 && !status.supportsShortSessions) throw new Error('Онови Blockit, щоб встановити доступ менше 15 хвилин.');
  if (status.supportsCustomSessions) return true;
  if (minutes !== 15) throw new Error('Онови Blockit у TestFlight, щоб змінювати ліміт сесії.');
  return false;
}
async function ensureMode(module: NativeScreenTime, mode: GroupMode) {
  if (mode === 'microlearning' && !(await module.getStatus()).supportsMicrolearning) throw new Error('Онови Blockit, щоб користуватися Microlearning.');
  if (mode === 'microlearning-v2' && !(await module.getStatus()).supportsMicrolearningV2) throw new Error('Онови Blockit, щоб користуватися Microlearning v2.');
}
export const screenTime = {
  protectionOverrides: () => native?.getProtectionOverrides?.() ?? Promise.resolve({} as Record<string, number>),
  setProtectionOverride: (scope: string, minutes: number) => {
    const module = requireNative();
    if (!module.setProtectionOverride) return Promise.reject(new Error('Для швидких дій потрібна нова iOS-збірка Blockit.'));
    return module.setProtectionOverride(scope, minutes);
  },
  selectedApps: () => native?.getSelectedApps?.() ?? (native ? Promise.reject(new Error('Онови Blockit, щоб бачити окремі застосунки.')) : Promise.resolve([])),
  saveAppRule: async (id: string, seconds: number, mode: GroupMode, sessionMinutes = 15) => {
    const module = requireNative();
    await ensureMode(module, mode);
    return await customSessions(module, sessionMinutes) ? module.saveAppRule(id, seconds, mode, sessionMinutes) : module.saveAppRule(id, seconds, mode);
  },
  removeApp: (id: string) => {
    const module = requireNative();
    if (!module.removeSelectedApp) return Promise.reject(new Error('Онови Blockit у TestFlight, щоб видаляти окремі застосунки.'));
    return module.removeSelectedApp(id);
  },
  groups: () => native?.getGroups?.() ?? (native ? Promise.reject(new Error('Онови Blockit у TestFlight, щоб керувати групами.')) : Promise.resolve([])),
  history: () => native?.getHistory?.() ?? (native ? Promise.reject(new Error('Онови Blockit у TestFlight, щоб бачити статистику.')) : Promise.resolve([])),
  saveGroup: async (group: AppGroup) => {
    const module = requireNative();
    await ensureMode(module, group.mode);
    return await customSessions(module, group.sessionMinutes ?? 15)
      ? module.saveGroup(group.id, group.name, group.seconds, group.mode, group.sessionMinutes ?? 15)
      : module.saveGroup(group.id, group.name, group.seconds, group.mode);
  },
  pickGroup: async (group: AppGroup) => {
    const module = requireNative();
    await ensureMode(module, group.mode);
    return await customSessions(module, group.sessionMinutes ?? 15)
      ? module.pickGroupApps(group.id, group.name, group.seconds, group.mode, group.sessionMinutes ?? 15)
      : module.pickGroupApps(group.id, group.name, group.seconds, group.mode);
  },
  deleteGroup: (id: string) => requireNative().deleteGroup(id),
  status: () => native?.getStatus() ?? Promise.resolve(unsupportedStatus),
  authorize: () => requireNative().requestAuthorization(),
  notifications: () => requireNative().requestNotifications(),
  pick: () => requireNative().pickApps(),
  save: (enabled: boolean, seconds: number, mode: PauseMode) => requireNative().savePolicy(enabled, seconds, mode),
  pending: () => native?.getPending() ?? Promise.resolve(null),
  activeAccess: () => native?.getActiveAccess?.() ?? Promise.resolve(null),
  diagnostics: () => native?.getDiagnostics?.() ?? Promise.reject(new Error('Діагностика доступна в новій iOS-збірці Blockit.')),
  setShieldProbeMode: (mode: 'normal' | 'screen' | 'notification') => native?.setShieldProbeMode?.(mode)
    ?? Promise.reject(new Error('Для тесту кнопки потрібна нова iOS-збірка Blockit.')),
  startMicrolearning: (id: string) => {
    const module = requireNative();
    if (!module.startMicrolearning) return Promise.reject(new Error('Онови Blockit, щоб користуватися Microlearning.'));
    return module.startMicrolearning(id);
  },
  finish: (id: string, answer: string) => requireNative().finish(id, answer),
  cancel: () => requireNative().cancelRequest(), endAccess: () => requireNative().endAccess(),
};
export function remainingSeconds(readyAt: number, now: number): number {
  return Math.max(0, Math.ceil((readyAt - now) / 1000));
}
