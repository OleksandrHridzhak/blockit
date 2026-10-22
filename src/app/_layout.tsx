import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BlockitBridge } from '../../modules/blockit-bridge';

SplashScreen.preventAutoHideAsync();

function checkPendingNativeIntercept() {
  const pendingApp = BlockitBridge.consumePendingInterceptApp();
  if (pendingApp) {
    router.push(`/intervene?app=${pendingApp}`);
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    checkPendingNativeIntercept();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPendingNativeIntercept();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="intervene"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
