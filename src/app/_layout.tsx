import '@/global.css';
import { DarkTheme, router, Stack, ThemeProvider, usePathname, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { screenTime } from '@/features/screen-time/client';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist: require('@/assets/fonts/Geist-Regular.ttf'),
    GeistSemiBold: require('@/assets/fonts/Geist-SemiBold.ttf'),
    InstrumentSans: require('@/assets/fonts/InstrumentSans-Regular.ttf'),
  });
  const navigation = useRootNavigationState();
  const pathname = usePathname();

  useEffect(() => {
    if (!navigation?.key || (!fontsLoaded && !fontError)) return;
    SplashScreen.hideAsync().catch(() => {});
    let alive = true;
    async function checkPending() {
      try {
        const request = await screenTime.pending();
        if (alive && request && pathname !== '/intervene') {
          router.push({ pathname: '/intervene', params: { request: request.id } });
        }
      } catch { /* The home screen exposes permission/status recovery. */ }
    }
    checkPending();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPending();
      }
    });
    return () => { alive = false; sub.remove(); };
  }, [navigation?.key, pathname, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: '#121212', card: '#121212', text: '#FAFAFA', primary: '#FAFAFA', border: '#2E2E2E' } }}>
      <StatusBar style="light" />
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
