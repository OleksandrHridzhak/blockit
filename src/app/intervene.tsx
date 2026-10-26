import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Text, TextInput, View } from 'react-native';
import { Action, Card, Copy, Kicker, Page, ui, usePalette } from '@/components/protection-ui';
import { PauseMode, PauseRequest, remainingSeconds, screenTime } from '@/features/screen-time/client';

const PHRASE = 'Я обираю відкрити свідомо';
export default function PauseScreen() {
  const params = useLocalSearchParams<{ preview?: string; request?: string; seconds?: string; mode?: string; label?: string }>();
  const preview = params.preview === '1';
  const duration = [10, 20, 30, 60].includes(Number(params.seconds)) ? Number(params.seconds) : 20;
  const mode: PauseMode = params.mode === 'typing' || params.mode === 'reflection' ? params.mode : 'countdown';
  return <PauseSession key={`${preview}-${params.request ?? ''}-${duration}-${mode}-${params.label ?? ''}`} preview={preview} duration={duration} mode={mode} label={params.label?.slice(0, 80) ?? 'застосунку'} />;
}
function PauseSession({ preview, duration, mode, label }: { preview: boolean; duration: number; mode: PauseMode; label: string }) {
  const c = usePalette();
  const [request, setRequest] = useState<PauseRequest | null>(() => preview ? { id: 'preview', readyAt: Date.now() + duration * 1000, mode } : null);
  const [now, setNow] = useState(() => Date.now());
  const [answer, setAnswer] = useState('');
  const [loaded, setLoaded] = useState(preview);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      setNow(Date.now());
      if (!preview) {
        try { const pending = await screenTime.pending(); if (alive) { setRequest(pending); setLoaded(true); } }
        catch { if (alive) { setError('Не вдалося прочитати запит. Відкрий Blockit ще раз.'); setLoaded(true); } }
      }
    };
    refresh();
    const timer = setInterval(() => setNow(Date.now()), 250);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { alive = false; clearInterval(timer); sub.remove(); };
  }, [preview]);
  const seconds = request ? remainingSeconds(request.readyAt, now) : 0;
  const valid = request?.mode === 'typing' ? answer.trim() === PHRASE : request?.mode === 'reflection' ? ['reply', 'task', 'rest'].includes(answer) : true;
  async function finish() {
    if (lock.current || !request || seconds > 0 || !valid) return;
    lock.current = true; setBusy(true); setError('');
    try { if (!preview) await screenTime.finish(request.id, answer); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося надати доступ. Спробуй знову.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function leave() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { if (!preview) await screenTime.cancel(); router.replace('/'); }
    catch { setError('Не вдалося закрити запит. Спробуй знову.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Page><Stack.Screen options={{ headerShown: false }} />
    <Kicker>{preview ? 'ПРИКЛАД / БЕЗ РОЗБЛОКУВАННЯ' : 'ПАУЗА / ПЕРЕД ВІДКРИТТЯМ'}</Kicker>
    {done ? <><Copy large>{preview ? 'Ось як це працює' : 'Доступ відкрито'}</Copy><Card><Copy>{preview ? 'У справжній паузі доступ відкриється лише після перевірки часу й завдання.' : 'Повернися до застосунку, з якого почалась пауза. Доступ триватиме близько 15 хвилин.'}</Copy></Card><Action label="До застосунків" onPress={() => router.replace('/')} /></> : !loaded ? <Copy>Відкриваємо паузу…</Copy> : !request ? <><Copy large>Активної паузи немає</Copy><Copy muted>Відкрий заблокований застосунок і натисни кнопку на екрані паузи. Запит дійсний 10 хвилин.</Copy><Action label="До застосунків" onPress={() => router.replace('/')} /></> : <>
      <Copy title>{preview ? `Пауза перед відкриттям ${label}` : "Пауза перед відкриттям"}</Copy>
      <View style={{ paddingVertical: 36, gap: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
        <Copy muted>{seconds > 0 ? "Зачекай. Потім виріши, чи хочеш продовжити." : "Пауза завершилась. Відкривати?"}</Copy>
        <View style={[ui.row, { alignItems: 'baseline', gap: 14 }]}>
          <Text style={{ fontFamily: 'InstrumentSans', fontSize: 96, lineHeight: 108, fontWeight: '400', letterSpacing: -4, color: c.text }}>{seconds > 0 ? String(seconds).padStart(2, '0') : '00'}</Text>
          <Kicker>{seconds > 0 ? 'секунд' : 'готово'}</Kicker>
        </View>
      </View>
      {request.mode === 'reflection' && <Card><Copy title>Навіщо відкриваєш?</Copy><Copy muted>Обери те, що зараз відповідає твоєму наміру.</Copy><View style={ui.row}>{[{id:'reply', label:'Відповісти'}, {id:'task', label:'Зробити справу'}, {id:'rest', label:'Відпочити'}].map(reason => <Action key={reason.id} label={reason.label} secondary selected={answer === reason.id} onPress={() => setAnswer(reason.id)} />)}</View></Card>}
      {request.mode === 'typing' && <Card><Copy title>Напиши фразу</Copy><Copy>{PHRASE}</Copy><TextInput accessibilityLabel="Фраза усвідомленого вибору" value={answer} onChangeText={setAnswer} autoCorrect={false} multiline style={{ color: c.text, borderColor: c.line, borderWidth: 1, borderRadius: 0, padding: 14, fontFamily: 'Geist', fontSize: 17, minHeight: 54 }} /></Card>}
      <Action label={seconds > 0 ? `Ще ${seconds} с` : !valid ? 'Спочатку заверши завдання' : preview ? 'Завершити демопаузу' : 'Надати доступ на 15 хвилин'} disabled={busy || seconds > 0 || !valid} onPress={finish} />
      <Action label="Не відкривати" secondary disabled={busy} onPress={leave} />
    </>}
    {error !== '' && <Card><Copy>{error}</Copy></Card>}
  </Page>;
}
