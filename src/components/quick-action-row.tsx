import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { EditorialIcon } from './editorial-icon';
import { appleTheme, ui } from './protection-ui';
import type { QuickActionRowProps } from './quick-action-row-props';

let closeOpenRow: (() => void) | undefined;

export function QuickActionRow({ children, name, status, suspended, disabled, onPause, onResume, onDisable, onDelete, onMore }: QuickActionRowProps) {
  const swipe = useRef<SwipeableMethods>(null);
  const close = useCallback(() => swipe.current?.close(), []);
  const [openSide, setOpenSide] = useState<string>();
  useEffect(() => () => { if (closeOpenRow === close) closeOpenRow = undefined; }, [close]);
  const action = (label: string, icon: 'pause' | 'resume' | 'power' | 'trash', color: string, callback: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${name}`} disabled={disabled}
      onPress={() => { close(); callback(); }} style={{ width: 96, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: color }}>
      <EditorialIcon name={icon} size={22} color={appleTheme.label} /><Text style={{ color: appleTheme.label, fontSize: 12, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
  return <Swipeable ref={swipe} friction={2} leftThreshold={38} rightThreshold={38} overshootLeft={false} overshootRight={false}
    onSwipeableWillOpen={side => { if (closeOpenRow !== close) closeOpenRow?.(); closeOpenRow = close; setOpenSide(side === 'right' ? 'left' : 'right'); }}
    onSwipeableWillClose={() => setOpenSide(undefined)}
    renderLeftActions={() => <View accessibilityElementsHidden={openSide !== 'left'} importantForAccessibility={openSide !== 'left' ? 'no-hide-descendants' : 'auto'}>
      {action(suspended ? 'Відновити' : 'Призупинити', suspended ? 'resume' : 'pause', '#175841', suspended ? onResume : onPause)}
    </View>}
    renderRightActions={() => <View accessibilityElementsHidden={openSide !== 'right'} importantForAccessibility={openSide !== 'right' ? 'no-hide-descendants' : 'auto'} style={{ flexDirection: 'row' }}>
      {action(suspended ? 'Відновити' : 'Вимкнути', suspended ? 'resume' : 'power', '#4A3D23', suspended ? onResume : onDisable)}
      {action('Видалити', 'trash', '#762A30', onDelete)}
    </View>}>
    <View style={{ flexDirection: 'row', backgroundColor: appleTheme.secondaryBg, alignItems: 'center' }}>
      <View style={{ flex: 1, minWidth: 0 }}>{children}
        {status && <Text accessibilityLiveRegion="polite" style={{ color: appleTheme.orange, fontSize: 13, paddingHorizontal: 16, paddingBottom: 10 }}>{status}</Text>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Швидкі дії: ${name}`} disabled={disabled}
        onPress={() => { close(); onMore(); }} style={{ width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <EditorialIcon name="more" size={21} />
      </Pressable>
      <View style={ui.hairline} />
    </View>
  </Swipeable>;
}
