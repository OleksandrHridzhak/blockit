export const MAX_SESSION_MINUTES = 1440;

export function isSessionMinutes(value: unknown, minimum = 1): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= MAX_SESSION_MINUTES;
}

export function sessionMinutesOr(value: unknown, fallback = 5, minimum = 1): number {
  return isSessionMinutes(value, minimum) ? value : fallback;
}

export function parseSessionMinutes(text: string, minimum = 1): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return isSessionMinutes(value, minimum) ? value : null;
}
