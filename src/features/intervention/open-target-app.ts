import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { getCatalogApp } from '@/core/catalog';

export async function openGuardedTargetApp(appId: string): Promise<boolean> {
  const entry = getCatalogApp(appId);
  if (!entry) return false;

  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(entry.iosScheme);
    if (canOpen) {
      await Linking.openURL(entry.iosScheme);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    await Linking.openURL(`https://apps.apple.com/app/id${entry.appStoreId}`);
    return true;
  } catch {
    return false;
  }
}
