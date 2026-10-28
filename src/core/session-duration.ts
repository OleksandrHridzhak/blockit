export const MAX_SESSION_MINUTES = 1440;

export function isSessionMinutes(value: unknown, minimum = 1 / 60): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= MAX_SESSION_MINUTES
    && Math.abs(value * 60 - Math.round(value * 60)) < 0.000001;
}

export function sessionMinutesOr(value: unknown, fallback = 5, minimum = 1 / 60): number {
  return isSessionMinutes(value, minimum) ? value : fallback;
}

export function parseSessionMinutes(text: string, minimum = 1): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return Number.isInteger(value) && isSessionMinutes(value, minimum) ? value : null;
}

export function formatSessionDuration(minutes: number): string {
  const seconds = Math.round(minutes * 60);
  return seconds % 60 === 0 ? `${seconds / 60} хв` : `${seconds} с`;
}
