import { computeAnalyticsSummary } from './analytics';
import type { HistoryEvent } from '@/storage/repository';
import { getLocalTimeParts } from './time';

export function attemptTrend(events: readonly HistoryEvent[], now: number, timeZone: string) {
  const today = getLocalTimeParts(now, timeZone).dayKey;
  const anchor = Date.parse(`${today}T12:00:00Z`);
  const dayMs = 86400000;
  const days = Array.from({ length: 56 }, (_, i) => {
    const date = new Date(anchor - (55 - i) * dayMs);
    return { key: date.toISOString().slice(0, 10), label: `${date.getUTCDate()}.${String(date.getUTCMonth() + 1).padStart(2, '0')}`, attempts: 0 };
  });
  const byDay = new Map(days.map(day => [day.key, day]));
  for (const event of events) {
    if (event.outcome !== 'intervened') continue;
    const bucket = byDay.get(getLocalTimeParts(event.timestampMs, timeZone).dayKey);
    if (bucket) bucket.attempts++;
  }
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const slice = days.slice(i * 7, i * 7 + 7);
    return { label: slice[0].label, attempts: slice.reduce((sum, day) => sum + day.attempts, 0) };
  });
  const oldest = events.length ? getLocalTimeParts(events[events.length - 1].timestampMs, timeZone).dayKey : null;
  const previous = weeks[6].attempts;
  const change = oldest && oldest <= days[42].key && events.length < 2000 && previous > 0
    ? Math.round((weeks[7].attempts - previous) / previous * 100) : null;
  return { days: days.slice(-7), weeks, current: weeks[7].attempts, previous, change };
}

export function protectionStats(events: readonly HistoryEvent[], now: number, timeZone: string) {
  const seen = new Set<string>();
  const history = events.filter(event => {
    if (!event || typeof event.id !== 'string' || seen.has(event.id)
      || typeof event.appId !== 'string' || !Number.isFinite(event.timestampMs)
      || event.timestampMs <= 0 || event.timestampMs > now
      || !['intervened', 'dismissed', 'continued'].includes(event.outcome)) return false;
    seen.add(event.id);
    return true;
  }).sort((a, b) => b.timestampMs - a.timestampMs);
  const summary = computeAnalyticsSummary(history, now, timeZone);
  const groups = new Map<string, { id: string; name: string; attempts: number; dismissed: number; continued: number }>();
  for (const event of history) {
    const group = groups.get(event.appId) ?? { id: event.appId, name: event.groupName || 'Мої застосунки', attempts: 0, dismissed: 0, continued: 0 };
    if (event.outcome === 'intervened') group.attempts++;
    if (event.outcome === 'dismissed') group.dismissed++;
    if (event.outcome === 'continued') group.continued++;
    groups.set(group.id, group);
  }
  return { summary, history, groups: [...groups.values()].sort((a, b) => b.attempts - a.attempts) };
}
