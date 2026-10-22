import { BlockitBridge } from '../../../modules/blockit-bridge';
import { getUserPreferences, saveUserPreferences } from '../preferences';
import {
  getAllAppConfigs,
  getAllAppUsageStates,
  getAppConfig,
  getAppUsageState,
  getHistoryEvents,
  getWidgetSnapshot,
  logInterventionContinued,
  logInterventionDismissed,
  logInterventionStarted,
  saveAppConfig,
} from '../repository';

const NOW = Date.parse('2026-10-22T12:00:00Z');

describe('storage repository & bridge fallback', () => {
  beforeEach(() => {
    BlockitBridge.__resetFallbackForTests();
  });

  it('returns default catalog configs and persists modified config', () => {
    const all = getAllAppConfigs();
    expect(all.instagram.enabled).toBe(true);
    expect(all.instagram.baseDurationSec).toBe(6);

    saveAppConfig({
      ...all.instagram,
      enabled: false,
      baseDurationSec: 15,
      interventionType: 'typing',
    });

    const reloaded = getAppConfig('Instagram');
    expect(reloaded.enabled).toBe(false);
    expect(reloaded.baseDurationSec).toBe(15);
    expect(reloaded.interventionType).toBe('typing');
  });

  it('logs intervention lifecycle and syncs native bypass timestamp', () => {
    logInterventionStarted('instagram', 6, NOW, 'UTC');
    let state = getAppUsageState('instagram', NOW, 'UTC');
    expect(state.attemptsToday).toBe(1);

    logInterventionDismissed('instagram', NOW + 2000, 'UTC');
    state = getAppUsageState('instagram', NOW + 2000, 'UTC');
    expect(state.dismissalsToday).toBe(1);
    expect(BlockitBridge.getBypassUntil('instagram')).toBeNull();

    logInterventionContinued('instagram', 5, NOW + 5000, 'UTC');
    state = getAppUsageState('instagram', NOW + 5000, 'UTC');
    expect(state.opensToday).toBe(1);
    expect(BlockitBridge.getBypassUntil('instagram')).toBe(NOW + 5000 + 5 * 60_000);

    const allStates = getAllAppUsageStates(NOW + 5000, 'UTC');
    expect(allStates.instagram.opensToday).toBe(1);

    const history = getHistoryEvents();
    expect(history).toHaveLength(3);
    expect(history[0].outcome).toBe('continued');
    expect(history[1].outcome).toBe('dismissed');
    expect(history[2].outcome).toBe('intervened');

    const snapshot = getWidgetSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.attemptsToday).toBe(1);
    expect(snapshot?.mindfulExitsToday).toBe(1);
    expect(snapshot?.savedMinutesToday).toBe(8);
    expect(snapshot?.mindfulRatePercent).toBe(50);
  });

  it('persists user preferences (locale, pro mode, blocked domains)', () => {
    const initial = getUserPreferences();
    expect(initial.locale).toBe('uk');
    expect(initial.isPro).toBe(false);

    const updated = saveUserPreferences({ locale: 'en', isPro: true });
    expect(updated.locale).toBe('en');
    expect(updated.isPro).toBe(true);
    expect(getUserPreferences().locale).toBe('en');
  });
});
