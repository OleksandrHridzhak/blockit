import { computeAnalyticsSummary } from '../analytics';
import { HistoryEvent } from '@/storage/repository';

const THU_NOON_UTC = Date.parse('2026-10-22T12:00:00Z');

describe('computeAnalyticsSummary', () => {
  it('computes zeroes and 7 day buckets when history is empty', () => {
    const summary = computeAnalyticsSummary([], THU_NOON_UTC, 'UTC');
    expect(summary.totalInterventions).toBe(0);
    expect(summary.totalDismissed).toBe(0);
    expect(summary.totalContinued).toBe(0);
    expect(summary.mindfulRatePercent).toBe(0);
    expect(summary.estimatedSavedMinutes).toBe(0);
    expect(summary.last7Days).toHaveLength(7);
    expect(summary.last7Days[6].dayKey).toBe('2026-10-22');
    expect(summary.last7Days[6].label).toBe('Thu');
  });

  it('aggregates outcomes across 7-day window and calculates mindful rate', () => {
    const events: HistoryEvent[] = [
      { id: '1', appId: 'instagram', timestampMs: THU_NOON_UTC - 10_000, outcome: 'intervened' },
      { id: '2', appId: 'instagram', timestampMs: THU_NOON_UTC - 5_000, outcome: 'dismissed' },
      { id: '3', appId: 'tiktok', timestampMs: THU_NOON_UTC - 4_000, outcome: 'intervened' },
      { id: '4', appId: 'tiktok', timestampMs: THU_NOON_UTC - 2_000, outcome: 'dismissed' },
      { id: '5', appId: 'youtube', timestampMs: THU_NOON_UTC - 1_000, outcome: 'continued', bypassMinutes: 5 },
      // Event older than 7 days still counts in totals
      {
        id: '6',
        appId: 'x',
        timestampMs: THU_NOON_UTC - 10 * 24 * 60 * 60 * 1000,
        outcome: 'dismissed',
      },
    ];

    const summary = computeAnalyticsSummary(events, THU_NOON_UTC, 'UTC');
    expect(summary.totalInterventions).toBe(2);
    expect(summary.totalDismissed).toBe(3);
    expect(summary.totalContinued).toBe(1);
    expect(summary.mindfulRatePercent).toBe(75); // 3 / (3 + 1)
    expect(summary.estimatedSavedMinutes).toBe(24); // 3 * 8

    const todayBucket = summary.last7Days[6];
    expect(todayBucket.interventions).toBe(2);
    expect(todayBucket.dismissed).toBe(2);
    expect(todayBucket.continued).toBe(1);
  });
});
