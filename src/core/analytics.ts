import { getLocalTimeParts } from './time';
import { HistoryEvent } from '@/storage/repository';

export interface DailyStatBucket {
  dayKey: string; // YYYY-MM-DD
  label: string; // e.g. 'Thu'
  interventions: number;
  dismissed: number;
  continued: number;
}

export interface AnalyticsSummary {
  totalInterventions: number;
  totalDismissed: number;
  totalContinued: number;
  mindfulRatePercent: number;
  estimatedSavedMinutes: number;
  last7Days: DailyStatBucket[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MINUTES_SAVED_PER_DISMISSAL = 8;

export function computeAnalyticsSummary(
  events: readonly HistoryEvent[],
  nowMs: number,
  timeZone: string = 'UTC'
): AnalyticsSummary {
  const bucketsByDay = new Map<string, DailyStatBucket>();
  const last7Days: DailyStatBucket[] = [];
  const localToday = getLocalTimeParts(nowMs, timeZone).dayKey;
  const calendarAnchor = Date.parse(`${localToday}T12:00:00Z`);

  for (let offset = 6; offset >= 0; offset--) {
    // Step through calendar dates rather than elapsed local hours across DST.
    const ts = calendarAnchor - offset * 24 * 60 * 60 * 1000;
    const parts = getLocalTimeParts(ts, 'UTC');
    if (!bucketsByDay.has(parts.dayKey)) {
      const bucket: DailyStatBucket = {
        dayKey: parts.dayKey,
        label: WEEKDAY_LABELS[parts.dayOfWeek] ?? parts.dayKey.slice(5),
        interventions: 0,
        dismissed: 0,
        continued: 0,
      };
      bucketsByDay.set(parts.dayKey, bucket);
      last7Days.push(bucket);
    }
  }

  let totalInterventions = 0;
  let totalDismissed = 0;
  let totalContinued = 0;

  for (const ev of events) {
    const { dayKey } = getLocalTimeParts(ev.timestampMs, timeZone);
    const bucket = bucketsByDay.get(dayKey);

    if (ev.outcome === 'intervened') {
      totalInterventions++;
      if (bucket) bucket.interventions++;
    } else if (ev.outcome === 'dismissed') {
      totalDismissed++;
      if (bucket) bucket.dismissed++;
    } else if (ev.outcome === 'continued') {
      totalContinued++;
      if (bucket) bucket.continued++;
    }
  }

  const decisionsCount = totalDismissed + totalContinued;
  const mindfulRatePercent =
    decisionsCount > 0 ? Math.round((totalDismissed / decisionsCount) * 100) : 0;

  return {
    totalInterventions,
    totalDismissed,
    totalContinued,
    mindfulRatePercent,
    estimatedSavedMinutes: totalDismissed * MINUTES_SAVED_PER_DISMISSAL,
    last7Days,
  };
}
