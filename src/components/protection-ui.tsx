import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const editorial = {
  bg: '#121212', card: '#121212', text: '#FAFAFA', muted: '#8E8E8E',
  accent: '#FAFAFA', fill: '#FAFAFA', line: '#2E2E2E', soft: '#1E1E1E',
} as const;

export function usePalette() { return editorial; }

// Instrument Sans has no Cyrillic. Use the paired Geist for Ukrainian headings
// instead of mixing fallback glyphs within a word. Numerals retain Instrument Sans.
export function displayFamily(children: ReactNode): string {
  const text = Array.isArray(children) ? children.join('') : String(children ?? '');
  return /[\u0400-\u052F]/u.test(text) ? 'Geist' : 'InstrumentSans';
}

export function Page({ children, footer }: PropsWithChildren<{ footer?: ReactNode }>) {
  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer && <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderColor: editorial.line }}>{footer}</SafeAreaView>}
    </SafeAreaView>
  );
}

export function Copy({ children, title, muted, large }: PropsWithChildren<{
  title?: boolean; muted?: boolean; large?: boolean;
}>) {
  return (
    <Text accessibilityRole={title || large ? 'header' : undefined} style={[
      ui.body,
      { color: muted ? editorial.muted : editorial.text },
      title && ui.heading,
      large && ui.display,
      (title || large) && { fontFamily: displayFamily(children) },
    ]}>{children}</Text>
  );
}

export function Kicker({ children }: PropsWithChildren) {
  return <Text style={ui.kicker}>{children}</Text>;
}

export function Card({ children }: PropsWithChildren) {
  return <View style={ui.card}>{children}</View>;
}

export function Action({ label, onPress, disabled, secondary, selected }: {
  label: string; onPress: () => void; disabled?: boolean;
  secondary?: boolean; selected?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const filled = !secondary || selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }) => [
        ui.action,
        { backgroundColor: filled ? editorial.text : editorial.bg,
          borderColor: focused || hovered || selected ? editorial.text : filled ? editorial.text : editorial.line,
          opacity: disabled ? 0.38 : pressed ? 0.65 : 1 },
      ]}>
      <Text style={[ui.actionLabel, { color: filled ? editorial.bg : editorial.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Choice({ title, detail, selected, disabled, onPress }: {
  title: string; detail: string; selected: boolean; disabled?: boolean; onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }}
      disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [ui.choice, { opacity: disabled ? 0.45 : pressed ? 0.6 : 1,
        borderColor: focused ? editorial.text : editorial.line }]}>
      <View style={{ flex: 1, gap: 6 }}><Copy title>{title}</Copy><Copy muted>{detail}</Copy></View>
      <View style={[ui.radio, selected && { backgroundColor: editorial.text }]}>
        {selected && <View style={{ width: 6, height: 6, backgroundColor: editorial.bg }} />}
      </View>
    </Pressable>
  );
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: editorial.bg },
  page: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 24,
    width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1 },
  header: { paddingBottom: 32, borderBottomWidth: 1, borderColor: editorial.line, gap: 22 },
  body: { fontFamily: 'Geist', fontSize: 16, lineHeight: 25, color: editorial.text },
  heading: { fontSize: 24, lineHeight: 29, letterSpacing: -0.5, fontWeight: '400' },
  display: { fontSize: 48, lineHeight: 51, letterSpacing: -1.7, fontWeight: '400' },
  kicker: { fontFamily: 'GeistSemiBold', fontSize: 11, lineHeight: 17,
    letterSpacing: 2.2, color: editorial.muted, textTransform: 'uppercase' },
  card: { padding: 22, borderRadius: 0, borderWidth: 1, borderColor: editorial.line,
    backgroundColor: editorial.bg, gap: 18 },
  action: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 16,
    borderRadius: 0, borderWidth: 1, justifyContent: 'center' },
  actionLabel: { fontFamily: 'GeistSemiBold', fontSize: 14, lineHeight: 21,
    letterSpacing: 0.2, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  choice: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 20,
    paddingVertical: 22, borderBottomWidth: 1 },
  radio: { width: 18, height: 18, borderWidth: 1, borderColor: editorial.muted,
    alignItems: 'center', justifyContent: 'center' },
  welcome: { fontSize: 30, lineHeight: 36, letterSpacing: -0.7, color: editorial.text },
  notice: { paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: editorial.line },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: editorial.line },
  appMark: { width: 42, height: 42, backgroundColor: editorial.soft, alignItems: 'center', justifyContent: 'center' },
  appMarkText: { color: editorial.text, fontFamily: 'Geist', fontSize: 21 },
  check: { width: 24, height: 24, borderWidth: 1, borderColor: editorial.muted, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 52, borderWidth: 1, borderColor: editorial.line, color: editorial.text, fontFamily: 'Geist', fontSize: 16, padding: 14 },
  metrics: { flexDirection: 'row', borderWidth: 1, borderColor: editorial.line },
  metric: { flex: 1, padding: 22, gap: 12 },
  numeral: { fontFamily: 'InstrumentSans', fontSize: 60, lineHeight: 66,
    letterSpacing: -1.8, fontWeight: '400', color: editorial.text },
});
