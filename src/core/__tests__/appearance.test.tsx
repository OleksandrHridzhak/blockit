import { act, render, screen } from '@testing-library/react-native';
import { Appearance, Text } from 'react-native';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { useThemeStyles, appleTheme, createThemeStyles, palettes, setThemePreference, useThemeSettings } from '@/features/appearance/theme';
import { ui as sharedUI } from '@/components/protection-ui';

jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: {
  getString: jest.fn(() => null), setString: jest.fn(),
} }));

let onAppearanceChange: Parameters<typeof Appearance.addChangeListener>[0];
let systemScheme: 'light' | 'dark' = 'light';
function Probe() {
  const ui = useThemeStyles(sharedUI);
  const { scheme, preference } = useThemeSettings();
  return <Text testID="theme" style={ui.body}>{preference}:{scheme}</Text>;
}
beforeEach(() => {
  systemScheme = 'light';
  jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => systemScheme);
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  jest.spyOn(Appearance, 'addChangeListener').mockImplementation(callback => {
    onAppearanceChange = callback;
    return { remove: jest.fn() };
  });
  setThemePreference('system');
});
afterEach(() => jest.restoreAllMocks());

it('follows system changes automatically and refreshes shared styles', async () => {
  await render(<Probe />);
  expect(screen.getByTestId('theme')).toHaveTextContent('system:light');
  expect(screen.getByTestId('theme')).toHaveStyle({ color: palettes.light.label });
  await act(() => { systemScheme = 'dark'; onAppearanceChange({ colorScheme: 'dark' }); });
  expect(screen.getByTestId('theme')).toHaveTextContent('system:dark');
  expect(screen.getByTestId('theme')).toHaveStyle({ color: palettes.dark.label });
});

it('persists a manual choice, ignores system changes, and can return to automatic', async () => {
  await render(<Probe />);
  await act(() => setThemePreference('dark'));
  expect(BlockitBridge.setString).toHaveBeenLastCalledWith('blockit.appearance.v1', 'dark');
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');
  await act(() => onAppearanceChange({ colorScheme: 'light' }));
  expect(screen.getByTestId('theme')).toHaveTextContent('dark:dark');
  await act(() => setThemePreference('light'));
  expect(screen.getByTestId('theme')).toHaveTextContent('light:light');
  await act(() => setThemePreference('system'));
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('auto');
  await act(() => { systemScheme = 'dark'; onAppearanceChange({ colorScheme: 'dark' }); });
  expect(screen.getByTestId('theme')).toHaveTextContent('system:dark');
});

it('caches styles separately for both themes', async () => {
  const styles = createThemeStyles(() => ({ card: { backgroundColor: appleTheme.secondaryBg } }));
  const light = styles.card;
  setThemePreference('dark');
  expect(styles.card.backgroundColor).toBe(palettes.dark.secondaryBg);
  expect(styles.card).not.toBe(light);
  setThemePreference('light');
  expect(styles.card).toBe(light);
});


