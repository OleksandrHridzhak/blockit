import { Platform } from 'react-native';
import { diagnosticJournal } from '@/features/diagnostics/journal';
import { APP_CATALOG } from '@/core/catalog';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { sessionMinutesOr } from '@/core/session-duration';
import { challengeCodeLength, challengeRounds, hasPauseTimer } from '@/core/pause-mode-settings';
import { type PauseMode, type ProtectionStatus, screenTime } from '@/features/screen-time/client';

const KEY = 'blockit.preview.v1';

export interface AppRule {
  seconds: number;
  mode: PauseMode;
  sessionMinutes?: number;
  escalating?: boolean;    // pause duration grows by +5s with each open today
  todayOpens?: number;     // number of opens today
  rounds?: number;
  mathRounds?: number;
  stroopRounds?: number;
  codeLength?: number;
}

export interface SubscriptionInfo {
  plan: string;
  status: 'active' | 'trial' | 'free';
  renewalDate: string;
}

export interface PreviewConfig {
  apps: string[];
  seconds: number;
  mode: PauseMode;
  enabled: boolean;
  appRules?: Record<string, AppRule>;
  snoozeUntil?: number | null;
  subscription?: SubscriptionInfo;
}

const defaultSubscription: SubscriptionInfo = {
  plan: 'Blockit Pro (Річна підписка)',
  status: 'active',
  renewalDate: '26 жовтня 2027',
};

const initial: PreviewConfig = {
  apps: [],
  seconds: 20,
  mode: 'countdown',
  enabled: true,
  appRules: {},
  snoozeUntil: null,
  subscription: defaultSubscription,
};

export const previewApps = APP_CATALOG.map((app) => ({ id: app.id, name: app.name }));

export function readPreview(): PreviewConfig {
  try {
    const raw =
      Platform.OS === 'web' && typeof localStorage !== 'undefined'
        ? localStorage.getItem(KEY)
        : BlockitBridge.getString(KEY);
    if (!raw) return { ...initial, apps: [], appRules: {} };
    const saved = JSON.parse(raw) as Partial<PreviewConfig>;

    const appRules: Record<string, AppRule> = {};
    if (saved.appRules && typeof saved.appRules === 'object') {
      for (const [id, r] of Object.entries(saved.appRules)) {
        if (r && typeof r === 'object') {
          appRules[id] = {
            seconds: (Number.isInteger(r.seconds) && r.seconds >= 1 && r.seconds <= 86400) ? r.seconds : 20,
            mode:
              r.mode === 'typing' ||
              r.mode === 'reflection' ||
              r.mode === 'breathing' ||
              r.mode === 'math' ||
              r.mode === 'passcode' ||
              r.mode === 'stroop'
              || r.mode === 'microlearning'
              || r.mode === 'microlearning-v2'
                ? r.mode
                : 'countdown',
            sessionMinutes: sessionMinutesOr(r.sessionMinutes),
            escalating: Boolean(r.escalating),
            todayOpens: typeof r.todayOpens === 'number' ? r.todayOpens : 0,
            rounds: challengeRounds(r.rounds),
            mathRounds: challengeRounds(r.mathRounds ?? r.rounds),
            stroopRounds: challengeRounds(r.stroopRounds ?? r.rounds),
            codeLength: challengeCodeLength(r.codeLength),
          };
        }
      }
    }

    const snoozeUntil =
      typeof saved.snoozeUntil === 'number' && saved.snoozeUntil > Date.now()
        ? saved.snoozeUntil
        : null;

    return {
      apps: Array.isArray(saved.apps)
        ? [...new Set(saved.apps.filter((id) => previewApps.some((app) => app.id === id)))]
        : [],
      seconds: (Number.isInteger(saved.seconds ?? 0) && (saved.seconds ?? 0) >= 1 && (saved.seconds ?? 0) <= 86400) ? saved.seconds! : 20,
      mode:
        saved.mode === 'typing' ||
        saved.mode === 'reflection' ||
        saved.mode === 'breathing' ||
        saved.mode === 'math' ||
        saved.mode === 'passcode' ||
        saved.mode === 'stroop'
        || saved.mode === 'microlearning'
        || saved.mode === 'microlearning-v2'
          ? saved.mode
          : 'countdown',
      enabled: saved.enabled !== false,
      appRules,
      snoozeUntil,
      subscription: saved.subscription ?? defaultSubscription,
    };
  } catch (error) {
    diagnosticJournal.record('preview-read-error', { error }, 'error');
    return { ...initial, apps: [], appRules: {} };
  }
}

export function savePreview(patch: Partial<PreviewConfig>): void {
  const next = { ...readPreview(), ...patch };
  const raw = JSON.stringify(next);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, raw);
  } else {
    BlockitBridge.setString(KEY, raw);
  }
}

export function setGlobalSnooze(minutes: number | null): void {
  const snoozeUntil = minutes && minutes > 0 ? Date.now() + minutes * 60_000 : null;
  savePreview({ snoozeUntil });
}

export function getAppRule(appId?: string | null): AppRule {
  const preview = readPreview();
  if (appId && preview.appRules?.[appId]) {
    return {
      sessionMinutes: 5,
      escalating: false,
      todayOpens: 0,
      ...preview.appRules[appId],
    };
  }
  return {
    seconds: 20,
    mode: 'countdown',
    sessionMinutes: 5,
    escalating: false,
    todayOpens: 0,
  };
}

export function getEffectiveSeconds(rule: AppRule): number {
  if (!hasPauseTimer(rule.mode)) return 0;
  if (rule.mode !== 'countdown' || !rule.escalating) return rule.seconds;
  const count = rule.todayOpens ?? 0;
  return Math.max(rule.seconds, Math.min(86400, rule.seconds + count * 5));
}

export function saveAppRule(
  appId: string,
  rule: AppRule
): void {
  const current = readPreview();
  const nextAppRules: Record<string, AppRule> = { ...(current.appRules ?? {}) };
  nextAppRules[appId] = {
    seconds: (Number.isInteger(rule.seconds) && rule.seconds >= 1 && rule.seconds <= 86400) ? rule.seconds : 20,
    mode: rule.mode,
    sessionMinutes: sessionMinutesOr(rule.sessionMinutes),
    escalating: Boolean(rule.escalating),
    todayOpens: typeof rule.todayOpens === 'number' ? rule.todayOpens : 0,
    rounds: challengeRounds(rule.rounds),
    mathRounds: challengeRounds(rule.mathRounds ?? rule.rounds),
    stroopRounds: challengeRounds(rule.stroopRounds ?? rule.rounds),
    codeLength: challengeCodeLength(rule.codeLength),
  };
  savePreview({ appRules: nextAppRules });
}

export function recordAppOpen(appId: string): void {
  const cleanId = appId.trim().toLowerCase();
  const rule = getAppRule(cleanId);
  saveAppRule(cleanId, {
    ...rule,
    todayOpens: (rule.todayOpens ?? 0) + 1,
  });
}

export function removeAppFromPreview(appId: string): void {
  const current = readPreview();
  const cleanId = appId.trim().toLowerCase();
  const nextApps = current.apps.filter((id) => id.toLowerCase() !== cleanId);
  const nextAppRules: Record<string, AppRule> = { ...(current.appRules ?? {}) };
  delete nextAppRules[cleanId];
  savePreview({ apps: nextApps, appRules: nextAppRules });
}

export interface ProtectionView extends ProtectionStatus {
  demo: boolean;
  apps: string[];
  appRules?: Record<string, AppRule>;
  snoozeUntil?: number | null;
  subscription?: SubscriptionInfo;
}

export async function loadProtectionView(): Promise<ProtectionView> {
  const status = await screenTime.status();
  const preview = readPreview();
  if (status.available) {
    const apps = await screenTime.selectedApps();
    return {
      ...status,
      demo: false,
      apps: apps.map(app => app.id),
      appRules: Object.fromEntries(apps.map(app => [app.id, { seconds: app.seconds, mode: app.mode }])),
      snoozeUntil: preview.snoozeUntil,
      subscription: preview.subscription,
    };
  }
  return {
    ...status,
    ...preview,
    count: preview.apps.length,
    demo: true,
  };
}

export async function saveRule(
  view: ProtectionView,
  patch: Partial<Pick<PreviewConfig, 'enabled' | 'seconds' | 'mode'>>,
  targetAppId?: string
): Promise<void> {
  if (targetAppId) {
    saveAppRule(targetAppId, {
      seconds: patch.seconds ?? 20,
      mode: patch.mode ?? 'countdown',
    });
    return;
  }

  if (view.demo) {
    savePreview(patch);
    return;
  }
  await screenTime.save(
    patch.enabled ?? view.enabled,
    patch.seconds ?? view.seconds,
    patch.mode ?? view.mode
  );
}
