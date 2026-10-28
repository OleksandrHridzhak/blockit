import { useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Action, ListRow, ListSection, Page, SegmentedControl, ui } from '@/components/protection-ui';
import { screenTime } from '@/features/screen-time/client';

interface Trace { time: number; event: string; request: string; detail: string; process?: string }
interface Diagnostics { build: string; ios: string; grantUntil: number; activities: unknown[]; trace: Trace[]; lastError?: string; shieldProbeMode?: 'normal' | 'screen' | 'notification'; shieldProbeCount?: number }
const probeModes = ['normal', 'screen', 'notification'] as const;
const eventNames: Record<string, string> = {
  'monitor-loaded': 'Системне розширення запущено',
  'schedule-readback': 'iOS повернула запланований інтервал',
  'expired-grant-reconciled': 'Прострочений доступ закрито під час оновлення стану',
  schedule: 'Планування доступу', scheduled: 'Доступ заплановано', 'schedule-failed': 'Помилка планування',
  'grant-opened': 'Доступ відкрито', 'interval-start': 'Початок системного інтервалу', 'interval-end': 'Кінець системного інтервалу',
  'usage-threshold': 'Досягнуто час використання', 'expiry-stale': 'Сигнал попередньої сесії',
  'expiry-early': 'Системний сигнал надійшов зарано', 'shield-restored': 'Блокування відновлено',
};
export default function DiagnosticsScreen() {
  const [value, setValue] = useState<Diagnostics | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [switching, setSwitching] = useState(false);
  async function refresh() {
    setBusy(true); setError('');
    try { const text = await screenTime.diagnostics(); setValue(JSON.parse(text)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося прочитати діагностику.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let alive = true;
    void screenTime.diagnostics().then(text => {
      if (alive) { setValue(JSON.parse(text)); }
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Не вдалося прочитати діагностику.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, []);
  async function changeProbe(index: number) {
    const mode = probeModes[index];
    if (!mode || mode === value?.shieldProbeMode) return;
    setSwitching(true); setError('');
    try { await screenTime.setShieldProbeMode(mode); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося змінити режим тесту.'); }
    finally { setSwitching(false); }
  }
  return <Page>
    <Action secondary label="Назад" onPress={() => router.back()} />
    <Text style={ui.title}>Діагностика блокування</Text>
    <Text style={ui.mutedText}>Тут видно, чи iOS надсилає сигнали для повторного блокування. Дані залишаються на телефоні, доки ти ними не поділишся.</Text>
    {value && <>
      <ListSection title={`ЗБІРКА ${value.build} · iOS ${value.ios}`}>
        <ListRow><Text style={ui.body}>Системних інтервалів: {value.activities.length}</Text></ListRow>
        <ListRow showSeparator={false}><Text style={ui.body}>{value.grantUntil ? `Кінець доступу: ${new Date(value.grantUntil * 1000).toLocaleTimeString()}` : 'Активного доступу немає'}</Text></ListRow>
      </ListSection>
      {value.shieldProbeMode !== undefined && <ListSection title="ТЕСТ КНОПКИ">
        <View style={{ padding: 16, gap: 12 }}>
          <SegmentedControl values={['Звичайна', 'Лише текст', '+ сповіщення']} selectedIndex={probeModes.indexOf(value.shieldProbeMode)} onChange={index => void changeProbe(index)} disabled={busy || switching} />
          <Text style={ui.mutedText}>{value.shieldProbeMode === 'normal'
            ? 'Звичайна пауза з таймером.'
            : 'Тестова кнопка змінює текст блокування. Таймер не запускається, доступ залишається закритим.'}</Text>
          <Text style={ui.mutedText}>Зміна режиму завершує поточний доступ. Після тесту вибери «Звичайна», щоб повернути паузи.</Text>
          {value.shieldProbeMode !== 'normal' && <Text style={ui.body}>Натискань у тесті: {value.shieldProbeCount ?? 0}</Text>}
        </View>
      </ListSection>}
      <ListSection title="ОСТАННІ ПОДІЇ">
        {value.trace.length === 0 && <ListRow showSeparator={false}><Text style={ui.body}>Почни нову паузу, щоб з’явилися події.</Text></ListRow>}
        {value.trace.map((entry, index) => <ListRow key={`${entry.time}-${index}`} showSeparator={index < value.trace.length - 1}>
          <View style={{ flex: 1, gap: 4 }}><Text style={ui.body}>{eventNames[entry.event] ?? entry.event}</Text><Text style={ui.mutedText}>{new Date(entry.time * 1000).toLocaleTimeString()} · {entry.request}</Text></View>
        </ListRow>)}
      </ListSection>
      <Action secondary label="Поділитися коротким звітом" disabled={busy || switching} onPress={() => {
        const report = { build: value.build, ios: value.ios, mode: value.shieldProbeMode ?? 'normal', presses: value.shieldProbeCount ?? 0,
          lastError: value.lastError ?? '', grantUntil: value.grantUntil, activities: value.activities.length,
          trace: value.trace.filter(entry => entry.process?.endsWith('.BlockitAction') || /error|failed/.test(entry.event)).slice(0, 8) };
        void Share.share({ message: JSON.stringify(report, null, 2) }).catch(() => setError('Не вдалося відкрити меню поширення.'));
      }} />
    </>}
    {error !== '' && <Text accessibilityLiveRegion="polite" style={ui.body}>{error}</Text>}
    <Action label={busy ? 'Оновлюємо…' : 'Оновити'} disabled={busy || switching} onPress={() => void refresh()} />
  </Page>;
}
