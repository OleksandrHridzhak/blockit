import { router, Stack, useLocalSearchParams } from 'expo-router';
import { sessionMinutesOr } from '@/core/session-duration';
import { challengeCodeLength, challengeRounds, hasPauseTimer, PAUSE_PHRASE } from '@/core/pause-mode-settings';
import { useEffect, useRef, useState } from 'react';
import { ReturnAppSetting } from '@/components/return-app-setting';
import { finishAndReturn, getReturnTarget } from '@/features/intervention/return-target';
import { openGuardedTargetApp } from '@/features/intervention/open-target-app';
import {
  Animated,
  AppState,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Action,
  appleTheme,
  Page,
  ui,
} from '@/components/protection-ui';
import {
  PauseMode,
  PauseRequest,
  remainingSeconds,
  screenTime,
} from '@/features/screen-time/client';

const PHRASE = PAUSE_PHRASE;

const REASONS = [
  { id: 'reply', label: 'Відповісти' },
  { id: 'task', label: 'Зробити справу' },
  { id: 'rest', label: 'Відпочити' },
];

export default function PauseScreen() {
  const params = useLocalSearchParams<{
    preview?: string;
    request?: string;
    seconds?: string;
    mode?: string;
    label?: string;
    sessionMinutes?: string;
    appId?: string;
    rounds?: string;
    codeLength?: string;
  }>();

  const preview = params.preview === '1';
  const duration = (Number.isInteger(Number(params.seconds)) && Number(params.seconds) >= 1 && Number(params.seconds) <= 86400)
    ? Number(params.seconds)
    : 20;

  const mode: PauseMode =
    params.mode === 'typing' ||
    params.mode === 'reflection' ||
    params.mode === 'breathing' ||
    params.mode === 'math' ||
    params.mode === 'passcode' ||
    params.mode === 'stroop'
      ? params.mode
      : 'countdown';

  const sessionMinutes = preview ? sessionMinutesOr(Number(params.sessionMinutes)) : 15;
  const rounds = challengeRounds(Number(params.rounds));
  const codeLength = challengeCodeLength(Number(params.codeLength));

  return (
    <PauseSession
      key={`${preview}-${params.request ?? ''}-${duration}-${mode}-${params.label ?? ''}-${params.appId ?? ''}-${rounds}-${codeLength}-${sessionMinutes}`}
      preview={preview}
      duration={duration}
      mode={mode}
      label={params.label?.slice(0, 80) ?? 'застосунку'}
      sessionMinutes={sessionMinutes}
      rounds={rounds}
      codeLength={codeLength}
    />
  );
}

function PauseSession({
  preview,
  duration,
  mode,
  label,
  sessionMinutes,
  rounds,
  codeLength,
}: {
  preview: boolean;
  duration: number;
  mode: PauseMode;
  label: string;
  sessionMinutes: number;
  rounds: number;
  codeLength: number;
}) {
  const [request, setRequest] = useState<PauseRequest | null>(() =>
    preview ? { id: 'preview', readyAt: Date.now() + (hasPauseTimer(mode) ? duration * 1000 : 0), mode } : null
  );
  const [now, setNow] = useState(() => Date.now());
  const [answer, setAnswer] = useState('');
  const [loaded, setLoaded] = useState(preview);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const autoFinished = useRef<string | null>(null);
  const loadedRequestId = useRef<string | null>(null);
  const [returnTarget, setReturnTargetState] = useState<string | null>(null);

  const targetLabel = request?.groupName ?? label;
  const accessMinutes = preview ? sessionMinutes : request?.sessionMinutes ?? 15;

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      setNow(Date.now());
      if (!preview) {
        try {
          const pending = await screenTime.pending() ?? await screenTime.activeAccess();
          if (alive) {
            if (pending && pending.id !== loadedRequestId.current) {
              loadedRequestId.current = pending.id;
              setDone(false); setAnswer(''); setError('');
            }
            setRequest(pending);
            if (pending) setReturnTargetState(getReturnTarget(pending.appId));
            setLoaded(true);
          }
        } catch {
          if (alive) {
            setError('Не вдалося прочитати запит. Відкрий Blockit ще раз.');
            setLoaded(true);
          }
        }
      }
    };

    refresh();
    const timer = setInterval(() => setNow(Date.now()), 250);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [preview]);

  const [mathSolved, setMathSolved] = useState(false);
  const [passcodeSolved, setPasscodeSolved] = useState(false);
  const [stroopSolved, setStroopSolved] = useState(false);

  const seconds = request && hasPauseTimer(request.mode) ? remainingSeconds(request.readyAt, now) : 0;
  const valid =
    request?.mode === 'typing'
      ? answer.trim() === PHRASE
      : request?.mode === 'reflection'
      ? ['reply', 'task', 'rest'].includes(answer)
      : request?.mode === 'math'
      ? mathSolved
      : request?.mode === 'passcode'
      ? passcodeSolved
      : request?.mode === 'stroop'
      ? stroopSolved
      : true;

  async function finish() {
    if (lock.current || !request || seconds > 0 || !valid) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (!preview) {
        const opened = await finishAndReturn(request.id, answer, request.appId);
        if (returnTarget && !opened) setError('Доступ відкрито, але повернутися автоматично не вдалося. Відкрий застосунок вручну.');
      }
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Не вдалося надати доступ. Спробуй знову.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (preview || done || !request || !returnTarget || seconds > 0 || busy || error || AppState.currentState !== 'active') return;
    if (request.mode !== 'countdown' && request.mode !== 'breathing') return;
    if (autoFinished.current === request.id) return;
    autoFinished.current = request.id;
    void finish();
  });

  async function leave() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (!preview) await screenTime.cancel();
      router.replace('/');
    } catch {
      setError('Не вдалося закрити запит. Спробуй знову.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Page>
      <Stack.Screen options={{ headerShown: false }} />

      {done ? (
        <View style={styles.centerContainer}>
          <View style={styles.successIconBadge}>
            <Text style={{ fontSize: 32 }}>✓</Text>
          </View>
          <Text style={styles.sessionTitle}>
            {preview ? 'Приклад завершено' : 'Доступ відкрито'}
          </Text>
          <Text style={styles.sessionSubtitle}>
            {preview
              ? `У реальній сесії доступ буде відкрито приблизно на ${sessionMinutes} хв, після чого пауза спрацює знову.`
              : `Повернися до обраного застосунку. Доступ відкрито приблизно на ${accessMinutes} хвилин.`}
          </Text>
          <View style={{ width: '100%', marginTop: 24 }}>
            {returnTarget && <Action label="Повернутися в застосунок" onPress={() => void openGuardedTargetApp(returnTarget)} />}
            <Action label="До застосунків" onPress={() => router.replace('/')} />
          </View>
        </View>
      ) : !loaded ? (
        <View style={styles.centerContainer}>
          <Text style={styles.sessionSubtitle}>Відкриваємо паузу…</Text>
        </View>
      ) : !request ? (
        <View style={styles.centerContainer}>
          <Text style={styles.sessionTitle}>Активної паузи немає</Text>
          <Text style={styles.sessionSubtitle}>
            Відкрий заблокований застосунок і натисни кнопку на системному екрані Екранного часу.
          </Text>
          <View style={{ width: '100%', marginTop: 24 }}>
            <Action label="До застосунків" onPress={() => router.replace('/')} />
          </View>
        </View>
      ) : (
        <View style={styles.sessionContainer}>
          {/* Header pill with Today Counter */}
          <View style={styles.kickerPill}>
            <Text style={styles.kickerText}>
              {preview
                ? 'ДЕМОНСТРАЦІЙНИЙ ПЕРЕГЛЯД'
                : 'УСВІДОМЛЕНА ПАУЗА'}
            </Text>
          </View>

          {/* App Label */}
          <Text style={styles.appHeaderLabel}>
            {preview ? `Пауза перед відкриттям ${label}` : `Пауза · ${targetLabel}`}
          </Text>

          {/* Breathing Mode Animation OR Timer Display */}
          {request.mode === 'breathing' ? (
            <BreathingExercise seconds={seconds} />
          ) : request.mode === 'countdown' ? (
            <View style={styles.timerBox}>
              <Text style={styles.timerDigits}>
                {seconds > 0 ? String(seconds).padStart(2, '0') : '00'}
              </Text>
              <Text style={styles.timerUnit}>
                {seconds > 0 ? 'секунд до вибору' : 'пауза завершилась'}
              </Text>
            </View>
          ) : null}

          {/* Interactive tasks if any */}
          {request.mode === 'reflection' && (
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>Яка мета відкриття?</Text>
              <Text style={styles.taskDetail}>
                Обери намір, перш ніж продовжити:
              </Text>
              <View style={styles.reflectionRow}>
                {REASONS.map((reason) => {
                  const isSelected = answer === reason.id;
                  return (
                    <Pressable
                      key={reason.id}
                      onPress={() => setAnswer(reason.id)}
                      style={[
                        styles.reflectionPill,
                        isSelected && styles.reflectionPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reflectionPillText,
                          isSelected && styles.reflectionPillTextSelected,
                        ]}
                      >
                        {reason.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {request.mode === 'typing' && (
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>Введи фразу усвідомленості</Text>
              <Text style={styles.taskDetail}>«{PHRASE}»</Text>
              <TextInput
                accessibilityLabel="Фраза усвідомленого вибору"
                placeholder="Введи вказану фразу..."
                placeholderTextColor={appleTheme.secondaryLabel}
                value={answer}
                onChangeText={setAnswer}
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>
          )}

          {/* Math Mode */}
          {request.mode === 'math' && (
            <MathChallenge count={rounds} onSolved={setMathSolved} />
          )}

          {/* Passcode Mode */}
          {request.mode === 'passcode' && (
            <PasscodeChallenge length={codeLength} onSolved={setPasscodeSolved} />
          )}

          {/* Stroop Mode */}
          {request.mode === 'stroop' && (
            <StroopChallenge count={rounds} onSolved={setStroopSolved} />
          )}

          {/* Bottom Actions with Session Limit Indicator */}
          <View style={styles.bottomActions}>
            {!preview && request.appId && <ReturnAppSetting key={request.appId} tokenId={request.appId} disabled={busy} onChange={setReturnTargetState} />}
            <Action
              label={
                seconds > 0
                  ? `Зачекай ще ${seconds} с`
                  : !valid
                  ? request.mode === 'stroop'
                    ? 'Пройди тест Струпа вище'
                    : request.mode === 'math'
                    ? 'Розв’яжи приклади вище'
                    : request.mode === 'passcode'
                    ? 'Введи перевірочний код'
                    : 'Спочатку виконай завдання'
                  : preview
                  ? `Завершити тест (${sessionMinutes} хв доступу)`
                  : `Надати доступ на ${accessMinutes} хв`
              }
              disabled={busy || seconds > 0 || !valid}
              onPress={finish}
            />
            <Action
              label="Не відкривати застосунок"
              secondary
              disabled={busy}
              onPress={leave}
            />
          </View>
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

function BreathingExercise({ seconds }: { seconds: number }) {
  const [scale] = useState(() => new Animated.Value(0.8));
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    let alive = true;

    const runCycle = () => {
      if (!alive) return;

      // Inhale: 4 seconds
      setPhase('inhale');
      Animated.timing(scale, {
        toValue: 1.25,
        duration: 3800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !alive) return;

        // Hold: 2 seconds
        setPhase('hold');
        setTimeout(() => {
          if (!alive) return;

          // Exhale: 4 seconds
          setPhase('exhale');
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 3800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start(({ finished: f2 }) => {
            if (f2 && alive) {
              runCycle();
            }
          });
        }, 1800);
      });
    };

    runCycle();

    return () => {
      alive = false;
      scale.stopAnimation();
    };
  }, [scale]);

  const phaseLabel =
    phase === 'inhale'
      ? 'Повільний вдих...'
      : phase === 'hold'
      ? 'Затримай подих...'
      : 'Повільний видих...';

  return (
    <View style={styles.breathingContainer}>
      <Animated.View
        style={[
          styles.breathingOuterCircle,
          { transform: [{ scale }] },
        ]}
      >
        <View style={styles.breathingInnerCircle}>
          <Text style={styles.breathingDigits}>
            {seconds > 0 ? String(seconds).padStart(2, '0') : '00'}
          </Text>
        </View>
      </Animated.View>
      <Text style={styles.breathingPhaseText}>{phaseLabel}</Text>
    </View>
  );
}

interface MathProblem {
  question: string;
  answer: number;
}

function generateMathProblems(): MathProblem[] {
  // 1: a + b (e.g. 17 + 25 = 42)
  const a1 = Math.floor(Math.random() * 20) + 12;
  const b1 = Math.floor(Math.random() * 20) + 12;
  // 2: a * b (e.g. 7 * 8 = 56)
  const a2 = Math.floor(Math.random() * 6) + 4;
  const b2 = Math.floor(Math.random() * 6) + 4;
  // 3: a - b (e.g. 64 - 28 = 36)
  const a3 = Math.floor(Math.random() * 40) + 40;
  const b3 = Math.floor(Math.random() * 25) + 12;

  return [
    { question: `${a1} + ${b1}`, answer: a1 + b1 },
    { question: `${a2} × ${b2}`, answer: a2 * b2 },
    { question: `${a3} - ${b3}`, answer: a3 - b3 },
  ];
}

function MathChallenge({ count, onSolved }: { count: number; onSolved: (solved: boolean) => void }) {
  const [problems] = useState(() => Array.from({ length: count }, (_, index) => generateMathProblems()[index % 3]));
  const [index, setIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [isWrong, setIsWrong] = useState(false);
  const [solved, setSolved] = useState(false);

  const currentProblem = problems[index];

  const handleCheck = () => {
    const num = parseInt(inputVal.trim(), 10);
    if (num === currentProblem.answer) {
      setIsWrong(false);
      setInputVal('');
      if (index >= problems.length - 1) {
        setSolved(true);
        onSolved(true);
      } else {
        setIndex((prev) => prev + 1);
      }
    } else {
      setIsWrong(true);
    }
  };

  if (solved) {
    return (
      <View style={styles.challengeBox}>
        <Text style={styles.challengeSuccessEmoji}>🎉</Text>
        <Text style={styles.challengeSuccessTitle}>Усі приклади розв’язано!</Text>
        <Text style={styles.challengeSuccessSubtitle}>
          Префронтальна кора активована. Можеш завершити перевірку.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.challengeBox}>
      <View style={styles.challengeHeaderRow}>
        <Text style={styles.challengeKicker}>🧮 МАТЕМАТИЧНИЙ ВИКЛИК</Text>
        <Text style={styles.challengeStepBadge}>
          {index + 1} з {problems.length}
        </Text>
      </View>

      {/* Progress segmented bar */}
      <View style={styles.stepProgressRow}>
        {problems.map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepProgressBar,
              i < index && styles.stepProgressBarDone,
              i === index && styles.stepProgressBarActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.mathQuestion}>{currentProblem.question} = ?</Text>

      <View style={styles.mathInputRow}>
        <TextInput
          accessibilityLabel="Відповідь на приклад"
          placeholder="Введи відповідь..."
          placeholderTextColor={appleTheme.secondaryLabel}
          value={inputVal}
          onChangeText={(txt) => {
            setInputVal(txt);
            setIsWrong(false);
          }}
          keyboardType="number-pad"
          onSubmitEditing={handleCheck}
          returnKeyType="done"
          style={[styles.mathInput, isWrong && styles.mathInputError]}
        />
        <Pressable
          style={[styles.mathSubmitBtn, !inputVal && styles.mathSubmitBtnDisabled]}
          disabled={!inputVal}
          onPress={handleCheck}
        >
          <Text style={styles.mathSubmitBtnText}>
            {index === problems.length - 1 ? 'Готово' : 'Далі ›'}
          </Text>
        </Pressable>
      </View>

      {isWrong && (
        <Text style={styles.mathErrorText}>
          Неправильно, порахуй уважно ще раз.
        </Text>
      )}
    </View>
  );
}

function generatePasscode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function PasscodeChallenge({ length, onSolved }: { length: number; onSolved: (solved: boolean) => void }) {
  const [targetCode] = useState(() => generatePasscode(length));
  const [inputVal, setInputVal] = useState('');
  const [solved, setSolved] = useState(false);

  const handleTextChange = (text: string) => {
    setInputVal(text);
    if (text.trim().toUpperCase() === targetCode.toUpperCase()) {
      setSolved(true);
      onSolved(true);
    } else {
      setSolved(false);
      onSolved(false);
    }
  };

  return (
    <View style={styles.challengeBox}>
      <View style={styles.challengeHeaderRow}>
        <Text style={styles.challengeKicker}>🔐 ПЕРЕВІРОЧНИЙ КОД</Text>
        {solved && <Text style={styles.codeVerifiedBadge}>✓ Введено</Text>}
      </View>

      <Text style={styles.challengeInstruction}>
        Перепиши цей код у поле нижче, щоб підтвердити усвідомлене відкриття:
      </Text>

      {/* Target code display */}
      <View style={styles.codeDisplayCard}>
        <Text style={styles.codeDisplayText}>{targetCode}</Text>
      </View>

      <TextInput
        accessibilityLabel="Поле вводу перевірочного коду"
        placeholder="Введи код сюди..."
        placeholderTextColor={appleTheme.secondaryLabel}
        value={inputVal}
        onChangeText={handleTextChange}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!solved}
        style={[styles.codeTextInput, solved && styles.codeTextInputSuccess]}
      />
    </View>
  );
}

interface StroopItem {
  word: string;
  inkColor: string;
  correctColorName: string;
}

const STROOP_COLORS = [
  { name: 'Червоний', hex: '#FF453A' },
  { name: 'Синій', hex: '#0A84FF' },
  { name: 'Зелений', hex: '#30D158' },
  { name: 'Жовтий', hex: '#FFD60A' },
];

function generateStroopRounds(count: number): StroopItem[] {
  const rounds: StroopItem[] = [];
  for (let i = 0; i < count; i++) {
    const textIdx = Math.floor(Math.random() * STROOP_COLORS.length);
    let colorIdx = Math.floor(Math.random() * STROOP_COLORS.length);
    while (colorIdx === textIdx) {
      colorIdx = Math.floor(Math.random() * STROOP_COLORS.length);
    }
    rounds.push({
      word: STROOP_COLORS[textIdx].name.toUpperCase(),
      inkColor: STROOP_COLORS[colorIdx].hex,
      correctColorName: STROOP_COLORS[colorIdx].name,
    });
  }
  return rounds;
}

function StroopChallenge({ count, onSolved }: { count: number; onSolved: (solved: boolean) => void }) {
  const [rounds] = useState(() => generateStroopRounds(count));
  const [roundIdx, setRoundIdx] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [solved, setSolved] = useState(false);

  const current = rounds[roundIdx];

  const handleSelect = (colorName: string) => {
    if (colorName === current.correctColorName) {
      setIsWrong(false);
      if (roundIdx >= rounds.length - 1) {
        setSolved(true);
        onSolved(true);
      } else {
        setRoundIdx((prev) => prev + 1);
      }
    } else {
      setIsWrong(true);
    }
  };

  if (solved) {
    return (
      <View style={styles.challengeBox}>
        <Text style={styles.challengeSuccessEmoji}>🧠</Text>
        <Text style={styles.challengeSuccessTitle}>Тест Струпа пройдено!</Text>
        <Text style={styles.challengeSuccessSubtitle}>
          Когнітивний контроль відновлено. Імпульс пригнічено.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.challengeBox}>
      <View style={styles.challengeHeaderRow}>
        <Text style={styles.challengeKicker}>🎨 ТЕСТ СТРУПА</Text>
        <Text style={styles.challengeStepBadge}>
          Раунд {roundIdx + 1} з {rounds.length}
        </Text>
      </View>

      <View style={styles.stepProgressRow}>
        {rounds.map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepProgressBar,
              i < roundIdx && styles.stepProgressBarDone,
              i === roundIdx && styles.stepProgressBarActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.challengeInstruction}>
        Обери <Text style={{ fontWeight: '700', color: appleTheme.label }}>колір літер</Text>, а не значення слова:
      </Text>

      {/* Stroop Word Display */}
      <View style={styles.stroopWordBox}>
        <Text style={[styles.stroopWordText, { color: current.inkColor }]}>
          {current.word}
        </Text>
      </View>

      {/* 2x2 Choice Buttons */}
      <View style={styles.stroopGrid}>
        {STROOP_COLORS.map((item) => (
          <Pressable
            key={item.name}
            onPress={() => handleSelect(item.name)}
            style={({ pressed }) => [
              styles.stroopButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.stroopColorDot, { backgroundColor: item.hex }]} />
            <Text style={styles.stroopButtonText}>{item.name}</Text>
          </Pressable>
        ))}
      </View>

      {isWrong && (
        <Text style={styles.mathErrorText}>
          Помилка! Дивись на колір літер, а не на написане слово.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sessionContainer: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
    gap: 12,
  },
  kickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 14,
  },
  kickerText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: appleTheme.secondaryLabel,
  },
  appHeaderLabel: {
    fontFamily: ui.body.fontFamily,
    fontSize: 20,
    fontWeight: '600',
    color: appleTheme.label,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  timerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  timerDigits: {
    fontFamily: ui.body.fontFamily,
    fontSize: 88,
    lineHeight: 96,
    fontWeight: '200',
    letterSpacing: -3,
    color: appleTheme.label,
  },
  timerUnit: {
    fontFamily: ui.body.fontFamily,
    fontSize: 15,
    color: appleTheme.secondaryLabel,
  },
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 20,
  },
  breathingOuterCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(10, 132, 255, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(10, 132, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingDigits: {
    fontFamily: ui.body.fontFamily,
    fontSize: 44,
    fontWeight: '300',
    letterSpacing: -1,
    color: '#FFFFFF',
  },
  breathingPhaseText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 18,
    fontWeight: '500',
    color: appleTheme.tint,
    letterSpacing: -0.3,
  },
  taskCard: {
    width: '100%',
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  taskTitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: appleTheme.label,
  },
  taskDetail: {
    fontFamily: ui.body.fontFamily,
    fontSize: 14,
    color: appleTheme.secondaryLabel,
  },
  reflectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  reflectionPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: appleTheme.tertiaryBg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionPillSelected: {
    backgroundColor: appleTheme.tint,
  },
  reflectionPillText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: appleTheme.label,
  },
  reflectionPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textInput: {
    minHeight: 44,
    backgroundColor: appleTheme.tertiaryBg,
    borderRadius: 10,
    color: appleTheme.label,
    fontFamily: ui.body.fontFamily,
    fontSize: 16,
    paddingHorizontal: 12,
  },
  bottomActions: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  sessionTitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: appleTheme.label,
    textAlign: 'center',
  },
  sessionSubtitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    color: appleTheme.secondaryLabel,
    textAlign: 'center',
    maxWidth: 340,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  errorText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 14,
    color: appleTheme.red,
  },
  challengeBox: {
    width: '100%',
    backgroundColor: appleTheme.secondaryBg,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  challengeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeKicker: {
    fontFamily: ui.body.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: appleTheme.tint,
  },
  challengeStepBadge: {
    fontFamily: ui.body.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: appleTheme.secondaryLabel,
  },
  stepProgressRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  stepProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: appleTheme.tertiaryBg,
  },
  stepProgressBarActive: {
    backgroundColor: appleTheme.tint,
  },
  stepProgressBarDone: {
    backgroundColor: appleTheme.green,
  },
  mathQuestion: {
    fontFamily: ui.body.fontFamily,
    fontSize: 32,
    fontWeight: '700',
    color: appleTheme.label,
    textAlign: 'center',
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  mathInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  mathInput: {
    flex: 1,
    height: 44,
    backgroundColor: appleTheme.tertiaryBg,
    borderRadius: 10,
    color: appleTheme.label,
    fontFamily: ui.body.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  mathInputError: {
    borderWidth: 1,
    borderColor: appleTheme.red,
  },
  mathSubmitBtn: {
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: appleTheme.tint,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathSubmitBtnDisabled: {
    opacity: 0.4,
  },
  mathSubmitBtnText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mathErrorText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 13,
    color: appleTheme.red,
    textAlign: 'center',
  },
  challengeSuccessEmoji: {
    fontSize: 36,
    textAlign: 'center',
  },
  challengeSuccessTitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: appleTheme.label,
    textAlign: 'center',
  },
  challengeSuccessSubtitle: {
    fontFamily: ui.body.fontFamily,
    fontSize: 14,
    color: appleTheme.secondaryLabel,
    textAlign: 'center',
  },
  codeVerifiedBadge: {
    fontFamily: ui.body.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: appleTheme.green,
  },
  challengeInstruction: {
    fontFamily: ui.body.fontFamily,
    fontSize: 14,
    color: appleTheme.secondaryLabel,
    lineHeight: 19,
  },
  codeDisplayCard: {
    backgroundColor: appleTheme.tertiaryBg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appleTheme.separatorSubtle,
  },
  codeDisplayText: {
    fontFamily: 'monospace',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 4,
    color: appleTheme.tint,
  },
  codeTextInput: {
    height: 44,
    backgroundColor: appleTheme.tertiaryBg,
    borderRadius: 10,
    color: appleTheme.label,
    fontFamily: 'monospace',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  codeTextInputSuccess: {
    borderWidth: 1.5,
    borderColor: appleTheme.green,
  },
  stroopWordBox: {
    backgroundColor: appleTheme.tertiaryBg,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appleTheme.separatorSubtle,
    marginVertical: 4,
  },
  stroopWordText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  stroopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  stroopButton: {
    flex: 1,
    minWidth: '45%',
    height: 48,
    backgroundColor: appleTheme.tertiaryBg,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: appleTheme.separatorSubtle,
  },
  stroopColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stroopButtonText: {
    fontFamily: ui.body.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: appleTheme.label,
  },
});
