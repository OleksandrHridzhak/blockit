import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Pressable, Text, View } from 'react-native';
import { EditorialIcon } from './editorial-icon';
import { appleTheme, ui } from './protection-ui';
import type { QuickActionRowProps } from './quick-action-row-props';

let closeOpenRow: (() => void) | undefined;

export function QuickActionRow({ children, name, status, suspended, disabled, onPause, onResume, onDisable, onDelete, onMore }: QuickActionRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef({ x: 0, y: 0, origin: 0, value: 0, active: false, moved: false });
  const suppressClick = useRef(false);
  const close = useCallback(() => { gesture.current.value = 0; setOffset(0); }, []);
  useEffect(() => () => { if (closeOpenRow === close) closeOpenRow = undefined; }, [close]);
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current.active || disabled) return;
    const dx = event.clientX - current.x;
    if (!current.moved) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(event.clientY - current.y) * 1.4) return;
      current.moved = true; suppressClick.current = true; setDragging(true);
      if (closeOpenRow !== close) closeOpenRow?.();
      closeOpenRow = close;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    current.value = Math.max(-192, Math.min(96, current.origin + dx));
    setOffset(current.value);
  }
  function finish() {
    const current = gesture.current;
    if (!current.active) return;
    current.active = false;
    if (!current.moved) return;
    const value = current.value > 38 ? 96 : current.value < -38 ? -192 : 0;
    current.value = value; setOffset(value); setDragging(false);
  }
  const action = (label: string, icon: 'pause' | 'resume' | 'power' | 'trash', color: string, callback: () => void, visible: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${name}`} disabled={disabled || !visible}
      onPress={() => { close(); callback(); }} style={{ width: 96, minHeight: 64, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: color }}>
      <EditorialIcon name={icon} color={appleTheme.label} size={22} /><Text style={{ color: appleTheme.label, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
  return <div style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y', userSelect: 'none' }}>
    <div aria-hidden={offset <= 0} style={{ position: 'absolute', inset: '0 auto 0 0', display: 'flex' }}>
      {action(suspended ? 'Відновити' : 'Призупинити', suspended ? 'resume' : 'pause', '#175841', suspended ? onResume : onPause, offset > 0)}
    </div>
    <div aria-hidden={offset >= 0} style={{ position: 'absolute', inset: '0 0 0 auto', display: 'flex' }}>
      {action(suspended ? 'Відновити' : 'Вимкнути', suspended ? 'resume' : 'power', '#4A3D23', suspended ? onResume : onDisable, offset < 0)}
      {action('Видалити', 'trash', '#762A30', onDelete, offset < 0)}
    </div>
    <div onPointerDownCapture={event => {
      if (event.button !== 0 || disabled) return;
      suppressClick.current = false;
      gesture.current = { x: event.clientX, y: event.clientY, origin: offset, value: offset, active: true, moved: false };
    }} onPointerMoveCapture={move} onPointerUpCapture={finish} onPointerCancel={() => { gesture.current.active = false; setDragging(false); close(); }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
      style={{ transform: `translateX(${offset}px)`, transition: dragging ? 'none' : 'transform 180ms ease-out' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: appleTheme.secondaryBg }}>
        <View style={{ flex: 1, minWidth: 0 }}>{children}
          {status && <Text accessibilityLiveRegion="polite" style={{ color: appleTheme.orange, fontSize: 13, paddingHorizontal: 16, paddingBottom: 10 }}>{status}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Швидкі дії: ${name}`} disabled={disabled}
          onPress={() => { close(); onMore(); }} style={{ width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><EditorialIcon name="more" size={21} /></Pressable>
        <View style={ui.hairline} />
      </View>
    </div>
  </div>;
}
