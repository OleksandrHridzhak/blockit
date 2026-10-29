import { applyNativeAppearance, useAppTheme, useThemeSettings } from '@/features/appearance/theme';
import '@/global.css';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, usePathname, useRootNavigationState, type Href, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Button, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { screenTime } from '@/features/screen-time/client';
import { diagnosticJournal } from '@/features/diagnostics/journal';
import { shareDiagnosticReport } from '@/features/diagnostics/report';

import { interventionDestination } from '@/features/curiosity/storage';
import { isMicrolearning, microlearningRoute } from '@/core/pause-mode-settings';

void SplashScreen.preventAutoHideAsync().catch(error => diagnosticJournal.record('splash-prevent-error', { error }, 'error'));

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { diagnosticJournal.record('react-render-error', { error }, 'error'); }, [error]);
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FFFFFF' }}>
    <Text style={{ color: '#111111', fontSize: 20 }}>Не вдалося відкрити екран</Text>
    <Button title="Поділитися повним звітом" onPress={() => { void shareDiagnosticReport().catch(e => diagnosticJournal.record('report-share-error', { error: e }, 'error')); }} />
    <Button title="Спробувати ще раз" onPress={() => { void retry(); }} />
  </View>;
}

export default function RootLayout() {
  const appleTheme = useAppTheme();
  const { scheme } = useThemeSettings();
  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  useEffect(() => {
    applyNativeAppearance();
  }, []);
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = scheme;
  }, [scheme]);
  const [fontsLoaded, fontError] = useFonts({
    Geist: require('@/assets/fonts/Geist-Regular.ttf'),
    GeistSemiBold: require('@/assets/fonts/Geist-SemiBold.ttf'),
    InstrumentSans: require('@/assets/fonts/InstrumentSans-Regular.ttf'),
  });
  const navigation = useRootNavigationState();
  const pathname = usePathname();
  useEffect(() => {
    diagnosticJournal.setRoute(pathname);
  }, [pathname]);
  useEffect(() => {
    void screenTime.setDiagnosticCapture(diagnosticJournal.isEnabled()).catch(error => diagnosticJournal.record('native-capture-config-error', { error }, 'error'));
  }, []);
  useEffect(() => {
    if (fontError) diagnosticJournal.record('font-load-error', { error: fontError }, 'error');
  }, [fontError]);

  useEffect(() => {
    if (!navigation?.key || (!fontsLoaded && !fontError)) return;
    SplashScreen.hideAsync().catch(error => diagnosticJournal.record('splash-hide-error', { error }, 'error'));
    let alive = true;
    async function checkPending() {
      if (pathname === '/intervene' || pathname === '/microlearning' || pathname === '/microlearning-v2' || pathname.startsWith('/curiosity')) return;
      try {
        const request = await screenTime.pending();
        if (alive && request && pathname !== '/intervene') {
          router.push({ pathname: isMicrolearning(request.mode) ? microlearningRoute(request.mode) : interventionDestination(request.groupId, request.appId), params: { request: request.id } } as Href);
        }
      } catch (error) { diagnosticJournal.record('pending-route-error', { error }, 'error'); }
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: appleTheme.bg }}><ThemeProvider value={{ ...navigationTheme, colors: { ...navigationTheme.colors, background: appleTheme.bg, card: appleTheme.secondaryBg, text: appleTheme.label, primary: appleTheme.tint, border: appleTheme.separatorSubtle } }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
    </ThemeProvider></GestureHandlerRootView>
  );
}
