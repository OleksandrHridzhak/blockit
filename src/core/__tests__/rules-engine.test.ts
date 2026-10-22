import { getAppDisplayName, getCatalogApp, APP_CATALOG } from '../catalog';
import {
  createDefaultAppConfig,
  createInitialUsageState,
  decide,
  isWindowActive,
  normalizeUsageState,
  recordContinued,
  recordDismissed,
  recordInterveneTriggered,
} from '../rules-engine';
import { formatDayKey, getLocalTimeParts } from '../time';
import { AppRuleConfig, AppUsageState, ScheduleWindow } from '../types';

// 2026-10-22T12:00:00Z = Thursday 12:00 UTC (15:00 in Europe/Kyiv EEST)
const THU_NOON_UTC = Date.parse('2026-10-22T12:00:00Z');

describe('time helpers', () => {
  it('formats dayKey and local time parts in UTC', () => {
    const parts = getLocalTimeParts(THU_NOON_UTC, 'UTC');
    expect(parts).toEqual({
      dayKey: '2026-10-22',
      dayOfWeek: 4, // Thursday
      minuteOfDay: 12 * 60,
    });
    expect(formatDayKey(THU_NOON_UTC)).toBe('2026-10-22');
  });

  it('converts across timezone midnight boundary (UTC vs Europe/Kyiv)', () => {
    // 2026-10-22T22:30:00Z is already 2026-10-23 01:30 in Kyiv (+03:00)
    const ts = Date.parse('2026-10-22T22:30:00Z');
    const utcParts = getLocalTimeParts(ts, 'UTC');
    const kyivParts = getLocalTimeParts(ts, 'Europe/Kyiv');

    expect(utcParts.dayKey).toBe('2026-10-22');
    expect(utcParts.dayOfWeek).toBe(4);
    expect(utcParts.minuteOfDay).toBe(22 * 60 + 30);

    expect(kyivParts.dayKey).toBe('2026-10-23');
    expect(kyivParts.dayOfWeek).toBe(5); // Friday
    expect(kyivParts.minuteOfDay).toBe(1 * 60 + 30);
  });

  it('handles midnight hour=00 properly', () => {
    const midnightUtc = Date.parse('2026-10-22T00:05:00Z');
    const parts = getLocalTimeParts(midnightUtc, 'UTC');
    expect(parts.minuteOfDay).toBe(5);
  });

  it('defaults to UTC when timeZone is omitted', () => {
    const parts = getLocalTimeParts(THU_NOON_UTC);
    expect(parts.dayKey).toBe('2026-10-22');
    expect(parts.dayOfWeek).toBe(4);
  });

  it('handles US DST transition and Pacific negative offset', () => {
    // 2026-10-22T02:00:00Z is still 2026-10-21 19:00 in America/Los_Angeles (PDT, -07:00)
    const ts = Date.parse('2026-10-22T02:00:00Z');
    const la = getLocalTimeParts(ts, 'America/Los_Angeles');
    expect(la.dayKey).toBe('2026-10-21');
    expect(la.dayOfWeek).toBe(3); // Wednesday
    expect(la.minuteOfDay).toBe(19 * 60);
  });
});

describe('isWindowActive (schedule evaluation)', () => {
  const workHours: ScheduleWindow = {
    days: [1, 2, 3, 4, 5], // Mon..Fri
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    mode: 'intervene',
  };

  it('matches inside daytime window on a configured weekday', () => {
    expect(isWindowActive(workHours, 1, 9 * 60)).toBe(true);
    expect(isWindowActive(workHours, 4, 14 * 60 + 30)).toBe(true);
  });

  it('excludes exact endMinute and outside hours', () => {
    expect(isWindowActive(workHours, 1, 8 * 60 + 59)).toBe(false);
    expect(isWindowActive(workHours, 1, 17 * 60)).toBe(false);
  });

  it('excludes non-configured days (weekend)', () => {
    expect(isWindowActive(workHours, 0, 12 * 60)).toBe(false);
    expect(isWindowActive(workHours, 6, 12 * 60)).toBe(false);
  });

  it('returns false when days array is empty', () => {
    expect(
      isWindowActive({ ...workHours, days: [] }, 1, 12 * 60)
    ).toBe(false);
  });

  it('treats startMinute === endMinute as full 24h on configured days', () => {
    const allDaySun: ScheduleWindow = {
      days: [0],
      startMinute: 0,
      endMinute: 0,
      mode: 'strict_block',
    };
    expect(isWindowActive(allDaySun, 0, 0)).toBe(true);
    expect(isWindowActive(allDaySun, 0, 23 * 60 + 59)).toBe(true);
    expect(isWindowActive(allDaySun, 1, 10)).toBe(false);
  });

  describe('overnight window (e.g. 22:00 -> 07:00)', () => {
    const sleepWindow: ScheduleWindow = {
      days: [0, 1, 2, 3, 4], // Sun..Thu nights
      startMinute: 22 * 60,
      endMinute: 7 * 60,
      mode: 'strict_block',
    };

    it('matches late evening on start day', () => {
      expect(isWindowActive(sleepWindow, 4, 22 * 60)).toBe(true);
      expect(isWindowActive(sleepWindow, 4, 23 * 60 + 45)).toBe(true);
    });

    it('matches early morning on next day (Friday morning after Thursday night)', () => {
      expect(isWindowActive(sleepWindow, 5, 0)).toBe(true);
      expect(isWindowActive(sleepWindow, 5, 6 * 60 + 59)).toBe(true);
      expect(isWindowActive(sleepWindow, 5, 7 * 60)).toBe(false);
    });

    it('does not match Friday late evening or Saturday morning', () => {
      expect(isWindowActive(sleepWindow, 5, 23 * 60)).toBe(false);
      expect(isWindowActive(sleepWindow, 6, 3 * 60)).toBe(false);
    });

    it('wraps Sunday morning from Saturday night when Saturday is included', () => {
      const satNight: ScheduleWindow = {
        days: [6],
        startMinute: 23 * 60,
        endMinute: 6 * 60,
        mode: 'intervene',
      };
      expect(isWindowActive(satNight, 0, 2 * 60)).toBe(true);
    });
  });
});

describe('normalizeUsageState', () => {
  it('keeps state unchanged on the same day with no bypass', () => {
    const state = createInitialUsageState(THU_NOON_UTC);
    expect(normalizeUsageState(state, THU_NOON_UTC)).toBe(state);
  });

  it('clears expired bypass on the same day', () => {
    const state: AppUsageState = {
      dayKey: '2026-10-22',
      attemptsToday: 3,
      opensToday: 2,
      dismissalsToday: 1,
      bypassUntilMs: THU_NOON_UTC - 1000,
    };
    const next = normalizeUsageState(state, THU_NOON_UTC);
    expect(next.bypassUntilMs).toBeNull();
    expect(next.attemptsToday).toBe(3);
  });

  it('resets counters across midnight while keeping still-active bypass', () => {
    const activeUntil = THU_NOON_UTC + 60_000;
    const prevDayState: AppUsageState = {
      dayKey: '2026-10-21',
      attemptsToday: 9,
      opensToday: 4,
      dismissalsToday: 5,
      bypassUntilMs: activeUntil,
    };
    const next = normalizeUsageState(prevDayState, THU_NOON_UTC);
    expect(next).toEqual({
      dayKey: '2026-10-22',
      attemptsToday: 0,
      opensToday: 0,
      dismissalsToday: 0,
      bypassUntilMs: activeUntil,
    });
  });
});

describe('decide()', () => {
  const baseConfig: AppRuleConfig = createDefaultAppConfig('instagram');
  const freshState: AppUsageState = createInitialUsageState(THU_NOON_UTC);

  it('allows when config is null/undefined or disabled', () => {
    expect(decide({ appId: 'instagram' }, null, freshState, THU_NOON_UTC)).toEqual({
      kind: 'allow',
      reason: 'disabled',
    });
    expect(
      decide(
        { appId: 'instagram' },
        { ...baseConfig, enabled: false },
        freshState,
        THU_NOON_UTC
      )
    ).toEqual({
      kind: 'allow',
      reason: 'disabled',
    });
  });

  it('allows when bypass is active and returns remaining ms', () => {
    const state: AppUsageState = {
      ...freshState,
      bypassUntilMs: THU_NOON_UTC + 180_000,
    };
    expect(decide({ appId: 'instagram' }, baseConfig, state, THU_NOON_UTC)).toEqual({
      kind: 'allow',
      reason: 'bypass_active',
      remainingBypassMs: 180_000,
    });
  });

  it('intervenes when bypass has expired at exact timestamp', () => {
    const state: AppUsageState = {
      ...freshState,
      bypassUntilMs: THU_NOON_UTC,
    };
    const res = decide({ appId: 'instagram' }, baseConfig, state, THU_NOON_UTC);
    expect(res.kind).toBe('intervene');
  });

  it('calculates escalated duration and caps at maxDurationSec', () => {
    // base=6, step=2, max=12
    const cfg: AppRuleConfig = {
      ...baseConfig,
      baseDurationSec: 6,
      escalationStepSec: 2,
      maxDurationSec: 12,
    };

    const d0 = decide({ appId: 'instagram' }, cfg, { ...freshState, attemptsToday: 0 }, THU_NOON_UTC);
    const d2 = decide({ appId: 'instagram' }, cfg, { ...freshState, attemptsToday: 2 }, THU_NOON_UTC);
    const d10 = decide({ appId: 'instagram' }, cfg, { ...freshState, attemptsToday: 10 }, THU_NOON_UTC);

    expect(d0).toEqual({
      kind: 'intervene',
      interventionType: 'breathing',
      durationSec: 6,
      attemptNo: 1,
      limitReached: false,
    });
    expect(d2).toEqual({
      kind: 'intervene',
      interventionType: 'breathing',
      durationSec: 10,
      attemptNo: 3,
      limitReached: false,
    });
    expect(d10).toEqual({
      kind: 'intervene',
      interventionType: 'breathing',
      durationSec: 12, // capped
      attemptNo: 11,
      limitReached: false,
    });
  });

  it('flags limitReached in non-strict mode when dailyOpenLimit is hit', () => {
    const cfg: AppRuleConfig = {
      ...baseConfig,
      dailyOpenLimit: 3,
      strictMode: false,
    };
    const state: AppUsageState = { ...freshState, opensToday: 3, attemptsToday: 4 };
    expect(decide({ appId: 'instagram' }, cfg, state, THU_NOON_UTC)).toEqual({
      kind: 'intervene',
      interventionType: 'breathing',
      durationSec: 14,
      attemptNo: 5,
      limitReached: true,
    });
  });

  it('blocks in strictMode when dailyOpenLimit is reached', () => {
    const cfg: AppRuleConfig = {
      ...baseConfig,
      dailyOpenLimit: 3,
      strictMode: true,
    };
    const state: AppUsageState = { ...freshState, opensToday: 3, attemptsToday: 5 };
    expect(decide({ appId: 'instagram' }, cfg, state, THU_NOON_UTC)).toEqual({
      kind: 'block',
      reason: 'daily_limit_reached',
      attemptNo: 6,
    });
  });

  it('allows outside schedule and blocks during strict_block schedule', () => {
    const cfg: AppRuleConfig = {
      ...baseConfig,
      schedules: [
        {
          days: [4], // Thursday
          startMinute: 13 * 60,
          endMinute: 15 * 60,
          mode: 'strict_block',
        },
      ],
    };

    // 12:00 UTC -> outside schedule
    expect(decide({ appId: 'instagram' }, cfg, freshState, THU_NOON_UTC)).toEqual({
      kind: 'allow',
      reason: 'outside_schedule',
    });

    // 13:30 UTC -> strict_block
    const insideStrict = Date.parse('2026-10-22T13:30:00Z');
    expect(decide({ appId: 'instagram' }, cfg, freshState, insideStrict)).toEqual({
      kind: 'block',
      reason: 'strict_schedule',
      attemptNo: 1,
    });
  });

  it('intervenes when inside an intervene-mode schedule window', () => {
    const cfg: AppRuleConfig = {
      ...baseConfig,
      schedules: [
        {
          days: [4],
          startMinute: 10 * 60,
          endMinute: 18 * 60,
          mode: 'intervene',
        },
      ],
    };
    const res = decide({ appId: 'instagram' }, cfg, freshState, THU_NOON_UTC);
    expect(res.kind).toBe('intervene');
  });
});

describe('state transitions', () => {
  it('increments attempts, dismissals, and opens with bypass', () => {
    let state = createInitialUsageState(THU_NOON_UTC);

    state = recordInterveneTriggered(state, THU_NOON_UTC);
    expect(state.attemptsToday).toBe(1);

    state = recordDismissed(state, THU_NOON_UTC + 5000);
    expect(state.dismissalsToday).toBe(1);
    expect(state.bypassUntilMs).toBeNull();

    state = recordInterveneTriggered(state, THU_NOON_UTC + 10_000);
    state = recordContinued(state, 5, THU_NOON_UTC + 16_000);
    expect(state.attemptsToday).toBe(2);
    expect(state.opensToday).toBe(1);
    expect(state.bypassUntilMs).toBe(THU_NOON_UTC + 16_000 + 5 * 60_000);

    // Zero-minute bypass does not set bypassUntilMs
    state = recordContinued(state, 0, THU_NOON_UTC + 20_000);
    expect(state.opensToday).toBe(2);
    expect(state.bypassUntilMs).toBeNull();
  });

  it('clamps negative bypassMinutes to null bypass', () => {
    const state = createInitialUsageState(THU_NOON_UTC);
    const next = recordContinued(state, -10, THU_NOON_UTC);
    expect(next.opensToday).toBe(1);
    expect(next.bypassUntilMs).toBeNull();
  });

  it('resets daily counters when recordInterveneTriggered or recordDismissed crosses midnight', () => {
    const prevDay: AppUsageState = {
      dayKey: '2026-10-21',
      attemptsToday: 5,
      opensToday: 3,
      dismissalsToday: 2,
      bypassUntilMs: null,
    };
    const afterAttempt = recordInterveneTriggered(prevDay, THU_NOON_UTC);
    expect(afterAttempt.dayKey).toBe('2026-10-22');
    expect(afterAttempt.attemptsToday).toBe(1);
    expect(afterAttempt.opensToday).toBe(0);

    const afterDismiss = recordDismissed(prevDay, THU_NOON_UTC);
    expect(afterDismiss.dayKey).toBe('2026-10-22');
    expect(afterDismiss.dismissalsToday).toBe(1);
    expect(afterDismiss.attemptsToday).toBe(0);
  });

  it('enforces minimum 1s duration even if config has 0s base and 0s step', () => {
    const base = createDefaultAppConfig('youtube');
    const zeroCfg: AppRuleConfig = {
      ...base,
      baseDurationSec: 0,
      escalationStepSec: 0,
    };
    const state = createInitialUsageState(THU_NOON_UTC);
    const res = decide({ appId: 'youtube' }, zeroCfg, state, THU_NOON_UTC);
    expect(res).toEqual({
      kind: 'intervene',
      interventionType: 'breathing',
      durationSec: 1,
      attemptNo: 1,
      limitReached: false,
    });
  });

  it('prioritizes strict_block when multiple overlapping schedule windows match', () => {
    const base = createDefaultAppConfig('tiktok');
    const cfg: AppRuleConfig = {
      ...base,
      schedules: [
        { days: [4], startMinute: 8 * 60, endMinute: 20 * 60, mode: 'intervene' },
        { days: [4], startMinute: 11 * 60, endMinute: 13 * 60, mode: 'strict_block' },
      ],
    };
    const state = createInitialUsageState(THU_NOON_UTC);
    expect(decide({ appId: 'tiktok' }, cfg, state, THU_NOON_UTC)).toEqual({
      kind: 'block',
      reason: 'strict_schedule',
      attemptNo: 1,
    });
  });
});

describe('catalog helpers', () => {
  it('finds known apps case-insensitively and falls back gracefully', () => {
    expect(APP_CATALOG.length).toBeGreaterThanOrEqual(8);
    expect(getCatalogApp('Instagram')?.iosScheme).toBe('instagram://');
    expect(getCatalogApp('unknown-app')).toBeNull();
    expect(getAppDisplayName('tiktok')).toBe('TikTok');
    expect(getAppDisplayName('customapp')).toBe('Customapp');
    expect(getAppDisplayName('  ')).toBe('Unknown App');
  });
});
