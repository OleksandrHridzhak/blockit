import { useThemeStyles, useAppTheme, createThemeStyles } from '@/features/appearance/theme';
import type { PropsWithChildren } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appleTheme, systemFont, ui as sharedUI } from '@/components/protection-ui';
import { storyImages } from './images';
import type { CuriosityStory } from './types';

export function CuriosityShell({ children, finish, busy, back }: PropsWithChildren<{ finish: () => void; busy: boolean; back?: () => void }>) {
  const ui = useThemeStyles(sharedUI);
  const curiosityStyle = useThemeStyles(sharedCuriosityStyle);
  return <SafeAreaView style={ui.screen} edges={['top', 'left', 'right', 'bottom']}>
    <View style={curiosityStyle.header}>
      {back ? <Pressable accessibilityRole="button" onPress={back} disabled={busy} style={curiosityStyle.textButton}><Text style={curiosityStyle.link}>‹ До добірки</Text></Pressable>
        : <Text style={curiosityStyle.brand}>Curiosity</Text>}
      <Pressable accessibilityRole="button" onPress={finish} disabled={busy} style={curiosityStyle.textButton}>
        <Text style={curiosityStyle.link}>{busy ? 'Завершуємо…' : 'Завершити'}</Text>
      </Pressable>
    </View>
    <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{children}</View>
  </SafeAreaView>;
}
export function StoryImage({ story, large = false }: { story: CuriosityStory; large?: boolean }) {
  const appleTheme = useAppTheme();
  return <Image source={storyImages[story.imageKey]} accessibilityLabel={story.imageAlt}
    contentFit="cover" transition={160} style={{ width: '100%', height: large ? 300 : 210, backgroundColor: appleTheme.tertiaryBg }} />;
}
export function SmallButton({ label, onPress, selected = false, disabled = false }: { label: string; onPress: () => void; selected?: boolean; disabled?: boolean }) {
  const appleTheme = useAppTheme();
  const curiosityStyle = useThemeStyles(sharedCuriosityStyle);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [curiosityStyle.pill, selected && { backgroundColor: appleTheme.tint }, pressed && { opacity: 0.7 }]}>
    <Text style={[curiosityStyle.pillText, selected && { color: appleTheme.onTint }]}>{label}</Text>
  </Pressable>;
}
const sharedCuriosityStyle = createThemeStyles(() => StyleSheet.create({
  header: { minHeight: 58, flexShrink: 0, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: appleTheme.separatorSubtle },
  brand: { fontFamily: systemFont, fontSize: 18, fontWeight: '600', color: appleTheme.label },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { fontFamily: systemFont, fontSize: 16, color: appleTheme.tint },
  content: { padding: 20, gap: 22, width: '100%', maxWidth: 680, alignSelf: 'center', paddingBottom: 36 },
  title: { fontFamily: systemFont, color: appleTheme.label, fontSize: 30, fontWeight: '700', lineHeight: 37, letterSpacing: -0.8 },
  cardTitle: { fontFamily: systemFont, color: appleTheme.label, fontSize: 22, fontWeight: '600', lineHeight: 29, letterSpacing: -0.3 },
  body: { fontFamily: systemFont, color: appleTheme.label, fontSize: 17, lineHeight: 27 },
  muted: { fontFamily: systemFont, color: appleTheme.secondaryLabel, fontSize: 15, lineHeight: 23 },
  eyebrow: { fontFamily: systemFont, color: appleTheme.tint, fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  card: { borderRadius: 18, overflow: 'hidden', backgroundColor: appleTheme.secondaryBg },
  cardBody: { padding: 18, gap: 10 },
  pill: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 24, backgroundColor: appleTheme.secondaryBg, justifyContent: 'center' },
  pillText: { fontFamily: systemFont, color: appleTheme.tint, fontSize: 15, fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  section: { gap: 14 },
  callout: { padding: 20, gap: 12, borderRadius: 16, backgroundColor: appleTheme.secondaryBg },
  heading: { fontFamily: systemFont, color: appleTheme.label, fontSize: 22, lineHeight: 29, fontWeight: '600' },
}));

export { sharedCuriosityStyle as curiosityStyle };
