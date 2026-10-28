import { useThemeStyles, appleTheme, useAppTheme, createThemeStyles } from '@/features/appearance/theme';
import { type PropsWithChildren, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export { appleTheme } from '@/features/appearance/theme';

export const editorial = createThemeStyles(() => ({
  bg: appleTheme.bg,
  card: appleTheme.secondaryBg,
  text: appleTheme.label,
  muted: appleTheme.secondaryLabel,
  accent: appleTheme.tint,
  fill: appleTheme.label,
  line: appleTheme.separatorSubtle,
  soft: appleTheme.tertiaryBg,
} as const));

export function usePalette() {
  useAppTheme();
  return useThemeStyles(editorial);
}

export const systemFont = Platform.select({
  ios: undefined,
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", system-ui, sans-serif',
  default: undefined,
});

export function Page({ children, footer, header }: PropsWithChildren<{ footer?: ReactNode; header?: ReactNode }>) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={ui.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer && (
        <SafeAreaView edges={['bottom']} style={ui.footer}>
          {footer}
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

export function Copy({
  children,
  title,
  muted,
  large,
  secondary,
}: PropsWithChildren<{
  title?: boolean;
  muted?: boolean;
  large?: boolean;
  secondary?: boolean;
}>) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return (
    <Text
      accessibilityRole={title || large ? 'header' : undefined}
      style={[
        ui.body,
        (muted || secondary) && ui.mutedText,
        title && ui.title,
        large && ui.largeTitle,
      ]}
    >
      {children}
    </Text>
  );
}

export function Kicker({ children }: PropsWithChildren) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return <Text style={ui.sectionHeader}>{children}</Text>;
}

export function Card({ children }: PropsWithChildren) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return <View style={ui.card}>{children}</View>;
}

export function ListSection({
  title,
  footer,
  children,
}: PropsWithChildren<{
  title?: string;
  footer?: string | ReactNode;
}>) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return (
    <View style={ui.section}>
      {title && <Text style={ui.sectionHeader}>{title}</Text>}
      <View style={ui.group}>{children}</View>
      {footer && (
        typeof footer === 'string' ? (
          <Text style={ui.sectionFooter}>{footer}</Text>
        ) : (
          <View style={{ marginTop: 6, paddingHorizontal: 16 }}>{footer}</View>
        )
      )}
    </View>
  );
}

export function ListGroup({ children }: PropsWithChildren) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return <View style={ui.group}>{children}</View>;
}

export function ListRow({
  children,
  onPress,
  disabled,
  showSeparator = true,
}: PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  showSeparator?: boolean;
}>) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  const content = (
    <View style={ui.rowContent}>
      {children}
      {showSeparator && <View style={ui.hairline} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          ui.rowContainer,
          pressed && ui.rowPressed,
          disabled && { opacity: 0.5 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={ui.rowContainer}>{content}</View>;
}

export function AppBadge({
  name,
  color,
  size = 44,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const appleTheme = useAppTheme();
  const bg = color || appleTheme.tertiaryBg;
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.22),
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: systemFont,
          fontSize: Math.round(size * 0.5),
          fontWeight: '600',
          color: '#FFFFFF',
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

export function Action({
  label,
  onPress,
  disabled,
  secondary,
  selected,
  destructive,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  selected?: boolean;
  destructive?: boolean;
}) {
  const ui = useThemeStyles(sharedUI);
  const appleTheme = useAppTheme();
  const isPrimary = !secondary || selected;

  let backgroundColor: string = appleTheme.tint;
  let textColor: string = appleTheme.onTint;

  if (destructive) {
    backgroundColor = isPrimary ? appleTheme.red : appleTheme.secondaryBg;
    textColor = isPrimary ? '#FFFFFF' : appleTheme.red;
  } else if (!isPrimary) {
    backgroundColor = appleTheme.secondaryBg;
    textColor = appleTheme.tint;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.action,
        {
          backgroundColor,
          opacity: disabled ? 0.38 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[ui.actionLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function Choice({
  title,
  detail,
  selected,
  disabled,
  onPress,
  showSeparator = true,
}: {
  title: string;
  detail?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  showSeparator?: boolean;
}) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.choiceRow,
        pressed && ui.rowPressed,
        disabled && { opacity: 0.45 },
      ]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={ui.choiceTitle}>{title}</Text>
        {detail && <Text style={ui.choiceDetail}>{detail}</Text>}
      </View>
      {selected ? (
        <View style={ui.checkCircle}>
          <Text style={ui.checkSymbol}>✓</Text>
        </View>
      ) : (
        <View style={ui.uncheckCircle} />
      )}
      {showSeparator && <View style={ui.hairline} />}
    </Pressable>
  );
}

export function SegmentedControl({
  values,
  selectedIndex,
  onChange,
  disabled,
}: {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  disabled?: boolean;
}) {
  const ui = useThemeStyles(sharedUI);
  useAppTheme();
  return (
    <View style={ui.segmentedContainer}>
      {values.map((val, idx) => {
        const isSelected = selectedIndex === idx;
        return (
          <Pressable
            key={val}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            disabled={disabled}
            onPress={() => onChange(idx)}
            style={({ pressed }) => [
              ui.segmentedSegment,
              isSelected && ui.segmentedSegmentSelected,
              pressed && !isSelected && { opacity: 0.6 },
            ]}
          >
            <Text
              style={[
                ui.segmentedLabel,
                isSelected && ui.segmentedLabelSelected,
              ]}
            >
              {val}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const sharedUI = createThemeStyles(() => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appleTheme.bg,
  },
  page: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 20,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: appleTheme.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: appleTheme.separator,
  },
  body: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    color: appleTheme.label,
  },
  mutedText: {
    color: appleTheme.secondaryLabel,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: appleTheme.label,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    color: appleTheme.label,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    fontFamily: systemFont,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
    color: appleTheme.secondaryLabel,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionFooter: {
    fontFamily: systemFont,
    fontSize: 13,
    lineHeight: 18,
    color: appleTheme.secondaryLabel,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  group: {
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  rowContainer: {
    minHeight: 48,
    backgroundColor: appleTheme.secondaryBg,
  },
  rowPressed: {
    backgroundColor: appleTheme.tertiaryBg,
  },
  rowContent: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  hairline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: appleTheme.separator,
  },
  action: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: systemFont,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  choiceRow: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    backgroundColor: appleTheme.secondaryBg,
  },
  choiceTitle: {
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: '500',
    color: appleTheme.label,
    letterSpacing: -0.3,
  },
  choiceDetail: {
    fontFamily: systemFont,
    fontSize: 13,
    lineHeight: 18,
    color: appleTheme.secondaryLabel,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: appleTheme.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSymbol: {
    color: appleTheme.onTint,
    fontSize: 14,
    fontWeight: '700',
    marginTop: -1,
  },
  uncheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: appleTheme.fill,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 9,
    padding: 3,
    gap: 3,
  },
  segmentedSegment: {
    flex: 1,
    minHeight: 32,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedSegmentSelected: {
    backgroundColor: appleTheme.fill,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedLabel: {
    fontFamily: systemFont,
    fontSize: 14,
    fontWeight: '500',
    color: appleTheme.secondaryLabel,
  },
  segmentedLabelSelected: {
    color: appleTheme.label,
    fontWeight: '600',
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  appRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
  },
  appMark: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: appleTheme.tertiaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appMarkText: {
    color: appleTheme.label,
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: '600',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: appleTheme.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 44,
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 10,
    color: appleTheme.label,
    fontFamily: systemFont,
    fontSize: 17,
    paddingHorizontal: 14,
  },
  welcome: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: appleTheme.label,
  },
  notice: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 8,
  },
}));

export { sharedUI as ui };
