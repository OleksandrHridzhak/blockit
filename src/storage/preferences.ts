import { Locale } from '@/i18n/strings';
import { diagnosticJournal } from '@/features/diagnostics/journal';
import { BlockitBridge } from '../../modules/blockit-bridge';

export interface UserPreferences {
  locale: Locale;
  isPro: boolean;
  hasCompletedOnboarding: boolean;
  blockedDomains: string[];
}

const PREFS_KEY = 'preferences';

const DEFAULT_PREFS: UserPreferences = {
  locale: 'uk',
  isPro: false,
  hasCompletedOnboarding: false,
  blockedDomains: ['instagram.com', 'tiktok.com'],
};

export function getUserPreferences(): UserPreferences {
  const raw = BlockitBridge.getString(PREFS_KEY);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      locale: parsed.locale === 'en' || parsed.locale === 'uk' ? parsed.locale : DEFAULT_PREFS.locale,
      isPro: Boolean(parsed.isPro),
      hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
      blockedDomains: Array.isArray(parsed.blockedDomains)
        ? parsed.blockedDomains
        : DEFAULT_PREFS.blockedDomains,
    };
  } catch (error) {
    diagnosticJournal.record('preferences-read-error', { error }, 'error');
    return { ...DEFAULT_PREFS };
  }
}

export function saveUserPreferences(patch: Partial<UserPreferences>): UserPreferences {
  const current = getUserPreferences();
  const next: UserPreferences = {
    ...current,
    ...patch,
  };
  BlockitBridge.setString(PREFS_KEY, JSON.stringify(next));
  return next;
}
