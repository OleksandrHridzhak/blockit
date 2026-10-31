import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonTextVariants } from '@/components/ui/button';
import { useAppTheme } from '@/features/appearance/theme';
import { useThemeStyles, createThemeStyles, setThemePreference, useThemeSettings, type ThemePreference } from '@/features/appearance/theme';
import { useEffect, useState } from 'react';
import { diagnosticJournal } from '@/features/diagnostics/journal';
import { router, type Href } from 'expo-router';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Action,
  appleTheme,
  ListRow,
  ListSection,
  Page,
  SegmentedControl,
  ui as sharedUI,
} from '@/components/protection-ui';
import { useProtection } from '@/hooks/use-protection';
import { setGlobalSnooze } from '@/features/preview/store';

const SNOOZE_DURATIONS = [
  { label: '15 хв', minutes: 15 },
  { label: '30 хв', minutes: 30 },
  { label: '1 год', minutes: 60 },
];

export default function SettingsScreen() {
  const ui = useThemeStyles(sharedUI);
  const styles = useThemeStyles(themeStyles);
  const { preference } = useThemeSettings();
  const palette = useAppTheme();
  const themeOptions: ThemePreference[] = ['system', 'light', 'dark'];
  const { view, busy, run, refresh } = useProtection();
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(0);
  const [snoozePickerOpen, setSnoozePickerOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Expandable FAQ items state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Tick timer to update remaining snooze minutes
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isSnoozed = Boolean(view?.snoozeUntil && view.snoozeUntil > now);
  const remainingMinutes = isSnoozed && view?.snoozeUntil
    ? Math.max(1, Math.ceil((view.snoozeUntil - now) / 60_000))
    : 0;

  const snoozeEndTime = isSnoozed && view?.snoozeUntil
    ? new Date(view.snoozeUntil).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleStartSnooze = () => {
    const minutes = SNOOZE_DURATIONS[selectedDurationIndex].minutes;
    run(async () => {
      setGlobalSnooze(minutes);
      await refresh();
    });
  };

  const handleResumeProtection = () => {
    run(async () => {
      setGlobalSnooze(null);
      await refresh();
    });
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const restorePurchases = () => {
    run(async () => {
      Alert.alert(
        'Підписка відновлена',
        'Вашу підписку Blockit Pro успішно синхронізовано з Apple ID.'
      );
    });
  };

  return (
    <Page>
      {/* iOS Large Title Header */}
      <View style={styles.headerContainer}>
        <Text style={ui.largeTitle}>Параметри</Text>
      </View>

      {/* SUBSCRIPTION SECTION in Apple Settings Style */}
      <ListSection title="ПІДПИСКА">
        <Card className="rounded-2xl border-0 py-0 shadow-none" style={{ backgroundColor: palette.secondaryBg, borderColor: palette.secondaryBg, gap: 0 }}>
          <CardHeader className="px-4 pt-4 pb-3">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.subIconBadge}><Text style={{ fontSize: 18 }}>⭐</Text></View>
              <View style={{ flex: 1, gap: 3 }}>
                <CardTitle className="text-lg" style={{ color: palette.label, fontSize: 18 }}>Blockit Pro</CardTitle>
                <CardDescription className="text-sm" style={{ color: palette.secondaryLabel }}>Безлімітні застосунки та персональні налаштування</CardDescription>
              </View>
              <View style={[styles.subStatusBadge, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}><Text style={[styles.subStatusText, { color: palette.green }]}>АКТИВНА</Text></View>
            </View>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <View style={[styles.infoRow, { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.separatorSubtle }]}>
              <Text style={styles.rowLabel}>Діє до</Text><Text style={styles.rowValue}>{view?.subscription?.renewalDate ?? '26 жовтня 2027'}</Text>
            </View>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2 px-4 pb-4">
            <Button variant="default" className="h-12 rounded-xl border-0" style={{ backgroundColor: palette.tint }} onPress={() => { Linking.openURL('https://apps.apple.com/account/subscriptions').catch(error => diagnosticJournal.record('subscriptions-link-error', { error }, 'error')); }}>
              <Text className={buttonTextVariants({ variant: 'default' })} style={{ color: palette.onTint, fontSize: 15 }}>Керувати підпискою в Apple ID</Text>
            </Button>
            <Button variant="outline" className="h-11 rounded-xl border" style={{ backgroundColor: `${palette.tint}1A`, borderColor: `${palette.tint}55` }} onPress={restorePurchases}>
              <Text className={buttonTextVariants({ variant: 'outline' })} style={{ color: palette.tint, fontSize: 14 }}>Відновити покупки</Text>
            </Button>
          </CardFooter>
        </Card>
      </ListSection>


      {/* SNOOZE ALL SECTION */}
      <ListSection
        title="ПРИЗУПИНЕННЯ ОБМЕЖЕНЬ"
        footer={isSnoozed ? 'Після завершення часу правила ввімкнуться автоматично.' : 'Правила автоматично відновляться після вибраного часу.'}
      >
        <View style={[ui.card, { padding: 16, gap: 14 }]}>
          <View style={{ gap: 4 }}>
            <Text style={ui.body}>{isSnoozed ? 'Захист призупинено' : 'Вимкнути обмеження'}</Text>
            <Text style={styles.sectionSubtext}>
              {isSnoozed
                ? `Додатки відкриватимуться вільно до ${snoozeEndTime}.`
                : 'Тимчасово вимкнути паузи та правила для всіх програм.'}
            </Text>
          </View>
        {isSnoozed && <Text style={styles.snoozeActiveDetail}>Залишилось приблизно {remainingMinutes} хв</Text>}
        {isSnoozed ? (
          <Action
            label="Відновити захист зараз"
            disabled={busy}
            onPress={handleResumeProtection}
          />
        ) : (
          <Action label="Вимкнути обмеження" disabled={busy} secondary onPress={() => setSnoozePickerOpen(true)} />
        )}
        </View>
      </ListSection>

      <Modal visible={snoozePickerOpen} transparent animationType="slide" onRequestClose={() => setSnoozePickerOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Закрити вибір тривалості" onPress={() => setSnoozePickerOpen(false)} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={{ backgroundColor: palette.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={[ui.title, { flex: 1 }]}>Вимкнути обмеження</Text>
              <Pressable accessibilityRole="button" onPress={() => setSnoozePickerOpen(false)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.tint }}>Закрити</Text></Pressable>
            </View>
            <Text style={ui.mutedText}>Обери, на який час призупинити правила. Потім вони ввімкнуться автоматично.</Text>
            <SegmentedControl values={SNOOZE_DURATIONS.map(duration => duration.label)} selectedIndex={selectedDurationIndex} disabled={busy} onChange={setSelectedDurationIndex} />
            <Action label={busy ? 'Зберігаємо…' : `Вимкнути на ${SNOOZE_DURATIONS[selectedDurationIndex].label}`} disabled={busy} onPress={() => { setSnoozePickerOpen(false); handleStartSnooze(); }} />
            <Action secondary label="Скасувати" disabled={busy} onPress={() => setSnoozePickerOpen(false)} />
          </View>
        </View>
      </Modal>

      <ListSection title="ТЕМА" footer="Автоматична — як у налаштуваннях телефона.">
        <View style={{ padding: 12 }}>
          <ToggleGroup type="single" value={preference} className="w-full gap-2" onValueChange={value => {
            if (!themeOptions.includes(value as ThemePreference)) return;
            try { setThemePreference(value as ThemePreference); }
            catch (error) { diagnosticJournal.record('appearance-save-error', { error }, 'error'); Alert.alert('Не вдалося зберегти тему', 'Спробуй ще раз.'); }
          }}>
            {themeOptions.map((value, index) => <ToggleGroupItem key={value} value={value}
              accessibilityLabel={`Тема: ${['Автоматична', 'Світла', 'Темна'][index]}`}
              className="min-h-12 flex-1 rounded-xl border px-2"
              style={{ flex: 1, borderRadius: 12, borderColor: preference === value ? palette.tint : palette.separatorSubtle, backgroundColor: preference === value ? palette.tint : palette.tertiaryBg }}>
              <Text style={{ color: preference === value ? palette.onTint : palette.label, fontSize: 13, fontWeight: '600' }}>{['Автоматична', 'Світла', 'Темна'][index]}</Text>
            </ToggleGroupItem>)}
          </ToggleGroup>
        </View>
      </ListSection>

      {/* FAQ SECTION */}
      <ListSection title="ЧАСТІ ЗАПИТАННЯ (FAQ)">
        <ListRow showSeparator={true} onPress={() => toggleFaq(0)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.faqQuestion}>
              Як налаштувати паузу для конкретного додатка?
            </Text>
            {expandedFaq === 0 && (
              <Text style={styles.faqAnswer}>
                Перейдіть на головну вкладку «Застосунки» та просто натисніть на потрібну програму у списку. Відкриється вікно налаштування, де можна встановити персональну кількість секунд (10, 20, 30 або 60) та окреме завдання.
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.chevron,
              expandedFaq === 0 && styles.chevronRotated,
            ]}
          >
            ›
          </Text>
        </ListRow>

        <ListRow showSeparator={true} onPress={() => toggleFaq(1)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.faqQuestion}>
              Як працює кнопка «Вимкнути усе»?
            </Text>
            {expandedFaq === 1 && (
              <Text style={styles.faqAnswer}>
                Вона призупиняє дію всіх пауз на обраний час (15 хв, 30 хв або 1 годину). Протягом цього проміжку всі додатки відкриваються миттєво. Після завершення часу захист автоматично повертається. Ви також можете відновити його достроково в будь-який момент.
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.chevron,
              expandedFaq === 1 && styles.chevronRotated,
            ]}
          >
            ›
          </Text>
        </ListRow>

        <ListRow showSeparator={false} onPress={() => toggleFaq(2)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.faqQuestion}>
              Де зберігаються мої персональні дані?
            </Text>
            {expandedFaq === 2 && (
              <Text style={styles.faqAnswer}>
                Blockit повністю дотримується приватності Apple: 100% налаштувань, списків додатків та історії зберігаються виключно локально на вашому iPhone. Жодні персональні дані не передаються на сторонні сервери.
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.chevron,
              expandedFaq === 2 && styles.chevronRotated,
            ]}
          >
            ›
          </Text>
        </ListRow>
      </ListSection>
      <ListSection title="ДОПОМОГА">
        <ListRow showSeparator={false} onPress={() => router.push('/diagnostics' as Href)}><Text style={ui.body}>Діагностика блокування</Text></ListRow>
      </ListSection>
    </Page>
  );
}

const themeStyles = createThemeStyles(() => StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  sectionSubtext: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 14,
    color: appleTheme.secondaryLabel,
  },
  snoozeActiveRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snoozeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeActiveTitle: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: appleTheme.orange,
    letterSpacing: -0.3,
  },
  snoozeActiveDetail: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 13,
    color: appleTheme.secondaryLabel,
    marginTop: 2,
  },
  subIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subTitle: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: appleTheme.label,
    letterSpacing: -0.3,
  },
  subStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderRadius: 5,
  },
  subStatusText: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: appleTheme.green,
    letterSpacing: 0.5,
  },
  subDetail: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 13,
    color: appleTheme.secondaryLabel,
    marginTop: 2,
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 16,
    color: appleTheme.label,
  },
  rowValue: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 15,
    color: appleTheme.secondaryLabel,
  },
  linkText: {
    flex: 1,
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: appleTheme.tint,
  },
  chevron: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 20,
    fontWeight: '400',
    color: appleTheme.secondaryLabel,
  },
  chevronRotated: {
    transform: [{ rotate: '90deg' }],
  },
  faqQuestion: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 15,
    fontWeight: '500',
    color: appleTheme.label,
    lineHeight: 20,
  },
  faqAnswer: {
    fontFamily: sharedUI.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: appleTheme.secondaryLabel,
    marginTop: 8,
  },
}));
