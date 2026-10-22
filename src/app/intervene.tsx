import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { normalizeAppId } from '@/core/deeplink';

/**
 * Placeholder intervention screen (Phase 0). Opened by
 * `blockit://intervene?app=<id>` from the Shortcuts automation.
 * Real interventions arrive in Phases 2–3.
 */
export default function InterveneScreen() {
  const { app } = useLocalSearchParams<{ app?: string }>();
  const appId = normalizeAppId(app) ?? 'unknown';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.center}>
          Take a breath
        </ThemedText>
        <ThemedText style={styles.center} testID="intervene-app">
          You are about to open {appId}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  center: { textAlign: 'center' },
});
