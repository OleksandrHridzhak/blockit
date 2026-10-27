import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Action,
  AppBadge,
  appleTheme,
  ListRow,
  ListSection,
  Page,
  ui,
} from '@/components/protection-ui';
import { useProtection } from '@/hooks/use-protection';
import {
  getAppRule,
  getEffectiveSeconds,
  previewApps,
} from '@/features/preview/store';
import { screenTime } from '@/features/screen-time/client';
import { getCatalogApp } from '@/core/catalog';
import { groupsService } from '@/features/groups/service';
import type { AppGroup } from '@/features/screen-time/client';
import { FamilyAppLabel } from '@/components/family-app-label';
import { EditorialIcon } from '@/components/editorial-icon';
import { appCuriosityEnabled, curiosityEnabled } from '@/features/curiosity/storage';
import { hasPauseTimer, isMicrolearning, microlearningRoute } from '@/core/pause-mode-settings';

export default function HomeScreen() {
  const { view, busy, error, run, refresh } = useProtection();
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [groupError, setGroupError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => {
    let alive = true;
    groupsService.load().then(data => { if (alive) { setGroups(data.groups); setGroupError(''); } })
      .catch(e => { if (alive) setGroupError(e instanceof Error ? e.message : 'Не вдалося завантажити групи.'); });
    return () => { alive = false; };
  }, []));
  useEffect(() => {
    if (!view?.snoozeUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [view?.snoozeUntil]);

  const getModeLabel = (mode?: string) =>
    mode === 'microlearning-v2' ? 'Microlearning v2'
      : mode === 'microlearning' ? 'Microlearning'
      : mode === 'stroop'
      ? 'Тест Струпа'
      : mode === 'math'
      ? 'Математика'
      : mode === 'passcode'
      ? 'Введення коду'
      : mode === 'breathing'
      ? 'Дихання'
      : mode === 'typing'
      ? 'Написати фразу'
      : mode === 'reflection'
      ? 'Обрати намір'
      : 'Звичайна пауза';

  const isSnoozed = Boolean(view?.snoozeUntil && view.snoozeUntil > now);
  const snoozeEndTime = isSnoozed && view?.snoozeUntil
    ? new Date(view.snoozeUntil).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const addApps = () => {
    if (!view) return;
    if (view.demo) {
      router.push('/select-apps');
      return;
    }
    run(async () => {
      if (view.authorization !== 'approved') await screenTime.authorize();
      await screenTime.pick();
      setGroups(await screenTime.groups());
    });
  };

  const tryPause = (appId?: string) => {
    if (appId && isMicrolearning(getAppRule(appId).mode)) {
      router.push({ pathname: microlearningRoute(getAppRule(appId).mode), params: { preview: '1', seconds: String(getAppRule(appId).seconds) } } as unknown as Href);
      return;
    }
    if (appId && appCuriosityEnabled(appId, 'legacy')) {
      router.push({ pathname: '/curiosity', params: { preview: '1' } });
      return;
    }
    const appEntry = previewApps.find((item) => item.id === appId);
    const rule = getAppRule(appId);
    const effectiveSec = getEffectiveSeconds(rule);

    router.push({
      pathname: '/intervene',
      params: {
        preview: '1',
        seconds: String(effectiveSec),
        mode: rule.mode,
        label: appEntry?.name ?? 'обраного застосунку',
        sessionMinutes: String(rule.sessionMinutes ?? 5),
        appId: appId ?? '',
        rounds: String((rule.mode === 'math' ? rule.mathRounds : rule.mode === 'stroop' ? rule.stroopRounds : rule.rounds) ?? 3),
        codeLength: String(rule.codeLength ?? 6),
      },
    });
  };

  const editAppRule = (appId: string) => {
    router.push({
      pathname: '/app-rule',
      params: { appId },
    });
  };

  return (
    <Page>
      {/* iOS Large Title Header */}
      <View style={styles.headerContainer}>
        <Text style={ui.largeTitle}>Застосунки</Text>
      </View>

      {/* Snooze indicator banner if active */}
      {isSnoozed && (
        <Pressable
          onPress={() => router.push('/explore')}
          style={styles.snoozeBanner}
        >
          <Text style={styles.snoozeBannerText}>
            ⏸️ Обмеження призупинено до {snoozeEndTime}
          </Text>
        </Pressable>
      )}

      {error !== '' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Action
            label="Спробувати ще раз"
            secondary
            disabled={busy}
            onPress={() => run(refresh)}
          />
        </View>
      )}

      {view && !view.demo && !view.notifications && <ListSection title="ПЕРЕХІД У BLOCKIT" footer="Торкнися сповіщення після початку паузи. Якщо його немає — відкрий Blockit вручну.">
        <ListRow showSeparator={false} onPress={() => run(async () => {
          const allowed = await screenTime.notifications();
          if (!allowed) throw new Error('Сповіщення вимкнені. Увімкни їх для Blockit у налаштуваннях iPhone або відкривай Blockit вручну.');
        })}><Text style={styles.addAppLabel}>Дозволити сповіщення Blockit</Text></ListRow>
      </ListSection>}
      {!view ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.mutedText}>Завантажуємо налаштування…</Text>
        </View>
      ) : view.apps.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={{ fontSize: 34 }}>⏳</Text>
          </View>
          <Text style={styles.emptyTitle}>
            Які застосунки відкриваєш за звичкою?
          </Text>
          <Text style={styles.emptySubtitle}>
            Додай їх сюди. Перед відкриттям кожного додатка діятиме легка усвідомлена пауза, яку можна налаштувати окремо.
          </Text>

          <View style={{ width: '100%', gap: 12, marginTop: 12 }}>
            <Action
              label="Додати застосунки"
              disabled={busy}
              onPress={addApps}
            />
            <Action
              label="Спробувати приклад паузи"
              secondary
              onPress={() => tryPause()}
            />
          </View>
        </View>
      ) : (
        /* Blocked Apps List with Add row as last item */
        <ListSection
          title="ОБРАНІ ЗАСТОСУНКИ"
          footer="Тут окремі застосунки з власними налаштуваннями. Застосунки у групах показано всередині груп."
        >
          {view.demo ? (
            view.apps.map((id) => {
              const catalog = getCatalogApp(id);
              const name =
                catalog?.name ??
                previewApps.find((app) => app.id === id)?.name ??
                id;

              const appRule = getAppRule(id);
              const curiosity = appCuriosityEnabled(id, 'legacy');
              const effectiveSec = curiosity ? appRule.seconds : getEffectiveSeconds(appRule);
              const ruleLabel = curiosity ? 'Curiosity Mode' : getModeLabel(appRule.mode);
              const opensToday = appRule.todayOpens ?? 0;

              return (
                <ListRow
                  key={id}
                  showSeparator={true}
                  onPress={() => editAppRule(id)}
                >
                  <AppBadge name={name} color={catalog?.accentColor} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appNameText}>{name}</Text>
                    <Text style={styles.appDetailText}>
                      {hasPauseTimer(appRule.mode) ? `${effectiveSec} с · ` : ''}{ruleLabel.toLowerCase()}
                      {!curiosity && appRule.mode === 'countdown' && appRule.escalating ? ' 📈' : ''} · {opensToday > 0 ? `${opensToday} відкр. сьогодні` : 'сьогодні не відкривався'}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </ListRow>
              );
            })
          ) : (
            view.apps.map(id => <ListRow key={id} onPress={() => router.push({ pathname: '/selected-app', params: { appId: id } })}>
              <View style={{ flex: 1, gap: 3 }}>
                <FamilyAppLabel tokenId={id} />
                <Text style={styles.appDetailText}>{hasPauseTimer(view.appRules?.[id]?.mode ?? view.mode) ? `${view.appRules?.[id]?.seconds ?? view.seconds} с · ` : ''}{appCuriosityEnabled(id, 'legacy') ? 'Curiosity Mode' : getModeLabel(view.appRules?.[id]?.mode ?? view.mode)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </ListRow>)
          )}

          {/* Plus Add Row as the last item inside the list */}
          <ListRow
            showSeparator={false}
            onPress={addApps}
          >
            <View style={styles.addIconBadge}>
              <EditorialIcon name="add" active size={19} />
            </View>
            <Text style={styles.addAppLabel}>Додати застосунки</Text>
          </ListRow>
        </ListSection>
      )}
      {groupError !== '' && <Text style={styles.errorText}>{groupError}</Text>}
      <ListSection title="ГРУПИ ЗАСТОСУНКІВ" footer="Об’єднай застосунки в групу зі спільними налаштуваннями.">
        {groups.map(group => <ListRow key={group.id} onPress={() => router.push({ pathname: '/group', params: { id: group.id } })}>
          <AppBadge name={group.name} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={styles.appNameText}>{group.name}</Text>
            <Text style={styles.appDetailText}>{group.appIds.length} застосунків · {hasPauseTimer(group.previewRule?.mode ?? group.mode) ? `${group.seconds} с · ` : ''}{curiosityEnabled(group.id) ? 'Curiosity Mode' : getModeLabel(group.previewRule?.mode ?? group.mode)}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </ListRow>)}
        <ListRow showSeparator={false} onPress={() => router.push('/group')}>
          <View style={styles.addIconBadge}><EditorialIcon name="add" active size={19} /></View>
          <Text style={styles.addAppLabel}>Створити групу</Text>
        </ListRow>
      </ListSection>
    </Page>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  snoozeBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    borderRadius: 10,
  },
  snoozeBannerText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: appleTheme.orange,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  mutedText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 15,
    color: appleTheme.secondaryLabel,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: appleTheme.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: appleTheme.label,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 16,
    lineHeight: 22,
    color: appleTheme.secondaryLabel,
    textAlign: 'center',
    maxWidth: 380,
  },
  appNameText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: appleTheme.label,
    letterSpacing: -0.3,
  },
  appDetailText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 13,
    color: appleTheme.secondaryLabel,
    marginTop: 1,
  },
  chevron: {
    fontFamily: ui.body.fontFamily,
    fontSize: 20,
    fontWeight: '400',
    color: appleTheme.secondaryLabel,
  },
  addIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAppLabel: {
    fontFamily: ui.body.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: appleTheme.tint,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  errorText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 14,
    color: appleTheme.red,
  },
});
