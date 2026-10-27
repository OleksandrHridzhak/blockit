import { useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Action, ListRow, ListSection, Page, ui } from '@/components/protection-ui';
import { screenTime } from '@/features/screen-time/client';

interface Trace { time: number; event: string; request: string; detail: string }
interface Diagnostics { build: string; ios: string; grantUntil: number; activities: unknown[]; trace: Trace[] }
const eventNames: Record<string, string> = {
  'monitor-loaded': 'Системне розширення запущено',
  schedule: 'Планування доступу', scheduled: 'Доступ заплановано', 'schedule-failed': 'Помилка планування',
  'grant-opened': 'Доступ відкрито', 'interval-start': 'Початок системного інтервалу', 'interval-end': 'Кінець системного інтервалу',
  'usage-threshold': 'Досягнуто час використання', 'expiry-stale': 'Сигнал попередньої сесії',
  'expiry-early': 'Системний сигнал надійшов зарано', 'shield-restored': 'Блокування відновлено',
};
export default function DiagnosticsScreen() {
  const [raw, setRaw] = useState('');
  const [value, setValue] = useState<Diagnostics | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  async function refresh() {
    setBusy(true); setError('');
    try { const text = await screenTime.diagnostics(); setRaw(text); setValue(JSON.parse(text)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося прочитати діагностику.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let alive = true;
    void screenTime.diagnostics().then(text => {
      if (alive) { setRaw(text); setValue(JSON.parse(text)); }
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Не вдалося прочитати діагностику.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, []);
  return <Page>
    <Action secondary label="Назад" onPress={() => router.back()} />
    <Text style={ui.title}>Діагностика блокування</Text>
    <Text style={ui.mutedText}>Тут видно, чи iOS надсилає сигнали для повторного блокування. Дані залишаються на телефоні, доки ти ними не поділишся.</Text>
    {value && <>
      <ListSection title={`ЗБІРКА ${value.build} · iOS ${value.ios}`}>
        <ListRow><Text style={ui.body}>Системних інтервалів: {value.activities.length}</Text></ListRow>
        <ListRow showSeparator={false}><Text style={ui.body}>{value.grantUntil ? `Кінець доступу: ${new Date(value.grantUntil * 1000).toLocaleTimeString()}` : 'Активного доступу немає'}</Text></ListRow>
      </ListSection>
      <ListSection title="ОСТАННІ ПОДІЇ">
        {value.trace.length === 0 && <ListRow showSeparator={false}><Text style={ui.body}>Почни нову паузу, щоб з’явилися події.</Text></ListRow>}
        {value.trace.map((entry, index) => <ListRow key={`${entry.time}-${index}`} showSeparator={index < value.trace.length - 1}>
          <View style={{ flex: 1, gap: 4 }}><Text style={ui.body}>{eventNames[entry.event] ?? entry.event}</Text><Text style={ui.mutedText}>{new Date(entry.time * 1000).toLocaleTimeString()} · {entry.request}</Text></View>
        </ListRow>)}
      </ListSection>
      <Action secondary label="Поділитися діагностикою" disabled={busy} onPress={() => { void Share.share({ message: raw }).catch(() => setError('Не вдалося відкрити меню поширення.')); }} />
    </>}
    {error !== '' && <Text accessibilityLiveRegion="polite" style={ui.body}>{error}</Text>}
    <Action label={busy ? 'Оновлюємо…' : 'Оновити'} disabled={busy} onPress={() => void refresh()} />
  </Page>;
}
