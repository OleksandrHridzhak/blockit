import type { PauseMode } from '@/features/screen-time/client';

export const PAUSE_PHRASE = 'Я обираю відкрити свідомо';
export function isMicrolearning(mode: PauseMode): boolean {
  return mode === 'microlearning' || mode === 'microlearning-v2';
}
export function microlearningRoute(mode: PauseMode): '/microlearning' | '/microlearning-v2' {
  return mode === 'microlearning-v2' ? '/microlearning-v2' : '/microlearning';
}
export function hasPauseTimer(mode: PauseMode): boolean {
  return mode === 'countdown' || mode === 'breathing' || isMicrolearning(mode);
}
export function challengeRounds(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10 ? value : 3;
}
export function challengeCodeLength(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 4 && value <= 12 ? value : 6;
}
