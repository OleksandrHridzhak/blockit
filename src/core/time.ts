export interface LocalTimeParts {
  dayKey: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sun) .. 6 (Sat)
  minuteOfDay: number; // 0 .. 1439
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Extracts local date key (YYYY-MM-DD), day of week (0-6), and minute of day (0-1439)
 * for any epoch timestamp in an IANA timezone (e.g. 'Europe/Kyiv', 'America/New_York', 'UTC').
 */
export function getLocalTimeParts(epochMs: number, timeZone: string = 'UTC'): LocalTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(epochMs));
  let year = '';
  let month = '';
  let day = '';
  let weekday = 'Sun';
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = part.value;
        break;
      case 'month':
        month = part.value;
        break;
      case 'day':
        day = part.value;
        break;
      case 'weekday':
        weekday = part.value;
        break;
      case 'hour':
        // Intl with hour12: false can sometimes emit "24" for midnight
        hour = Number(part.value) % 24;
        break;
      case 'minute':
        minute = Number(part.value);
        break;
    }
  }

  return {
    dayKey: `${year}-${month}-${day}`,
    dayOfWeek: WEEKDAY_MAP[weekday] ?? 0,
    minuteOfDay: hour * 60 + minute,
  };
}

export function formatDayKey(epochMs: number, timeZone: string = 'UTC'): string {
  return getLocalTimeParts(epochMs, timeZone).dayKey;
}
