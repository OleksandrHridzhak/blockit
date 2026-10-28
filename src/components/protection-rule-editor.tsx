import { useThemeStyles, useAppTheme, createThemeStyles } from '@/features/appearance/theme';
import { router, Stack, type Href } from 'expo-router';
import { type ReactNode, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Action, Copy, ListRow, ListSection, Page, appleTheme, ui as sharedUI } from './protection-ui';
import { EditorialIcon } from './editorial-icon';
import { groupModes } from '@/features/groups/service';
import { type AppRule, getEffectiveSeconds } from '@/features/preview/store';
import { screenTime, type PauseMode } from '@/features/screen-time/client';
import { parsePauseSeconds, pauseDurationText, type PauseUnit } from '@/core/pause-duration';
import { challengeCodeLength, challengeRounds, hasPauseTimer, isMicrolearning, microlearningRoute, PAUSE_PHRASE } from '@/core/pause-mode-settings';

export interface RuleDraft extends AppRule { curiosity: boolean }
const DEMO_MODES: { id: PauseMode; title: string; detail: string }[] = [
  ...groupModes,
  { id: 'breathing', title: 'Дихальна вправа', detail: 'Дихай у ритмі вправи під час паузи.' },
  { id: 'math', title: 'Математичний виклик', detail: 'Розв’яжи арифметичні приклади.' },
  { id: 'passcode', title: 'Ввести код', detail: 'Перепиши перевірочний код.' },
  { id: 'stroop', title: 'Тест Струпа', detail: 'Обери колір літер, а не слово.' },
];

export function ProtectionRuleEditor({ initial, demo, label, identity, selection, valid = true,
  onSave, onRemove, removeLabel = 'Видалити із заблокованих', saveLabel = 'Зберегти правило', canChangeSelection = false,
}: {
  initial: RuleDraft; demo: boolean; label: string;
  identity: (busy: boolean) => ReactNode; selection?: (busy: boolean) => ReactNode;
  valid?: boolean; onSave: (draft: RuleDraft, pick: boolean) => Promise<boolean>;
  onRemove?: () => Promise<void>; removeLabel?: string; saveLabel?: string; canChangeSelection?: boolean;
}) {
  const appleTheme = useAppTheme();
  const ui = useThemeStyles(sharedUI);
  const styles = useThemeStyles(themeStyles);
  const [draft, setDraft] = useState<RuleDraft>(() => initial.curiosity ? { ...initial, mode: 'countdown' } : initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [pauseUnit, setPauseUnit] = useState<PauseUnit>('seconds');
  const [pauseText, setPauseText] = useState(() => String(initial.seconds));
  const pauseSeconds = parsePauseSeconds(pauseText, pauseUnit);
  const pauseError = hasPauseTimer(draft.mode) && pauseSeconds === null
    ? pauseUnit === 'seconds' ? 'Введи цілу кількість секунд від 1 до 86400.' : 'Введи від 1 секунди до 1440 хвилин. Можна дробове число хвилин.' : '';
  function changePauseUnit(unit: PauseUnit) {
    if (unit === pauseUnit) return;
    if (pauseSeconds !== null) setPauseText(pauseDurationText(pauseSeconds, unit));
    setPauseUnit(unit);
  }
  const [sessionUnit, setSessionUnit] = useState<PauseUnit>(() => (initial.sessionMinutes ?? 15) % 1 ? 'seconds' : 'minutes');
  const [sessionText, setSessionText] = useState(() => pauseDurationText(Math.round((initial.sessionMinutes ?? (demo ? 5 : 15)) * 60), sessionUnit));
  const [mathRoundsText, setMathRoundsText] = useState(() => String(challengeRounds(initial.mathRounds ?? initial.rounds)));
  const [stroopRoundsText, setStroopRoundsText] = useState(() => String(challengeRounds(initial.stroopRounds ?? initial.rounds)));
  const [codeLengthText, setCodeLengthText] = useState(() => String(challengeCodeLength(initial.codeLength)));
  const lock = useRef(false);
  const modes: { id: PauseMode | 'curiosity'; title: string; detail: string }[] = [
    ...(demo ? DEMO_MODES : groupModes),
    { id: 'curiosity', title: 'Curiosity Mode', detail: 'Короткі цікаві історії під час паузи.' },
  ];
  const selectedModeId = draft.curiosity ? 'curiosity' : draft.mode;
  const selectedMode = modes.find(mode => mode.id === selectedModeId) ?? modes[0];
  const timed = hasPauseTimer(draft.mode);
  const roundsMode = draft.mode === 'math' || draft.mode === 'stroop';
  const roundsText = draft.mode === 'stroop' ? stroopRoundsText : mathRoundsText;
  const validRounds = /^\d+$/.test(roundsText) && Number(roundsText) >= 1 && Number(roundsText) <= 10;
  const validCodeLength = /^\d+$/.test(codeLengthText) && Number(codeLengthText) >= 4 && Number(codeLengthText) <= 12;
  const challengeError = roundsMode && !validRounds ? 'Введи кількість від 1 до 10.'
    : draft.mode === 'passcode' && !validCodeLength ? 'Введи довжину від 4 до 12 символів.' : '';
  const sessionSeconds = parsePauseSeconds(sessionText, sessionUnit);
  const sessionMinutes = sessionSeconds === null ? null : sessionSeconds / 60;
  const sessionError = sessionMinutes === null ? 'Введи тривалість від 1 секунди до 1440 хвилин.' : '';
  function changeSessionUnit(unit: PauseUnit) {
    if (sessionSeconds !== null) setSessionText(pauseDurationText(sessionSeconds, unit));
    setSessionUnit(unit);
  }
  function selectMode(id: PauseMode | 'curiosity') {
    setDraft({ ...draft, curiosity: id === 'curiosity', mode: id === 'curiosity' ? 'countdown' : id });
    setModePickerOpen(false);
  }
  async function save(pick = false) {
    if (!valid || sessionMinutes === null || pauseError || challengeError || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (!demo) {
        const status = await screenTime.status();
        if (status.authorization !== 'approved') await screenTime.authorize();
        if (draft.curiosity || draft.mode !== 'countdown') await screenTime.notifications();
      }
      if (await onSave({ ...draft, seconds: pauseSeconds ?? draft.seconds, sessionMinutes, rounds: challengeRounds(Number(roundsText)), codeLength: challengeCodeLength(Number(codeLengthText)),
        mathRounds: challengeRounds(Number(mathRoundsText)), stroopRounds: challengeRounds(Number(stroopRoundsText)),
      }, pick)) router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося зберегти налаштування.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (!onRemove || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onRemove(); router.back(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося видалити.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function confirmRemove() {
    const message = 'Блокування вибраних застосунків припиниться. Історія залишиться.';
    if (Platform.OS === 'web') { if (window.confirm(message)) void remove(); }
    else Alert.alert(removeLabel, message, [
      { text: 'Скасувати', style: 'cancel' }, { text: 'Видалити', style: 'destructive', onPress: () => void remove() },
    ]);
  }
  return <Page header={<View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Назад" disabled={busy} onPress={() => router.back()} style={styles.back}>
        <EditorialIcon name="back" active size={19} /><Text style={styles.link}>Назад</Text>
      </Pressable>
      <Text style={[ui.title, { flex: 1 }]} accessibilityRole="header">Налаштування</Text>
    </View>}
    footer={<Action label={busy ? 'Зберігаємо…' : saveLabel} disabled={busy || !valid || sessionMinutes === null || Boolean(challengeError || pauseError)} onPress={() => void save()} />}>
    <Stack.Screen options={{ headerShown: false, gestureEnabled: !busy }} />
    {identity(busy)}
    <ListSection title="РЕЖИМ ПАУЗИ">
      <ListRow showSeparator={false} disabled={busy} onPress={() => setModePickerOpen(true)}>
        <View style={{ flex: 1, gap: 4 }}><Text style={ui.body}>{selectedMode.title}</Text><Text style={ui.mutedText}>{selectedMode.detail}</Text></View>
        <EditorialIcon name="forward" size={17} />
      </ListRow>
    </ListSection>
    <Modal visible={modePickerOpen} transparent animationType="slide" onRequestClose={() => setModePickerOpen(false)}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Закрити вибір режиму" accessibilityRole="button" onPress={() => setModePickerOpen(false)} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.sheetHeader}><Text style={[ui.title, { flex: 1 }]}>Режим паузи</Text>
            <Pressable accessibilityRole="button" onPress={() => setModePickerOpen(false)} style={styles.close}><Text style={styles.link}>Закрити</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            <ListSection>{modes.map((item, index) => <ListRow key={item.id} showSeparator={index < modes.length - 1} onPress={() => selectMode(item.id)}>
              <View style={{ flex: 1, gap: 4 }}><Text style={ui.body}>{item.title}</Text><Text style={ui.mutedText}>{item.detail}</Text></View>
              {selectedModeId === item.id && <EditorialIcon name="check" active size={21} />}
            </ListRow>)}</ListSection>
            {demo && <Text style={ui.mutedText}>Дихання, математика, код і тест Струпа поки доступні для попереднього перегляду.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <ListSection title="ПАРАМЕТРИ РЕЖИМУ" footer={pauseError || challengeError || (draft.curiosity
      ? 'Доступ відкривається після цього часу. Історії можна читати за бажанням.'
      : isMicrolearning(draft.mode) ? 'Пауза починається в Blockit після переходу зі сповіщення. Читати необов’язково.'
      : roundsMode || draft.mode === 'passcode' || draft.mode === 'typing' || draft.mode === 'reflection'
      ? 'Після виконання можна відкрити застосунок без додаткового очікування.'
      : draft.mode === 'countdown' && demo && draft.escalating ? `Кожне відкриття додає 5 с. Зараз: ${getEffectiveSeconds({ ...draft, seconds: pauseSeconds ?? draft.seconds })} с.` : undefined)}>
      {timed && <View style={{ padding: 12, gap: 12 }}>
        <Text style={ui.body}>{draft.curiosity ? 'Час перед доступом' : draft.mode === 'breathing' ? 'Тривалість вправи' : 'Тривалість паузи'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput accessibilityLabel={pauseUnit === 'seconds' ? 'Тривалість паузи у секундах' : 'Тривалість паузи у хвилинах'} value={pauseText} onChangeText={setPauseText}
            editable={!busy} keyboardType={pauseUnit === 'seconds' ? 'number-pad' : 'decimal-pad'} inputMode={pauseUnit === 'seconds' ? 'numeric' : 'decimal'} maxLength={10} selectTextOnFocus
            style={[styles.minutesInput, pauseError !== '' && { borderColor: appleTheme.red }]} />
          <View style={{ flexDirection: 'row', flexShrink: 1, backgroundColor: appleTheme.tertiaryBg, borderRadius: 10, padding: 3 }}>
            {(['seconds', 'minutes'] as const).map(unit => <Pressable key={unit} accessibilityRole="button"
              accessibilityLabel={unit === 'seconds' ? 'Секунди' : 'Хвилини'} accessibilityState={{ selected: pauseUnit === unit, disabled: busy }}
              disabled={busy} onPress={() => changePauseUnit(unit)}
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center', backgroundColor: pauseUnit === unit ? appleTheme.fill : 'transparent' }}>
              <Text style={[ui.body, { color: pauseUnit === unit ? appleTheme.label : appleTheme.secondaryLabel }]}>{unit === 'seconds' ? 'сек' : 'хв'}</Text>
            </Pressable>)}
          </View>
        </View>
      </View>}
      {isMicrolearning(draft.mode) && <ListRow showSeparator={false}><Text style={ui.body}>Тема: CustDev</Text></ListRow>}
      {demo && draft.mode === 'countdown' && !draft.curiosity && <ListRow showSeparator={false}>
        <Text style={[ui.body, { flex: 1 }]}>Зростаюча пауза</Text><Switch accessibilityLabel="Зростаюча пауза"
          value={Boolean(draft.escalating)} disabled={busy} onValueChange={escalating => setDraft({ ...draft, escalating })}
          trackColor={{ true: appleTheme.green }} />
      </ListRow>}
      {roundsMode && <ListRow showSeparator={false}>
        <Text style={[ui.body, { flex: 1 }]}>{draft.mode === 'math' ? 'Кількість прикладів' : 'Кількість раундів'}</Text>
        <TextInput accessibilityLabel={draft.mode === 'math' ? 'Кількість прикладів' : 'Кількість раундів'}
          value={roundsText} onChangeText={draft.mode === 'math' ? setMathRoundsText : setStroopRoundsText} editable={!busy} keyboardType="number-pad" inputMode="numeric"
          maxLength={2} selectTextOnFocus style={styles.minutesInput} />
      </ListRow>}
      {draft.mode === 'passcode' && <ListRow showSeparator={false}>
        <Text style={[ui.body, { flex: 1 }]}>Символів у коді</Text>
        <TextInput accessibilityLabel="Символів у коді" value={codeLengthText} onChangeText={setCodeLengthText}
          editable={!busy} keyboardType="number-pad" inputMode="numeric" maxLength={2} selectTextOnFocus style={styles.minutesInput} />
      </ListRow>}
      {draft.mode === 'typing' && <ListRow showSeparator={false}><View style={{ gap: 8 }}><Text style={ui.mutedText}>Фраза для введення</Text><Text style={ui.body}>{PAUSE_PHRASE}</Text></View></ListRow>}
      {draft.mode === 'reflection' && <ListRow showSeparator={false}><View style={{ gap: 8 }}><Text style={ui.mutedText}>Варіанти наміру</Text><Text style={ui.body}>Відповісти · Зробити справу · Відпочити</Text></View></ListRow>}
    </ListSection>
    <ListSection title="ЛІМІТ СЕСІЇ" footer={sessionError || (demo ? 'Скільки триватиме доступ у прикладі паузи.' : 'Від 1 секунди до 1440 хвилин. Після завершення доступ знову заблокується.')}>
      <ListRow showSeparator={false}>
        <Text style={[ui.body, { flex: 1 }]}>Тривалість доступу</Text>
        <TextInput accessibilityLabel={sessionUnit === 'seconds' ? 'Ліміт сесії у секундах' : 'Ліміт сесії у хвилинах'} value={sessionText} onChangeText={setSessionText}
          editable={!busy} keyboardType={sessionUnit === 'seconds' ? 'number-pad' : 'decimal-pad'} inputMode={sessionUnit === 'seconds' ? 'numeric' : 'decimal'} returnKeyType="done" maxLength={10} selectTextOnFocus
          placeholder={String(demo ? 5 : 15)} placeholderTextColor={appleTheme.secondaryLabel}
          style={[styles.minutesInput, { width: 80 }, sessionError !== '' && { borderColor: appleTheme.red }]} />
        <View style={{ flexDirection: 'row', backgroundColor: appleTheme.tertiaryBg, borderRadius: 10, padding: 3 }}>
          {(['seconds', 'minutes'] as const).map(unit => <Pressable key={unit} accessibilityRole="button"
            accessibilityLabel={unit === 'seconds' ? 'Доступ у секундах' : 'Доступ у хвилинах'} accessibilityState={{ selected: sessionUnit === unit, disabled: busy }}
            disabled={busy} onPress={() => changeSessionUnit(unit)}
            style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', backgroundColor: sessionUnit === unit ? appleTheme.fill : 'transparent' }}>
            <Text style={[ui.body, { color: sessionUnit === unit ? appleTheme.label : appleTheme.secondaryLabel }]}>{unit === 'seconds' ? 'сек' : 'хв'}</Text>
          </Pressable>)}
        </View>
      </ListRow>
    </ListSection>
    {selection?.(busy)}
    {!demo && <ListSection title="СПОВІЩЕННЯ" footer="Для завдання торкнися сповіщення Blockit. Якщо його немає — відкрий Blockit вручну.">
      <ListRow showSeparator={false} disabled={busy} onPress={() => {
        screenTime.notifications().then(allowed => setNotice(allowed ? 'Сповіщення дозволені.' : 'Увімкни сповіщення для Blockit у налаштуваннях iPhone.'))
          .catch(() => setNotice('Не вдалося перевірити сповіщення.'));
      }}><Text style={[ui.body, { color: appleTheme.tint }]}>Перевірити дозвіл на сповіщення</Text></ListRow>
      {notice !== '' && <ListRow showSeparator={false}><Text accessibilityLiveRegion="polite" style={ui.mutedText}>{notice}</Text></ListRow>}
    </ListSection>}
    <ListSection title="ДІЇ">
      <ListRow disabled={busy || sessionMinutes === null || Boolean(challengeError || pauseError)} onPress={() => draft.curiosity ? router.push({ pathname: '/curiosity', params: { preview: '1' } }) : isMicrolearning(draft.mode) ? router.push({ pathname: microlearningRoute(draft.mode), params: { preview: '1', seconds: String(pauseSeconds ?? draft.seconds) } } as unknown as Href) : router.push({ pathname: '/intervene', params: {
        preview: '1', seconds: String(getEffectiveSeconds({ ...draft, seconds: pauseSeconds ?? draft.seconds })), mode: draft.mode, label,
        sessionMinutes: String(sessionMinutes ?? (demo ? 5 : 15)),
        rounds: String(challengeRounds(Number(roundsText))), codeLength: String(challengeCodeLength(Number(codeLengthText))),
      } })}><Text style={[ui.body, { color: appleTheme.tint }]}>Спробувати паузу</Text></ListRow>
      <ListRow showSeparator={false} disabled={busy} onPress={() => {
        setDraft({ seconds: 20, mode: 'countdown', sessionMinutes: demo ? 5 : 15, escalating: false, todayOpens: 0, curiosity: false });
        setSessionUnit('minutes'); setSessionText(String(demo ? 5 : 15)); setPauseUnit('seconds'); setPauseText('20');
        setMathRoundsText('3'); setStroopRoundsText('3'); setCodeLengthText('6');
      }}><Text style={ui.body}>Скинути налаштування</Text></ListRow>
    </ListSection>
    {canChangeSelection && <Action secondary label="Змінити застосунки й зберегти" disabled={busy || !valid || sessionMinutes === null || Boolean(challengeError || pauseError)} onPress={() => void save(true)} />}
    {error !== '' && <View accessibilityLiveRegion="polite"><Copy>{error}</Copy></View>}
    {onRemove && <Action secondary destructive label={removeLabel} disabled={busy} onPress={confirmRemove} />}
  </Page>;
}

const themeStyles = createThemeStyles(() => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 14, backgroundColor: appleTheme.bg },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 6 },
  link: { fontFamily: sharedUI.body.fontFamily, color: appleTheme.tint, fontSize: 16 },
  minutesInput: { ...sharedUI.body, minWidth: 72, minHeight: 44, textAlign: 'center', borderWidth: 1, borderColor: appleTheme.separator, borderRadius: 10, paddingHorizontal: 10, backgroundColor: appleTheme.tertiaryBg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 600, maxHeight: '86%', backgroundColor: appleTheme.bg, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: appleTheme.separatorSubtle },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  close: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
}));
