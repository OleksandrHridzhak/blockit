import { SymbolView } from 'expo-symbols';

const icons = {
  shield: { light: 'shield', fill: 'shield.fill', material: 'shield' },
  chart: { light: 'chart.bar', fill: 'chart.bar.fill', material: 'bar_chart' },
  settings: { light: 'gearshape', fill: 'gearshape.fill', material: 'settings' },
  add: { light: 'plus', fill: 'plus', material: 'add' },
  check: { light: 'checkmark', fill: 'checkmark', material: 'check' },
  back: { light: 'chevron.left', fill: 'chevron.left', material: 'chevron_left' },
  forward: { light: 'chevron.right', fill: 'chevron.right', material: 'chevron_right' },
} as const;
export function EditorialIcon({ name, active = false, size = 24 }: {
  name: keyof typeof icons; active?: boolean; size?: number;
}) {
  const icon = icons[name];
  return <SymbolView name={{ ios: icon[active ? 'fill' : 'light'], android: icon.material, web: icon.material }}
    tintColor={active ? '#0A84FF' : '#8E8E93'} size={size} accessible={false} />;
}
