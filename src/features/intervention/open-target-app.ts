import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { diagnosticJournal } from '@/features/diagnostics/journal';

import { getCatalogApp } from '@/core/catalog';

export async function openGuardedTargetApp(appId: string): Promise<boolean> {
  diagnosticJournal.record('target-open-start', { appId });
  const entry = getCatalogApp(appId);
  if (!entry) return false;

  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(entry.iosScheme);
    diagnosticJournal.record('target-open-available', { appId, canOpen });
    if (canOpen) {
      await Linking.openURL(entry.iosScheme);
      diagnosticJournal.record('target-open-success', { appId });
      return true;
    }
  } catch (error) { diagnosticJournal.record('target-open-error', { appId, error }, 'error'); }
  return false;
}
