export type PauseUnit = 'seconds' | 'minutes';

export function parsePauseSeconds(text: string, unit: PauseUnit): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!(unit === 'seconds' ? /^\d+$/ : /^\d+(\.\d+)?$/).test(normalized)) return null;
  const value = Number(normalized) * (unit === 'minutes' ? 60 : 1);
  if (!Number.isFinite(value) || value < 1 || value > 86400) return null;
  return Math.round(value);
}

export function pauseDurationText(seconds: number, unit: PauseUnit): string {
  return String(unit === 'minutes' ? Number((seconds / 60).toFixed(4)) : seconds);
}
