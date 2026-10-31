import { attemptTrend, protectionStats } from '../protection-stats';
import type { HistoryEvent } from '@/storage/repository';

const now = Date.parse('2026-10-26T12:00:00Z');
function event(id: string, outcome: HistoryEvent['outcome'], timestampMs = now - 1000, appId = 'social'): HistoryEvent {
  return { id, outcome, timestampMs, appId, groupName: 'Соцмережі' };
}
describe('real protection statistics', () => {
  it('keeps empty history empty without seeded metrics', () => {
    const result = protectionStats([], now, 'Europe/Kyiv');
    expect(result.groups).toEqual([]);
    expect(result.summary.totalInterventions).toBe(0);
    expect(result.summary.last7Days.every(day => day.interventions === 0)).toBe(true);
  });
  it('deduplicates extension callbacks and excludes invalid and future entries', () => {
    const attempt = event('one:intervened', 'intervened');
    const result = protectionStats([attempt, attempt, event('one:continued', 'continued'),
      event('two:intervened', 'intervened'), event('two:dismissed', 'dismissed'),
      event('future', 'continued', now + 1000), event('invalid', 'dismissed', NaN)], now, 'UTC');
    expect(result.history).toHaveLength(4);
    expect(result.summary.totalInterventions).toBe(2);
    expect(result.summary.totalContinued).toBe(1);
    expect(result.summary.totalDismissed).toBe(1);
    expect(result.summary.mindfulRatePercent).toBe(50);
    expect(result.groups[0]).toMatchObject({ name: 'Соцмережі', attempts: 2, continued: 1, dismissed: 1 });
  });
  it('uses the local date around midnight and keeps deleted groups in history', () => {
    const midnight = Date.parse('2026-10-26T23:00:00Z');
    const result = protectionStats([event('old:intervened', 'intervened', midnight - 1000, 'deleted')], midnight, 'Europe/Kyiv');
    expect(result.summary.last7Days[6].dayKey).toBe('2026-10-27');
    expect(result.summary.last7Days[6].interventions).toBe(1);
    expect(result.groups[0].id).toBe('deleted');
  });
  it('builds seven distinct calendar days over the clock change', () => {
    const result = protectionStats([], Date.parse('2026-10-26T00:15:00Z'), 'Europe/Kyiv');
    const dates = result.summary.last7Days.map(day => day.dayKey);
    expect(dates).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']);
  });
});

describe('attempt trends', () => {
  it('groups real starts into local calendar days and rolling weeks across a clock change', () => {
    const current = Date.parse('2026-10-26T12:00:00Z');
    const history = protectionStats([
      event('current:intervened', 'intervened', Date.parse('2026-10-26T09:00:00Z')),
      event('previous:intervened', 'intervened', Date.parse('2026-10-15T09:00:00Z')),
      event('previous2:intervened', 'intervened', Date.parse('2026-10-14T09:00:00Z')),
      event('older:continued', 'continued', Date.parse('2026-10-13T09:00:00Z')),
    ], current, 'Europe/Kyiv').history;
    const trend = attemptTrend(history, current, 'Europe/Kyiv');
    expect(trend.current).toBe(1);
    expect(trend.previous).toBe(2);
    expect(trend.change).toBe(-50);
    expect(trend.days[6].attempts).toBe(1);
    expect(trend.weeks).toHaveLength(8);
  });
  it('does not invent a comparison when there is not enough history', () => {
    const history = protectionStats([event('current', 'intervened')], now, 'UTC').history;
    expect(attemptTrend(history, now, 'UTC').change).toBeNull();
  });
});
