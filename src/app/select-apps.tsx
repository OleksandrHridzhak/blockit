import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Action,
  AppBadge,
  appleTheme,
  ListRow,
  ListSection,
  Page,
  ui,
} from '@/components/protection-ui';
import { previewApps, readPreview, savePreview } from '@/features/preview/store';
import { getCatalogApp } from '@/core/catalog';

export default function SelectAppsScreen() {
  const [selected, setSelected] = useState<string[]>(() => readPreview().apps);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const visible = useMemo(
    () =>
      previewApps.filter((app) =>
        app.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [search]
  );

  const toggle = (id: string) =>
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );

  const save = () => {
    try {
      savePreview({ apps: selected });
      router.replace('/');
    } catch {
      setError(
        'Не вдалося зберегти список. Перевір, чи дозволено збереження даних.'
      );
    }
  };

  return (
    <Page
      footer={
        <Action
          label={
            selected.length > 0
              ? `Зберегти вибір (${selected.length})`
              : 'Зберегти порожній список'
          }
          onPress={save}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* iOS Modal Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={styles.navButton}
        >
          <Text style={styles.navButtonText}>Скасувати</Text>
        </Pressable>
        <Text style={styles.navTitle}>Оберіть застосунки</Text>
        <Pressable
          accessibilityRole="button"
          onPress={save}
          style={styles.navButton}
        >
          <Text style={[styles.navButtonText, styles.navButtonDone]}>Готово</Text>
        </Pressable>
      </View>

      {/* iOS Native Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          accessibilityLabel="Пошук застосунку"
          placeholder="Пошук"
          placeholderTextColor={appleTheme.secondaryLabel}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <View style={styles.clearBadge}>
              <Text style={styles.clearBadgeText}>✕</Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* List of Apps in Inset Grouped style */}
      <ListSection
        title="ДОСТУПНІ ЗАСТОСУНКИ"
        footer="Познач програми, які хочеш запускати лише після короткої перерви."
      >
        {visible.map((app, index) => {
          const catalog = getCatalogApp(app.id);
          const isSelected = selected.includes(app.id);
          const isLast = index === visible.length - 1;

          return (
            <ListRow
              key={app.id}
              showSeparator={!isLast}
              onPress={() => toggle(app.id)}
            >
              <AppBadge name={app.name} color={catalog?.accentColor} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.appNameText}>{app.name}</Text>
              </View>
              {isSelected ? (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkSymbol}>✓</Text>
                </View>
              ) : (
                <View style={styles.uncheckCircle} />
              )}
            </ListRow>
          );
        })}
      </ListSection>

      {visible.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            За запитом «{search}» нічого не знайдено.
          </Text>
        </View>
      )}

      {error !== '' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navButtonText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 17,
    color: appleTheme.tint,
  },
  navButtonDone: {
    fontWeight: '600',
  },
  navTitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 17,
    fontWeight: '600',
    color: appleTheme.label,
    letterSpacing: -0.4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 10,
    height: 38,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 13,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: appleTheme.label,
    fontFamily: ui.body.fontFamily,
    fontSize: 16,
    padding: 0,
  },
  clearBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: appleTheme.tertiaryLabel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBadgeText: {
    color: appleTheme.label,
    fontSize: 10,
    fontWeight: '700',
  },
  appNameText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: appleTheme.label,
    letterSpacing: -0.3,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: appleTheme.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSymbol: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -1,
  },
  uncheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: appleTheme.fill,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 15,
    color: appleTheme.secondaryLabel,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 14,
    color: appleTheme.red,
  },
});
