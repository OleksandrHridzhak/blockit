import { useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AnalyticsSummary, computeAnalyticsSummary } from '@/core/analytics';
import { getAppDisplayName } from '@/core/catalog';
import {
  getUserPreferences,
  saveUserPreferences,
  UserPreferences,
} from '@/storage/preferences';
import {
  getHistoryEvents,
  getWidgetSnapshot,
  HistoryEvent,
  syncWidgetSnapshot,
} from '@/storage/repository';

const SETUP_STEPS = [
  '1. Open the Apple Shortcuts app on your iPhone → Automation tab → tap "+".',
  '2. Choose "App" → select Instagram (or another guarded app) → check "Is Opened" and "Run Immediately".',
  '3. Add action: Blockit → "Should Intercept App" (select Instagram).',
  '4. Add an "If" block: If Should Intercept App is true → "Open URLs" with blockit://intervene?app=instagram.',
];

export default function ExploreScreen() {
  const [data, setData] = useState<{
    events: HistoryEvent[];
    summary: AnalyticsSummary;
    prefs: UserPreferences;
  }>(() => {
    const events = getHistoryEvents();
    syncWidgetSnapshot();
    return {
      events,
      summary: computeAnalyticsSummary(events, Date.now()),
      prefs: getUserPreferences(),
    };
  });

  useFocusEffect(
    useCallback(() => {
      const events = getHistoryEvents();
      syncWidgetSnapshot();
      setData({
        events,
        summary: computeAnalyticsSummary(events, Date.now()),
        prefs: getUserPreferences(),
      });
    }, [])
  );

  const { events, summary, prefs } = data;
  const widgetSnapshot = getWidgetSnapshot();

  const togglePro = () => {
    const nextPrefs = saveUserPreferences({ isPro: !prefs.isPro });
    setData((prev) => ({ ...prev, prefs: nextPrefs }));
  };
  const maxDayCount = Math.max(
    1,
    ...summary.last7Days.map((d) => d.dismissed + d.continued)
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">Insights & Setup</ThemedText>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <ThemedText type="subtitle" testID="stats-mindful-rate">
                {summary.mindfulRatePercent}%
              </ThemedText>
              <ThemedText type="small" style={styles.muted}>
                Mindful rate
              </ThemedText>
            </View>
            <View style={styles.kpiCard}>
              <ThemedText type="subtitle" testID="stats-saved-min">
                {summary.estimatedSavedMinutes}m
              </ThemedText>
              <ThemedText type="small" style={styles.muted}>
                Time saved
              </ThemedText>
            </View>
            <View style={styles.kpiCard}>
              <ThemedText type="subtitle">{summary.totalDismissed}</ThemedText>
              <ThemedText type="small" style={styles.muted}>
                Total exits
              </ThemedText>
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText type="smallBold">Last 7 Days (Mindful exits vs Opens)</ThemedText>
            <View style={styles.chartRow}>
              {summary.last7Days.map((bucket) => {
                const total = bucket.dismissed + bucket.continued;
                const heightPct = Math.max(8, Math.round((total / maxDayCount) * 100));
                return (
                  <View key={bucket.dayKey} style={styles.chartCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${heightPct}%` }]} />
                    </View>
                    <ThemedText type="small" style={styles.muted}>
                      {bucket.label}
                    </ThemedText>
                    <ThemedText type="small">
                      {bucket.dismissed}/{total}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText type="smallBold">iOS Shortcuts Automation (No-flicker mode)</ThemedText>
            {SETUP_STEPS.map((step) => (
              <ThemedText key={step} type="small" style={styles.step}>
                {step}
              </ThemedText>
            ))}
            <Pressable
              testID="open-shortcuts-app"
              onPress={() => Linking.openURL('shortcuts://')}
              style={styles.button}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Open Apple Shortcuts
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.card}>
            <ThemedText type="smallBold">
              Home Screen Widget Snapshot (Today&apos;s Stats Intent)
            </ThemedText>
            <ThemedText type="small" testID="widget-snapshot-preview">
              {widgetSnapshot
                ? `${widgetSnapshot.mindfulExitsToday}/${widgetSnapshot.attemptsToday} mindful exits · ${widgetSnapshot.savedMinutesToday}m saved`
                : '0/0 mindful exits · 0m saved'}
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>
              Add the &ldquo;Today&apos;s Stats&rdquo; Blockit shortcut widget to your iOS Home
              Screen or Lock Screen.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText type="smallBold">
              Blockit Pro {prefs.isPro ? '✓ Active' : '(Preview)'}
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>
              Unlocks unlimited guarded apps, strict schedules, and website domain rules (
              {prefs.blockedDomains.join(', ')}).
            </ThemedText>
            <Pressable
              testID="toggle-pro-plan"
              onPress={togglePro}
              style={styles.button}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                {prefs.isPro ? 'Manage Pro (Active)' : 'Unlock Blockit Pro (Test Mode)'}
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Recent Interceptions ({events.length})
          </ThemedText>

          {events.length === 0 ? (
            <View style={styles.card}>
              <ThemedText type="small" style={styles.muted}>
                No activity recorded yet. Trigger a pause from the Home tab or via
                blockit://intervene?app=instagram.
              </ThemedText>
            </View>
          ) : (
            events.slice(0, 25).map((ev) => (
              <View key={ev.id} style={styles.eventRow}>
                <View style={styles.eventMeta}>
                  <ThemedText type="smallBold">{getAppDisplayName(ev.appId)}</ThemedText>
                  <ThemedText type="small" style={styles.muted}>
                    {new Date(ev.timestampMs).toLocaleTimeString()}
                  </ThemedText>
                </View>
                <ThemedText type="small">
                  {ev.outcome === 'dismissed'
                    ? 'Closed mindfully'
                    : ev.outcome === 'continued'
                      ? `Opened (${ev.bypassMinutes ?? 5}m bypass)`
                      : 'Paused'}
                </ThemedText>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100, gap: 14 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.1)',
    gap: 4,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 10,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    width: 16,
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.18)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#208AEF',
    borderRadius: 8,
  },
  step: { opacity: 0.85 },
  button: {
    marginTop: 6,
    backgroundColor: '#208AEF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF' },
  sectionTitle: { marginTop: 6 },
  muted: { opacity: 0.7 },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.06)',
  },
  eventMeta: { gap: 2 },
});
