import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_CATALOG } from '@/core/catalog';
import { AppRuleConfig, AppUsageState, InterventionType } from '@/core/types';
import { getTranslations, Locale } from '@/i18n/strings';
import {
  getUserPreferences,
  saveUserPreferences,
  UserPreferences,
} from '@/storage/preferences';
import {
  getAllAppConfigs,
  getAllAppUsageStates,
  saveAppConfig,
} from '@/storage/repository';

const INTERVENTION_TYPES: readonly { id: InterventionType; label: string }[] = [
  { id: 'breathing', label: 'Breathing' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'typing', label: 'Typing' },
];

export default function HomeScreen() {
  const [configs, setConfigs] = useState<Record<string, AppRuleConfig>>(() =>
    getAllAppConfigs()
  );
  const [states, setStates] = useState<Record<string, AppUsageState>>(() =>
    getAllAppUsageStates()
  );
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const t = getTranslations(prefs.locale);

  const refresh = useCallback(() => {
    const currentNow = Date.now();
    setNowMs(currentNow);
    setConfigs(getAllAppConfigs());
    setStates(getAllAppUsageStates(currentNow));
    setPrefs(getUserPreferences());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const toggleLocale = () => {
    const nextLocale: Locale = prefs.locale === 'uk' ? 'en' : 'uk';
    setPrefs(saveUserPreferences({ locale: nextLocale }));
  };

  const toggleEnabled = (appId: string, enabled: boolean) => {
    const current = configs[appId];
    if (!current) return;
    const updated = saveAppConfig({ ...current, enabled });
    setConfigs((prev) => ({ ...prev, [appId]: updated }));
  };

  const updateConfigField = <K extends keyof AppRuleConfig>(
    appId: string,
    key: K,
    value: AppRuleConfig[K]
  ) => {
    const current = configs[appId];
    if (!current) return;
    const updated = saveAppConfig({ ...current, [key]: value });
    setConfigs((prev) => ({ ...prev, [appId]: updated }));
  };

  const totalAttempts = Object.values(states).reduce((sum, s) => sum + s.attemptsToday, 0);
  const totalDismissals = Object.values(states).reduce(
    (sum, s) => sum + s.dismissalsToday,
    0
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <ThemedText type="title">{t.homeTitle}</ThemedText>
              <ThemedText type="small" style={styles.subtitle}>
                {t.homeSubtitle}
              </ThemedText>
            </View>
            <Pressable
              testID="toggle-locale"
              onPress={toggleLocale}
              style={styles.langPill}>
              <ThemedText type="smallBold">
                {prefs.locale === 'uk' ? '🇺🇦 UK' : '🇬🇧 EN'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <ThemedText type="subtitle" testID="home-total-attempts">
                {totalAttempts}
              </ThemedText>
              <ThemedText type="small" style={styles.subtitle}>
                {t.attemptsToday}
              </ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <ThemedText type="subtitle" testID="home-total-dismissed">
                {totalDismissals}
              </ThemedText>
              <ThemedText type="small" style={styles.subtitle}>
                {t.mindfulExits}
              </ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <ThemedText type="subtitle">{totalDismissals * 8}m</ThemedText>
              <ThemedText type="small" style={styles.subtitle}>
                {t.estSaved}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {t.guardedApps}
          </ThemedText>

          {APP_CATALOG.map((app) => {
            const cfg = configs[app.id];
            const st = states[app.id];
            const isExpanded = expandedAppId === app.id;
            const bypassRemainingMin =
              st?.bypassUntilMs && st.bypassUntilMs > nowMs
                ? Math.ceil((st.bypassUntilMs - nowMs) / 60_000)
                : 0;

            return (
              <View key={app.id} style={styles.appCard}>
                <View style={styles.appHeader}>
                  <Pressable
                    style={styles.appTitleArea}
                    testID={`app-row-${app.id}`}
                    onPress={() => setExpandedAppId(isExpanded ? null : app.id)}>
                    <View style={[styles.dot, { backgroundColor: app.accentColor }]} />
                    <View style={styles.appMeta}>
                      <ThemedText type="smallBold">{app.name}</ThemedText>
                      <ThemedText type="small" style={styles.subtitle}>
                        {cfg?.interventionType ?? 'breathing'} · {cfg?.baseDurationSec ?? 6}s
                        {bypassRemainingMin > 0
                          ? ` · bypass ${bypassRemainingMin}m`
                          : st?.attemptsToday
                            ? ` · ${st.attemptsToday} today`
                            : ''}
                      </ThemedText>
                    </View>
                  </Pressable>

                  <Pressable
                    testID={`preview-${app.id}`}
                    onPress={() => router.push(`/intervene?app=${app.id}`)}
                    style={styles.previewButton}>
                    <ThemedText type="small" style={styles.previewText}>
                      {t.pauseButton}
                    </ThemedText>
                  </Pressable>

                  <Switch
                    testID={`switch-${app.id}`}
                    value={cfg?.enabled ?? true}
                    onValueChange={(val) => toggleEnabled(app.id, val)}
                  />
                </View>

                {isExpanded && cfg && (
                  <View style={styles.expandedArea}>
                    <ThemedText type="small">{t.interventionStyle}</ThemedText>
                    <View style={styles.chipRow}>
                      {INTERVENTION_TYPES.map((item) => {
                        const active = cfg.interventionType === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() =>
                              updateConfigField(app.id, 'interventionType', item.id)
                            }
                            style={[styles.chip, active && styles.chipActive]}>
                            <ThemedText
                              type="small"
                              style={active ? styles.chipTextActive : undefined}>
                              {item.label}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>

                    <ThemedText type="small">{t.baseDuration}</ThemedText>
                    <View style={styles.chipRow}>
                      {[3, 6, 10, 15].map((sec) => {
                        const active = cfg.baseDurationSec === sec;
                        return (
                          <Pressable
                            key={sec}
                            onPress={() =>
                              updateConfigField(app.id, 'baseDurationSec', sec)
                            }
                            style={[styles.chip, active && styles.chipActive]}>
                            <ThemedText
                              type="small"
                              style={active ? styles.chipTextActive : undefined}>
                              {sec}s
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>

                    <ThemedText type="small">{t.dailyOpenLimit}</ThemedText>
                    <View style={styles.chipRow}>
                      {[null, 3, 5, 10].map((lim) => {
                        const active = cfg.dailyOpenLimit === lim;
                        return (
                          <Pressable
                            key={String(lim)}
                            onPress={() =>
                              updateConfigField(app.id, 'dailyOpenLimit', lim)
                            }
                            style={[styles.chip, active && styles.chipActive]}>
                            <ThemedText
                              type="small"
                              style={active ? styles.chipTextActive : undefined}>
                              {lim === null ? t.unlimited : `${lim}/day`}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={styles.strictRow}>
                      <ThemedText type="small">{t.strictBlockWhenLimit}</ThemedText>
                      <Switch
                        value={cfg.strictMode}
                        onValueChange={(val) =>
                          updateConfigField(app.id, 'strictMode', val)
                        }
                      />
                    </View>

                    <View style={styles.strictRow}>
                      <ThemedText type="small">{t.workHoursSchedule}</ThemedText>
                      <Switch
                        testID={`schedule-work-${app.id}`}
                        value={cfg.schedules.length > 0}
                        onValueChange={(enabled) =>
                          updateConfigField(
                            app.id,
                            'schedules',
                            enabled
                              ? [
                                  {
                                    days: [1, 2, 3, 4, 5],
                                    startMinute: 9 * 60,
                                    endMinute: 17 * 60,
                                    mode: 'intervene',
                                  },
                                ]
                              : []
                          )
                        }
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100, gap: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  header: { flex: 1, gap: 4 },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  subtitle: { opacity: 0.7 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.1)',
    gap: 4,
  },
  sectionTitle: { marginTop: 6 },
  appCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 12,
  },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appTitleArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  appMeta: { flex: 1, gap: 2 },
  previewButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(32, 138, 239, 0.14)',
  },
  previewText: { color: '#208AEF' },
  expandedArea: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: 12,
    gap: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  chipActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipTextActive: { color: '#FFFFFF' },
  strictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
