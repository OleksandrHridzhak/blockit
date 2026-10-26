import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Action, Card, Choice, Copy, Kicker, Page, ui } from '@/components/protection-ui';
import { useProtection } from '@/hooks/use-protection';
import { type ProtectionView, saveRule } from '@/features/preview/store';
import { type PauseMode, screenTime } from '@/features/screen-time/client';

const modes: { id: PauseMode; title: string; detail: string }[] = [
  { id: 'countdown', title: 'Тільки пауза', detail: 'Зачекати й вирішити, чи відкривати застосунок.' },
  { id: 'reflection', title: 'Обрати намір', detail: 'Після паузи обрати: відповісти, зробити справу чи відпочити.' },
  { id: 'typing', title: 'Написати фразу', detail: 'Після паузи написати «Я обираю відкрити свідомо».' },
];
export default function RulesScreen() {
  const { view, busy, error, run } = useProtection();
  const [message, setMessage] = useState('');
  const [help, setHelp] = useState(false);
  return <Page>
    <Copy title>Правила</Copy>
    {view?.demo && <View style={ui.notice}><Copy muted>Демо · зміни впливають на приклад паузи</Copy></View>}
    {view ? <RuleForm key={`${view.seconds}-${view.mode}`} view={view} busy={busy} onChange={() => setMessage('')}
      onSave={(seconds, mode) => run(async () => { await saveRule(view, { seconds, mode }); setMessage('Правило збережено.'); })} /> : <Copy muted>Завантажуємо правило…</Copy>}
    {message !== '' && <View accessibilityLiveRegion="polite"><Copy>{message}</Copy></View>}
    {error !== '' && <Card><Copy>{error}</Copy></Card>}
    {view && !view.demo && view.mode !== 'countdown' && <Card><Copy title>Перехід до завдання</Copy><Copy muted>{view.notifications ? 'Сповіщення дозволені. Якщо режим фокусування приховає повідомлення, відкрий Blockit вручну.' : 'Дозволь сповіщення для переходу до завдання. Без них можна відкрити Blockit вручну.'}</Copy>
      {!view.notifications && <><Action label="Дозволити сповіщення" disabled={busy} onPress={() => run(screenTime.notifications)} /><Action label="Налаштування iPhone" secondary onPress={() => run(() => Linking.openSettings())} /></>}
    </Card>}
    <Action label={help ? 'Сховати пояснення' : 'Як працює блокування?'} secondary onPress={() => setHelp(!help)} />
    {help && <View style={{ gap: 16 }}><Copy muted>iOS перекриває обрані застосунки. На системному екрані натисни «Почати паузу», зачекай і натисни кнопку ще раз.</Copy><Copy muted>Якщо обрано завдання — торкнися сповіщення або відкрий Blockit вручну. Після паузи можна надати доступ приблизно на 15 хвилин.</Copy><Copy muted>Обрані застосунки та правила зберігаються на пристрої. Старі автоматизації Blockit у Shortcuts потрібно вимкнути вручну.</Copy></View>}
  </Page>;
}
function RuleForm({ view, busy, onSave, onChange }: {
  view: ProtectionView; busy: boolean; onSave: (seconds: number, mode: PauseMode) => void; onChange: () => void;
}) {
  const [seconds, setSeconds] = useState(view.seconds);
  const [mode, setMode] = useState(view.mode);
  const dirty = seconds !== view.seconds || mode !== view.mode;
  return <>
    <View style={{ gap: 12 }}><Kicker>Тривалість паузи</Kicker><View style={ui.row}>
      {[10, 20, 30, 60].map(value => <View key={value} style={{ flex: 1, minWidth: 55 }}><Action label={`${value} с`} secondary selected={seconds === value} disabled={busy} onPress={() => { setSeconds(value); onChange(); }} /></View>)}
    </View></View>
    <View><Kicker>Що зробити перед відкриттям</Kicker>{modes.map(item => <Choice key={item.id} title={item.title} detail={item.detail}
      selected={mode === item.id} disabled={busy} onPress={() => { setMode(item.id); onChange(); }} />)}</View>
    <Copy muted>Одне правило для всіх обраних застосунків. Після зміни правила поточний доступ завершиться.</Copy>
    <Action label={busy ? 'Зберігаємо…' : dirty ? 'Зберегти правило' : 'Правило збережене'} disabled={!dirty || busy} onPress={() => onSave(seconds, mode)} />
  </>;
}
