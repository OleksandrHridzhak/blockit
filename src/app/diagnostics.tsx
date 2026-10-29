import { useThemeStyles } from '@/features/appearance/theme';
import { useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Action, ListRow, ListSection, Page, SegmentedControl, ui as sharedUI } from '@/components/protection-ui';
import { screenTime } from '@/features/screen-time/client';
import { diagnosticJournal, setDiagnosticCapture } from '@/features/diagnostics/journal';
import { readNativeDiagnostics, shareDiagnosticReport } from '@/features/diagnostics/report';

interface Trace { time: number; event: string; request: string; detail: string; process?: string }
interface Diagnostics { build: string; ios: string; grantUntil: number; activities: unknown[]; trace: Trace[]; lastError?: string; supportsResponseProbe?: boolean; shieldProbeMode?: 'normal' | 'screen' | 'notification' | 'response'; shieldProbeCount?: number }
const probeModes = ['normal', 'screen', 'notification', 'response'] as const;
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
  const ui = useThemeStyles(sharedUI);
  const [value, setValue] = useState<Diagnostics | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [journal, setJournal] = useState(() => diagnosticJournal.snapshot());
  const [sharing, setSharing] = useState(false);
  async function refresh() {
    setBusy(true); setError('');
    try { setValue(await readNativeDiagnostics() as unknown as Diagnostics); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося прочитати діагностику.'); }
    finally { setBusy(false); setJournal(diagnosticJournal.snapshot()); }
  }
  useEffect(() => {
    let alive = true;
    void readNativeDiagnostics().then(value => {
      if (alive) { setValue(value as unknown as Diagnostics); }
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Не вдалося прочитати діагностику.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setJournal(diagnosticJournal.snapshot()), 2000);
    return () => clearInterval(timer);
  }, []);
  async function toggleCapture() {
    setSwitching(true);
    try {
      const enabled = !diagnosticJournal.isEnabled();
      await screenTime.setDiagnosticCapture(enabled);
      setDiagnosticCapture(enabled);
      setJournal(diagnosticJournal.snapshot());
    } catch (error) { setError(error instanceof Error ? error.message : 'Не вдалося змінити запис журналу.'); }
    finally { setSwitching(false); }
  }
  async function shareFullReport() {
    setSharing(true); setError('');
    try { await shareDiagnosticReport(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Не вдалося поділитися звітом.'); }
    finally { setSharing(false); }
  }
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
    <Text style={ui.mutedText}>Журнал для тестування: помилки, дії, переходи, запити та сигнали блокування. Дані залишаються на пристрої, доки ти ними не поділишся.</Text>
    <ListSection title="DEV-ЖУРНАЛ">
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={ui.body}>{journal.enabled ? 'Розширений запис увімкнено' : 'Запис вимкнено'} · записів: {journal.entries.length}</Text>
        <Text style={ui.mutedText}>Зберігається до 2 000 подій застосунку та 512 подій кожного системного процесу. Журнал застосунку обмежено 2 МБ. Після заповнення старі записи замінюються новими.</Text>
        {journal.dropped > 0 && <Text style={ui.mutedText}>Замінено старих записів застосунку: {journal.dropped}</Text>}
        {journal.storageError !== '' && <Text style={ui.body}>{journal.storageError}</Text>}
        <Action label={sharing ? 'Готуємо звіт…' : 'Поділитися повним звітом'} disabled={sharing || switching} onPress={() => void shareFullReport()} />
        <Action secondary label={journal.enabled ? 'Вимкнути запис' : 'Увімкнути запис'} disabled={switching || sharing} onPress={() => void toggleCapture()} />
        <Action secondary destructive label="Очистити журнал" disabled={sharing || switching} onPress={() => {
          setSwitching(true);
          void screenTime.clearDiagnosticTrace().then(() => {
            diagnosticJournal.clear(); setJournal(diagnosticJournal.snapshot());
            setValue(current => current ? { ...current, trace: [] } : null);
          }).catch(error => setError(error instanceof Error ? error.message : 'Не вдалося очистити журнал.'))
            .finally(() => setSwitching(false));
        }} />
        <Text style={ui.mutedText}>Повний звіт містить збережену хронологію та стан системи. Відповіді й секретні поля приховуються. Системні звіти про аварійне завершення iOS збирає окремо.</Text>
      </View>
    </ListSection>
    <ListSection title="ОСТАННІ ПОДІЇ ЗАСТОСУНКУ">
      {journal.entries.slice(-40).reverse().map(entry => <ListRow key={`${entry.session}-${entry.sequence}`}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text selectable style={ui.body}>{entry.level.toUpperCase()} · {entry.event}</Text>
          <Text style={ui.mutedText}>{new Date(entry.time).toLocaleTimeString()} · {entry.route ?? ''}</Text>
          {entry.data !== undefined && <Text selectable numberOfLines={4} style={ui.mutedText}>{JSON.stringify(entry.data)}</Text>}
        </View>
      </ListRow>)}
    </ListSection>
    {value && <>
      <ListSection title={`ЗБІРКА ${value.build} · iOS ${value.ios}`}>
        <ListRow><Text style={ui.body}>Системних інтервалів: {value.activities.length}</Text></ListRow>
        <ListRow showSeparator={false}><Text style={ui.body}>{value.grantUntil ? `Кінець доступу: ${new Date(value.grantUntil * 1000).toLocaleTimeString()}` : 'Активного доступу немає'}</Text></ListRow>
      </ListSection>
      {value.shieldProbeMode !== undefined && <ListSection title="ТЕСТ КНОПКИ">
        <View style={{ padding: 16, gap: 12 }}>
          <SegmentedControl values={['Звичайна', 'Лише текст', '+ сповіщення']} selectedIndex={probeModes.indexOf(value.shieldProbeMode)} onChange={index => void changeProbe(index)} disabled={busy || switching} />
          {value.supportsResponseProbe && <Action secondary label="Без змін екрана" selected={value.shieldProbeMode === 'response'} disabled={busy || switching} onPress={() => void changeProbe(3)} />}
          <Text style={ui.mutedText}>{value.shieldProbeMode === 'response' ? 'Кнопка лише відповідає iOS. Текст і лічильник не змінюються; таймер і сповіщення не запускаються.' : value.shieldProbeMode === 'normal'
            ? 'Звичайна пауза з таймером.'
            : 'Тестова кнопка змінює текст блокування. Таймер не запускається, доступ залишається закритим.'}</Text>
          <Text style={ui.mutedText}>Зміна режиму завершує поточний доступ. Після тесту вибери «Звичайна», щоб повернути паузи.</Text>
          {value.shieldProbeMode !== 'normal' && value.shieldProbeMode !== 'response' && <Text style={ui.body}>Натискань у тесті: {value.shieldProbeCount ?? 0}</Text>}
        </View>
      </ListSection>}
      <ListSection title="ОСТАННІ ПОДІЇ">
        {value.trace.length === 0 && <ListRow showSeparator={false}><Text style={ui.body}>Почни нову паузу, щоб з’явилися події.</Text></ListRow>}
        {value.trace.slice(0, 60).map((entry, index) => <ListRow key={`${entry.time}-${index}`} showSeparator={index < 59}>
          <View style={{ flex: 1, gap: 4 }}><Text style={ui.body}>{eventNames[entry.event] ?? entry.event}</Text><Text style={ui.mutedText}>{new Date(entry.time * 1000).toLocaleTimeString()} · {entry.process} · {entry.request}</Text><Text selectable style={ui.mutedText}>{entry.detail}</Text></View>
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
