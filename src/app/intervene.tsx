import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getAppDisplayName, getCatalogApp } from '@/core/catalog';
import { normalizeAppId } from '@/core/deeplink';
import { decide } from '@/core/rules-engine';
import { openGuardedTargetApp } from '@/features/intervention/open-target-app';
import { getTranslations } from '@/i18n/strings';
import { getUserPreferences } from '@/storage/preferences';
import {
  getAppConfig,
  getAppUsageState,
  logInterventionContinued,
  logInterventionDismissed,
  logInterventionStarted,
} from '@/storage/repository';

const BYPASS_PRESETS_MIN = [1, 5, 15] as const;
const REFLECTION_PROMPTS = [
  'What are you looking for right now?',
  'Is opening this app aligned with how you want to spend the next 10 minutes?',
  'Are you opening this out of intention or boredom?',
];
const MINDFUL_PHRASE = 'I open this with intention';

export default function InterveneScreen() {
  const { app } = useLocalSearchParams<{ app?: string }>();
  const appId = normalizeAppId(app) ?? 'unknown';

  return <InterveneSession key={appId} appId={appId} />;
}

function InterveneSession({ appId }: { appId: string }) {
  const appName = getAppDisplayName(appId);
  const catalogApp = getCatalogApp(appId);

  const [session] = useState(() => {
    const now = Date.now();
    const config = getAppConfig(appId);
    const state = getAppUsageState(appId, now);
    const decision = decide({ appId }, config, state, now);
    const prefs = getUserPreferences();
    return { config, decision, prefs };
  });

  const { config, decision: initialDecision, prefs } = session;
  const t = getTranslations(prefs.locale);
  const initialDuration =
    initialDecision.kind === 'intervene' ? initialDecision.durationSec : config.baseDurationSec;
  const attemptNo =
    initialDecision.kind === 'intervene' || initialDecision.kind === 'block'
      ? initialDecision.attemptNo
      : 1;

  const [secondsLeft, setSecondsLeft] = useState<number>(initialDuration);
  const [typedText, setTypedText] = useState('');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  useEffect(() => {
    if (initialDecision.kind === 'intervene') {
      logInterventionStarted(appId, initialDecision.durationSec);
    }
  }, [appId, initialDecision]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const isTypingRequired = config.interventionType === 'typing';
  const isReflectionRequired = config.interventionType === 'reflection';

  const typingUnlocked =
    !isTypingRequired ||
    typedText.trim().toLowerCase() === MINDFUL_PHRASE.toLowerCase();
  const reflectionUnlocked = !isReflectionRequired || Boolean(selectedReason);
  const canContinue =
    initialDecision.kind !== 'block' &&
    secondsLeft === 0 &&
    typingUnlocked &&
    reflectionUnlocked;

  const handleDismiss = () => {
    logInterventionDismissed(appId);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleContinue = async (bypassMinutes: number) => {
    if (!canContinue) return;
    logInterventionContinued(appId, bypassMinutes);
    await openGuardedTargetApp(appId);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const promptText = REFLECTION_PROMPTS[(attemptNo - 1) % REFLECTION_PROMPTS.length];
  const breathPhase = secondsLeft % 6 >= 3 ? t.inhaleSlowly : t.exhaleGently;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.badge}>
          <ThemedText type="small" style={styles.badgeText} testID="intervene-attempt">
            Attempt #{attemptNo} today
          </ThemedText>
        </View>

        <View style={styles.hero}>
          <View
            style={[
              styles.breathCircle,
              {
                borderColor: catalogApp?.accentColor ?? '#208AEF',
                opacity: secondsLeft > 0 ? 0.85 : 1,
              },
            ]}>
            <ThemedText type="title" testID="intervene-timer">
              {initialDecision.kind === 'block'
                ? t.blocked
                : secondsLeft > 0
                  ? `${secondsLeft}s`
                  : t.ready}
            </ThemedText>
            <ThemedText type="small" style={styles.subText}>
              {initialDecision.kind === 'block'
                ? t.strictLimitActive
                : config.interventionType === 'breathing' && secondsLeft > 0
                  ? breathPhase
                  : t.takeABreath}
            </ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.center} testID="intervene-app">
            {t.aboutToOpen(appName)}
          </ThemedText>

          {initialDecision.kind === 'intervene' && initialDecision.limitReached && (
            <ThemedText type="small" style={styles.warningText}>
              Daily open limit reached ({config.dailyOpenLimit}/day)
            </ThemedText>
          )}
        </View>

        {isReflectionRequired && initialDecision.kind !== 'block' && (
          <View style={styles.card}>
            <ThemedText type="smallBold">{promptText}</ThemedText>
            <View style={styles.chipRow}>
              {['Reply to someone', 'Quick check', 'Just bored'].map((reason) => {
                const active = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    testID={`reason-${reason}`}
                    onPress={() => setSelectedReason(reason)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <ThemedText type="small" style={active ? styles.chipTextActive : undefined}>
                      {reason}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {isTypingRequired && initialDecision.kind !== 'block' && (
          <View style={styles.card}>
            <ThemedText type="small">
              Type &ldquo;{MINDFUL_PHRASE}&rdquo; to unlock:
            </ThemedText>
            <TextInput
              testID="intervene-phrase-input"
              value={typedText}
              onChangeText={setTypedText}
              placeholder={MINDFUL_PHRASE}
              placeholderTextColor="#888"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            testID="intervene-dismiss"
            onPress={handleDismiss}
            style={styles.primaryButton}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              {t.dontOpen(appName)}
            </ThemedText>
          </Pressable>

          {initialDecision.kind !== 'block' && (
            <View style={styles.continueRow}>
              {BYPASS_PRESETS_MIN.map((mins) => (
                <Pressable
                  key={mins}
                  testID={`intervene-continue-${mins}`}
                  disabled={!canContinue}
                  onPress={() => handleContinue(mins)}
                  style={[
                    styles.secondaryButton,
                    !canContinue && styles.secondaryButtonDisabled,
                  ]}>
                  <ThemedText type="small">
                    {canContinue ? t.continueFor(mins) : t.waitSeconds(secondsLeft)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(32, 138, 239, 0.14)',
  },
  badgeText: { color: '#208AEF' },
  hero: { alignItems: 'center', gap: 16 },
  breathCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  center: { textAlign: 'center' },
  subText: { textAlign: 'center', opacity: 0.7 },
  warningText: { color: '#E5484D', textAlign: 'center' },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.1)',
    gap: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  chipActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipTextActive: { color: '#FFFFFF' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#208AEF',
  },
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF' },
  continueRow: { flexDirection: 'row', gap: 8 },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
    alignItems: 'center',
  },
  secondaryButtonDisabled: { opacity: 0.45 },
});
