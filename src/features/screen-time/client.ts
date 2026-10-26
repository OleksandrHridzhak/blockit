import { requireOptionalNativeModule } from 'expo-modules-core';
export type PauseMode = 'countdown' | 'reflection' | 'typing';
export interface ProtectionStatus {
  available: boolean; authorization: 'approved' | 'denied' | 'notDetermined';
  notifications: boolean; count: number; enabled: boolean;
  seconds: number; mode: PauseMode; grantUntil: number;
}
export interface PauseRequest { id: string; readyAt: number; mode: PauseMode }
interface NativeScreenTime {
  getStatus(): Promise<ProtectionStatus>;
  requestAuthorization(): Promise<void>;
  requestNotifications(): Promise<boolean>;
  savePolicy(enabled: boolean, seconds: number, mode: PauseMode): Promise<void>;
  pickApps(): Promise<boolean>; getPending(): Promise<PauseRequest | null>;
  finish(id: string, answer: string): Promise<void>;
  cancelRequest(): Promise<void>; endAccess(): Promise<void>;
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
export const screenTime = {
  status: () => native?.getStatus() ?? Promise.resolve(unsupportedStatus),
  authorize: () => requireNative().requestAuthorization(),
  notifications: () => requireNative().requestNotifications(),
  pick: () => requireNative().pickApps(),
  save: (enabled: boolean, seconds: number, mode: PauseMode) => requireNative().savePolicy(enabled, seconds, mode),
  pending: () => native?.getPending() ?? Promise.resolve(null),
  finish: (id: string, answer: string) => requireNative().finish(id, answer),
  cancel: () => requireNative().cancelRequest(), endAccess: () => requireNative().endAccess(),
};
export function remainingSeconds(readyAt: number, now: number): number {
  return Math.max(0, Math.ceil((readyAt - now) / 1000));
}
