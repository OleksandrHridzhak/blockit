/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useAppTheme } from '@/features/appearance/theme';

export function useTheme() {
  const palette = useAppTheme();
  return { text: palette.label, background: palette.bg, backgroundElement: palette.secondaryBg,
    backgroundSelected: palette.fill, textSecondary: palette.secondaryLabel };
}
