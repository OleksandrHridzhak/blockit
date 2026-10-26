import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, Card, Copy, Kicker, Page, ui } from '@/components/protection-ui';
import { useProtection } from '@/hooks/use-protection';
import { previewApps, saveRule } from '@/features/preview/store';
import { screenTime } from '@/features/screen-time/client';

export default function HomeScreen() {
  const { view, busy, error, run, refresh } = useProtection();
  const modeLabel = view?.mode === 'typing' ? 'Написати фразу' : view?.mode === 'reflection' ? 'Назвати намір' : 'Звичайна пауза';
  const addApps = () => {
    if (!view) return;
    if (view.demo) { router.push('/select-apps'); return; }
    run(async () => {
      if (view.authorization !== 'approved') await screenTime.authorize();
      await screenTime.pick();
    });
  };
  const tryPause = (app?: string) => router.push({ pathname: '/intervene', params: {
    preview: '1', seconds: String(view?.seconds ?? 20), mode: view?.mode ?? 'countdown',
    label: previewApps.find(item => item.id === app)?.name ?? 'обраного застосунку',
  } });

  return <Page>
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Copy title>Застосунки</Copy><Kicker>Blockit</Kicker></View>
    {view?.demo && <View style={ui.notice}><Copy muted>Демо · без блокування інших застосунків</Copy></View>}
    {error !== '' && <Card><Copy>{error}</Copy><Action label="Спробувати ще раз" secondary disabled={busy} onPress={() => run(refresh)} /></Card>}
    {!view ? <Copy muted>Завантажуємо налаштування…</Copy> : view.count === 0 ? <>
      <View style={{ gap: 14, paddingVertical: 12 }}>
        <Text style={[ui.welcome, { fontFamily: 'Geist' }]}>Які застосунки{"\n"}відкриваєш за звичкою?</Text>
        <Copy muted>Додай їх сюди. Перед відкриттям буде коротка пауза, щоб вирішити, чи це тобі потрібно.</Copy>
      </View>
      <Action label="Додати застосунки" disabled={busy} onPress={addApps} />
      <View style={{ gap: 8 }}><Kicker>Для початку</Kicker><Copy>Пауза {view.seconds} секунд. {view.mode === 'countdown' ? 'Без додаткових завдань.' : modeLabel + '.'}</Copy></View>
      <Action label="Спочатку спробувати паузу" secondary onPress={() => tryPause()} />
    </> : <>
      <View style={ui.statusLine}><View style={{ width: 7, height: 7, backgroundColor: view.enabled ? '#FAFAFA' : '#525252' }} /><Copy>{view.demo ? 'Обрано для демонстрації' : view.authorization !== 'approved' ? 'Потрібен доступ до Екранного часу' : view.enabled ? 'Захист увімкнено' : 'Захист вимкнено'}</Copy></View>
      <View style={{ gap: 0 }}>
        {view.demo ? view.apps.map(id => <View key={id} style={ui.appRow}>
          <View style={ui.appMark}><Text style={ui.appMarkText}>{previewApps.find(app => app.id === id)?.name.slice(0, 1)}</Text></View>
          <View style={{ flex: 1, gap: 2 }}><Copy>{previewApps.find(app => app.id === id)?.name}</Copy><Copy muted>{view.seconds} с · {modeLabel.toLowerCase()}</Copy></View>
          <Action label="Спробувати" secondary onPress={() => tryPause(id)} />
        </View>) : <Card><Copy title>Обрано застосунків: {view.count}</Copy><Copy muted>Переглянути назви та змінити вибір можна в системному списку iPhone.</Copy></Card>}
      </View>
      <Action label={view.demo ? 'Змінити список' : 'Змінити застосунки'} disabled={busy} onPress={addApps} />
      <View style={{ gap: 12, borderTopWidth: 1, borderColor: '#2E2E2E', paddingTop: 24 }}>
        <Kicker>Перед відкриттям</Kicker><Copy>{view.seconds} секунд · {modeLabel}</Copy>
        <Action label="Змінити правило" secondary onPress={() => router.push('/explore')} />
      </View>
      {!view.demo && <Action label="Перевірити приклад паузи" secondary onPress={() => tryPause()} />}
      {!view.demo && view.authorization === 'approved' && <Action label={view.enabled ? 'Вимкнути захист' : 'Увімкнути захист'} secondary disabled={busy} onPress={() => run(() => saveRule(view, { enabled: !view.enabled }))} />}
    </>}
  </Page>;
}
