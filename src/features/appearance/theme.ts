import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';
import { BlockitBridge } from '../../../modules/blockit-bridge';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';
const KEY = 'blockit.appearance.v1';

const dark = {
  bg: '#000000', secondaryBg: '#1C1C1E', tertiaryBg: '#2C2C2E', fill: '#3A3A3C',
  separator: 'rgba(84, 84, 88, 0.4)', separatorSubtle: '#2C2C2E',
  label: '#FFFFFF', secondaryLabel: '#8E8E93', tertiaryLabel: '#48484A',
  tint: '#46A758', tintPressed: '#388C49', onTint: '#07170C',
  green: '#30D158', orange: '#FF9F0A', red: '#FF453A', tabBar: '#121214',
};
export type AppPalette = typeof dark;
const light: AppPalette = {
  bg: '#F2F2F7', secondaryBg: '#FFFFFF', tertiaryBg: '#E9E9EE', fill: '#DCDCE2',
  separator: 'rgba(60, 60, 67, 0.24)', separatorSubtle: '#E1E1E6',
  label: '#1C1C1E', secondaryLabel: '#606067', tertiaryLabel: '#76767D',
  tint: '#2E7D3C', tintPressed: '#246530', onTint: '#FFFFFF',
  green: '#248A3D', orange: '#995900', red: '#C9342C', tabBar: '#FFFFFF',
};
export const palettes = { light, dark };

function loadPreference(): ThemePreference {
  try {
    const value = Platform.OS === 'web' && typeof localStorage !== 'undefined'
      ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch { return 'system'; }
}
let preference = loadPreference();
function resolvedScheme(): ThemeScheme {
  return preference === 'system' ? Appearance.getColorScheme() === 'dark' ? 'dark' : 'light' : preference;
}
let snapshot = { preference, scheme: resolvedScheme() };
const listeners = new Set<() => void>();
let appearanceSubscription: ReturnType<typeof Appearance.addChangeListener> | undefined;
function refresh() {
  const scheme = resolvedScheme();
  if (snapshot.preference === preference && snapshot.scheme === scheme) return;
  snapshot = { preference, scheme };
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  appearanceSubscription ??= Appearance.addChangeListener(refresh);
  refresh();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { appearanceSubscription?.remove(); appearanceSubscription = undefined; }
  };
}
const getSnapshot = () => snapshot;
const serverSnapshot = { preference: 'system', scheme: 'light' } as const;
export function useThemeSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
export function useAppTheme() {
  return palettes[useThemeSettings().scheme];
}
export function setThemePreference(value: ThemePreference) {
  if (!['system', 'light', 'dark'].includes(value)) return;
  // Persist first: a failed write should not silently lose the user's choice.
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, value);
  else BlockitBridge.setString(KEY, value);
  preference = value;
  applyNativeAppearance();
  refresh();
}
export function applyNativeAppearance() {
  if (Platform.OS !== 'web') Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
}

// Existing shared styles stay module-scoped. Resolve their colors lazily, while
// useAppTheme subscribes each consumer so changing theme never remounts a screen.
export const appleTheme = new Proxy(dark, {
  get: (_, key: keyof AppPalette) => palettes[snapshot.scheme][key],
});
const styleResolvers = new WeakMap<object, (scheme: ThemeScheme) => object>();
export function useThemeStyles<T extends object>(styles: T): T {
  const { scheme } = useThemeSettings();
  return (styleResolvers.get(styles)?.(scheme) ?? styles) as T;
}
export function createThemeStyles<T extends object>(factory: () => T): T {
  const cache: Partial<Record<ThemeScheme, T>> = {};
  const resolve = (scheme: ThemeScheme = snapshot.scheme) => cache[scheme] ?? (cache[scheme] = factory());
  const styles = new Proxy({} as T, {
    get: (_, key) => Reflect.get(resolve(), key),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
  styleResolvers.set(styles, resolve);
  return styles;
}
