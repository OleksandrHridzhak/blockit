import { useAppTheme } from '@/features/appearance/theme';
import { SymbolView } from 'expo-symbols';


const icons = {
  shield: { light: 'shield', fill: 'shield.fill', material: 'shield' },
  chart: { light: 'chart.bar', fill: 'chart.bar.fill', material: 'bar_chart' },
  settings: { light: 'gearshape', fill: 'gearshape.fill', material: 'settings' },
  add: { light: 'plus', fill: 'plus', material: 'add' },
  check: { light: 'checkmark', fill: 'checkmark', material: 'check' },
  back: { light: 'chevron.left', fill: 'chevron.left', material: 'chevron_left' },
  forward: { light: 'chevron.right', fill: 'chevron.right', material: 'chevron_right' },
  more: { light: 'ellipsis', fill: 'ellipsis', material: 'more_horiz' },
  pause: { light: 'pause', fill: 'pause.fill', material: 'pause' },
  resume: { light: 'play', fill: 'play.fill', material: 'play_arrow' },
  power: { light: 'power', fill: 'power', material: 'power_settings_new' },
  trash: { light: 'trash', fill: 'trash.fill', material: 'delete' },
} as const;
export function EditorialIcon({ name, active = false, size = 24, color }: {
  name: keyof typeof icons; active?: boolean; size?: number; color?: string;
}) {
  const appleTheme = useAppTheme();
  const icon = icons[name];
  return <SymbolView name={{ ios: icon[active ? 'fill' : 'light'], android: icon.material, web: icon.material }}
    tintColor={color ?? (active ? appleTheme.tint : appleTheme.secondaryLabel)} size={size} accessible={false} />;
}
