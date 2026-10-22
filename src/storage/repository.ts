import { APP_CATALOG } from '@/core/catalog';
import {
  createDefaultAppConfig,
  createInitialUsageState,
  normalizeUsageState,
  recordContinued,
  recordDismissed,
  recordInterveneTriggered,
} from '@/core/rules-engine';
import { AppRuleConfig, AppUsageState } from '@/core/types';
import { BlockitBridge } from '../../modules/blockit-bridge';

export interface HistoryEvent {
  id: string;
  appId: string;
  timestampMs: number;
  outcome: 'intervened' | 'dismissed' | 'continued' | 'blocked';
  durationSec?: number;
  bypassMinutes?: number;
}

const CONFIGS_KEY = 'configs';
const STATES_KEY = 'states';
const HISTORY_KEY = 'history';
const MAX_HISTORY_EVENTS = 500;

function readJson<T>(key: string, fallback: T): T {
  const raw = BlockitBridge.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  BlockitBridge.setString(key, JSON.stringify(value));
}

export function getAllAppConfigs(): Record<string, AppRuleConfig> {
  const stored = readJson<Record<string, AppRuleConfig>>(CONFIGS_KEY, {});
  const merged: Record<string, AppRuleConfig> = {};

  for (const app of APP_CATALOG) {
    merged[app.id] = stored[app.id] ?? createDefaultAppConfig(app.id);
  }
  for (const [id, cfg] of Object.entries(stored)) {
    if (!merged[id]) merged[id] = cfg;
  }
  return merged;
}

export function getAppConfig(appId: string): AppRuleConfig {
  const cleanId = appId.trim().toLowerCase();
  const all = getAllAppConfigs();
  return all[cleanId] ?? createDefaultAppConfig(cleanId);
}

export function saveAppConfig(config: AppRuleConfig): AppRuleConfig {
  const cleanId = config.appId.trim().toLowerCase();
  const normalized: AppRuleConfig = { ...config, appId: cleanId };
  const all = readJson<Record<string, AppRuleConfig>>(CONFIGS_KEY, {});
  all[cleanId] = normalized;
  writeJson(CONFIGS_KEY, all);
  BlockitBridge.setAppEnabled(cleanId, normalized.enabled);
  return normalized;
}

export function getAppUsageState(
  appId: string,
  nowMs: number = Date.now(),
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
): AppUsageState {
  const cleanId = appId.trim().toLowerCase();
  const all = readJson<Record<string, AppUsageState>>(STATES_KEY, {});
  const existing = all[cleanId] ?? createInitialUsageState(nowMs, timeZone);

  // Sync native bypass key in case it was read/updated
  const nativeBypass = BlockitBridge.getBypassUntil(cleanId);
  const mergedState: AppUsageState = {
    ...existing,
    bypassUntilMs: nativeBypass ?? existing.bypassUntilMs,
  };

  return normalizeUsageState(mergedState, nowMs, timeZone);
}

export function saveAppUsageState(appId: string, state: AppUsageState): void {
  const cleanId = appId.trim().toLowerCase();
  const all = readJson<Record<string, AppUsageState>>(STATES_KEY, {});
  all[cleanId] = state;
  writeJson(STATES_KEY, all);
  BlockitBridge.setBypassUntil(cleanId, state.bypassUntilMs);
}

export function getAllAppUsageStates(
  nowMs: number = Date.now(),
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
): Record<string, AppUsageState> {
  const result: Record<string, AppUsageState> = {};
  for (const app of APP_CATALOG) {
    result[app.id] = getAppUsageState(app.id, nowMs, timeZone);
  }
  return result;
}

export function getHistoryEvents(): HistoryEvent[] {
  return readJson<HistoryEvent[]>(HISTORY_KEY, []);
}

function appendHistoryEvent(event: Omit<HistoryEvent, 'id'>): void {
  const events = getHistoryEvents();
  const next: HistoryEvent = {
    ...event,
    id: `${event.timestampMs}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const trimmed = [next, ...events].slice(0, MAX_HISTORY_EVENTS);
  writeJson(HISTORY_KEY, trimmed);
}

export function logInterventionStarted(
  appId: string,
  durationSec: number,
  nowMs: number = Date.now(),
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
): AppUsageState {
  const current = getAppUsageState(appId, nowMs, timeZone);
  const next = recordInterveneTriggered(current, nowMs, timeZone);
  saveAppUsageState(appId, next);
  appendHistoryEvent({
    appId: appId.trim().toLowerCase(),
    timestampMs: nowMs,
    outcome: 'intervened',
    durationSec,
  });
  return next;
}

export function logInterventionDismissed(
  appId: string,
  nowMs: number = Date.now(),
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
): AppUsageState {
  const current = getAppUsageState(appId, nowMs, timeZone);
  const next = recordDismissed(current, nowMs, timeZone);
  saveAppUsageState(appId, next);
  appendHistoryEvent({
    appId: appId.trim().toLowerCase(),
    timestampMs: nowMs,
    outcome: 'dismissed',
  });
  return next;
}

export function logInterventionContinued(
  appId: string,
  bypassMinutes: number,
  nowMs: number = Date.now(),
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
): AppUsageState {
  const current = getAppUsageState(appId, nowMs, timeZone);
  const next = recordContinued(current, bypassMinutes, nowMs, timeZone);
  saveAppUsageState(appId, next);
  appendHistoryEvent({
    appId: appId.trim().toLowerCase(),
    timestampMs: nowMs,
    outcome: 'continued',
    bypassMinutes,
  });
  return next;
}
