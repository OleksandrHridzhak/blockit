import { getLocalTimeParts } from './time';
import {
  AppOpenEvent,
  AppRuleConfig,
  AppUsageState,
  Decision,
  ScheduleWindow,
} from './types';

export function createInitialUsageState(nowMs: number, timeZone: string = 'UTC'): AppUsageState {
  return {
    dayKey: getLocalTimeParts(nowMs, timeZone).dayKey,
    attemptsToday: 0,
    opensToday: 0,
    dismissalsToday: 0,
    bypassUntilMs: null,
  };
}

export function createDefaultAppConfig(appId: string): AppRuleConfig {
  return {
    appId,
    enabled: true,
    interventionType: 'breathing',
    baseDurationSec: 6,
    escalationStepSec: 2,
    maxDurationSec: 60,
    defaultBypassMinutes: 5,
    dailyOpenLimit: null,
    strictMode: false,
    schedules: [],
  };
}

/**
 * Resets daily counters when the local date changes across midnight,
 * preserving active bypass windows if they are still in the future.
 */
export function normalizeUsageState(
  state: AppUsageState,
  nowMs: number,
  timeZone: string = 'UTC'
): AppUsageState {
  const { dayKey } = getLocalTimeParts(nowMs, timeZone);
  const activeBypass =
    state.bypassUntilMs !== null && state.bypassUntilMs > nowMs ? state.bypassUntilMs : null;

  if (state.dayKey !== dayKey) {
    return {
      dayKey,
      attemptsToday: 0,
      opensToday: 0,
      dismissalsToday: 0,
      bypassUntilMs: activeBypass,
    };
  }

  if (activeBypass !== state.bypassUntilMs) {
    return {
      ...state,
      bypassUntilMs: activeBypass,
    };
  }

  return state;
}

/**
 * Checks whether a single schedule window is active at the given local dayOfWeek and minuteOfDay.
 * Handles same-day windows (`startMinute <= endMinute`) and overnight windows (`startMinute > endMinute`).
 */
export function isWindowActive(
  window: ScheduleWindow,
  dayOfWeek: number,
  minuteOfDay: number
): boolean {
  if (window.days.length === 0) return false;
  const { startMinute, endMinute } = window;

  if (startMinute === endMinute) {
    // Full 24h on matching day
    return window.days.includes(dayOfWeek);
  }

  if (startMinute < endMinute) {
    return (
      window.days.includes(dayOfWeek) &&
      minuteOfDay >= startMinute &&
      minuteOfDay < endMinute
    );
  }

  // Overnight window: e.g. 22:00 (1320) -> 07:00 (420)
  // Part A: on a configured start day, from startMinute until 24:00
  if (window.days.includes(dayOfWeek) && minuteOfDay >= startMinute) {
    return true;
  }
  // Part B: on the day following a configured start day, from 00:00 until endMinute
  const previousDay = (dayOfWeek + 6) % 7;
  if (window.days.includes(previousDay) && minuteOfDay < endMinute) {
    return true;
  }

  return false;
}

export function decide(
  _event: AppOpenEvent,
  config: AppRuleConfig | null | undefined,
  state: AppUsageState,
  nowMs: number,
  timeZone: string = 'UTC'
): Decision {
  if (!config || !config.enabled) {
    return { kind: 'allow', reason: 'disabled' };
  }

  const normalized = normalizeUsageState(state, nowMs, timeZone);

  if (normalized.bypassUntilMs !== null && nowMs < normalized.bypassUntilMs) {
    return {
      kind: 'allow',
      reason: 'bypass_active',
      remainingBypassMs: normalized.bypassUntilMs - nowMs,
    };
  }

  const { dayOfWeek, minuteOfDay } = getLocalTimeParts(nowMs, timeZone);

  if (config.schedules.length > 0) {
    const activeWindows = config.schedules.filter((w) =>
      isWindowActive(w, dayOfWeek, minuteOfDay)
    );
    if (activeWindows.length === 0) {
      return { kind: 'allow', reason: 'outside_schedule' };
    }
    if (activeWindows.some((w) => w.mode === 'strict_block')) {
      return {
        kind: 'block',
        reason: 'strict_schedule',
        attemptNo: normalized.attemptsToday + 1,
      };
    }
  }

  const attemptNo = normalized.attemptsToday + 1;
  const limitReached =
    config.dailyOpenLimit !== null && normalized.opensToday >= config.dailyOpenLimit;

  if (limitReached && config.strictMode) {
    return {
      kind: 'block',
      reason: 'daily_limit_reached',
      attemptNo,
    };
  }

  const rawDuration =
    config.baseDurationSec + config.escalationStepSec * normalized.attemptsToday;
  const durationSec = Math.min(config.maxDurationSec, Math.max(1, rawDuration));

  return {
    kind: 'intervene',
    interventionType: config.interventionType,
    durationSec,
    attemptNo,
    limitReached,
  };
}

export function recordInterveneTriggered(
  state: AppUsageState,
  nowMs: number,
  timeZone: string = 'UTC'
): AppUsageState {
  const normalized = normalizeUsageState(state, nowMs, timeZone);
  return {
    ...normalized,
    attemptsToday: normalized.attemptsToday + 1,
  };
}

export function recordDismissed(
  state: AppUsageState,
  nowMs: number,
  timeZone: string = 'UTC'
): AppUsageState {
  const normalized = normalizeUsageState(state, nowMs, timeZone);
  return {
    ...normalized,
    dismissalsToday: normalized.dismissalsToday + 1,
    bypassUntilMs: null,
  };
}

export function recordContinued(
  state: AppUsageState,
  bypassMinutes: number,
  nowMs: number,
  timeZone: string = 'UTC'
): AppUsageState {
  const normalized = normalizeUsageState(state, nowMs, timeZone);
  const clampedMinutes = Math.max(0, bypassMinutes);
  return {
    ...normalized,
    opensToday: normalized.opensToday + 1,
    bypassUntilMs: clampedMinutes > 0 ? nowMs + clampedMinutes * 60_000 : null,
  };
}
