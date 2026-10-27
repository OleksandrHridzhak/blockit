import '@/global.css';
import { DarkTheme, router, Stack, ThemeProvider, usePathname, useRootNavigationState, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { screenTime } from '@/features/screen-time/client';
import { interventionDestination } from '@/features/curiosity/storage';
import { isMicrolearning, microlearningRoute } from '@/core/pause-mode-settings';

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
      if (pathname === '/intervene' || pathname === '/microlearning' || pathname === '/microlearning-v2' || pathname.startsWith('/curiosity')) return;
      try {
        const request = await screenTime.pending();
        if (alive && request && pathname !== '/intervene') {
          router.push({ pathname: isMicrolearning(request.mode) ? microlearningRoute(request.mode) : interventionDestination(request.groupId, request.appId), params: { request: request.id } } as Href);
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
    <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: '#000000', card: '#1C1C1E', text: '#FFFFFF', primary: '#0A84FF', border: '#2C2C2E' } }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group" options={{ presentation: 'card', gestureEnabled: true }} />
        <Stack.Screen name="selected-app" options={{ presentation: 'card', gestureEnabled: true }} />
        <Stack.Screen name="curiosity" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="microlearning" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="microlearning-v2" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen
          name="intervene"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="app-rule"
          options={{ presentation: 'modal', gestureEnabled: true }}
        />
      </Stack>
    </ThemeProvider>
  );
}
