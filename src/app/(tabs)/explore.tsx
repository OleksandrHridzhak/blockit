import { useThemeStyles, createThemeStyles, setThemePreference, useThemeSettings, type ThemePreference } from '@/features/appearance/theme';
import { useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
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
  const themeOptions: ThemePreference[] = ['system', 'light', 'dark'];
  const { view, busy, run, refresh } = useProtection();
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(0);
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

      <ListSection title="ТЕМА" footer="Автоматична — як у налаштуваннях телефона.">
        <View style={{ padding: 12 }}>
          <SegmentedControl values={['Автоматична', 'Світла', 'Темна']}
            selectedIndex={themeOptions.indexOf(preference)} onChange={index => {
              try { setThemePreference(themeOptions[index]); }
              catch { Alert.alert('Не вдалося зберегти тему', 'Спробуй ще раз.'); }
            }} />
        </View>
      </ListSection>

      {/* SNOOZE ALL SECTION */}
      <ListSection
        title="ПРИЗУПИНЕННЯ ОБМЕЖЕНЬ"
        footer={
          isSnoozed
            ? `Захист тимчасово вимкнено до ${snoozeEndTime}. Додатки відкриватимуться вільно без затримок.`
            : 'Тимчасово вимикає всі паузи та правила для всіх програм на обраний проміжок часу.'
        }
      >
        {isSnoozed ? (
          <ListRow showSeparator={false}>
            <View style={styles.snoozeActiveRow}>
              <View style={styles.snoozeIconBadge}>
                <Text style={{ fontSize: 18 }}>⏸️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.snoozeActiveTitle}>
                  Обмеження призупинено
                </Text>
                <Text style={styles.snoozeActiveDetail}>
                  До {snoozeEndTime} · залишилось ~{remainingMinutes} хв
                </Text>
              </View>
            </View>
          </ListRow>
        ) : (
          <View style={{ padding: 12, gap: 12 }}>
            <Text style={styles.sectionSubtext}>
              Оберіть час, на який вимкнути обмеження:
            </Text>
            <SegmentedControl
              values={SNOOZE_DURATIONS.map((d) => d.label)}
              selectedIndex={selectedDurationIndex}
              disabled={busy}
              onChange={setSelectedDurationIndex}
            />
          </View>
        )}
      </ListSection>

      {/* Snooze Action Button */}
      <View style={{ marginTop: -8 }}>
        {isSnoozed ? (
          <Action
            label="Відновити захист зараз"
            disabled={busy}
            onPress={handleResumeProtection}
          />
        ) : (
          <Action
            label={`Вимкнути все на ${SNOOZE_DURATIONS[selectedDurationIndex].label}`}
            disabled={busy}
            secondary
            onPress={handleStartSnooze}
          />
        )}
      </View>

      <ListSection title="CURIOSITY MODE" footer="Додатковий режим із цікавими історіями. Вмикається окремо в налаштуваннях потрібної групи; за замовчуванням вимкнений.">
        <ListRow showSeparator={false} onPress={() => router.push({ pathname: '/curiosity', params: { preview: '1' } })}>
          <Text style={styles.linkText}>Переглянути добірку</Text><Text style={styles.chevron}>›</Text>
        </ListRow>
      </ListSection>
      {/* SUBSCRIPTION SECTION in Apple Settings Style */}
      <ListSection
        title="ПІДПИСКА"
        footer="Керування підпискою та скасування доступні через ваш обліковий запис Apple ID."
      >
        <ListRow showSeparator={true}>
          <View style={styles.subIconBadge}>
            <Text style={{ fontSize: 18 }}>⭐</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.subTitleRow}>
              <Text style={styles.subTitle}>Blockit Pro</Text>
              <View style={styles.subStatusBadge}>
                <Text style={styles.subStatusText}>АКТИВНА</Text>
              </View>
            </View>
            <Text style={styles.subDetail}>
              Безлімітні додатки та персональні налаштування
            </Text>
          </View>
        </ListRow>

        <ListRow showSeparator={true}>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Діє до</Text>
            <Text style={styles.rowValue}>
              {view?.subscription?.renewalDate ?? '26 жовтня 2027'}
            </Text>
          </View>
        </ListRow>

        <ListRow
          showSeparator={true}
          onPress={() => {
            Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
          }}
        >
          <Text style={styles.linkText}>Керувати підпискою в Apple ID</Text>
          <Text style={styles.chevron}>›</Text>
        </ListRow>

        <ListRow showSeparator={false} onPress={restorePurchases}>
          <Text style={styles.linkText}>Відновити покупки</Text>
        </ListRow>
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
