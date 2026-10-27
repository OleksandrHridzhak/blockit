import { useEffect, useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Page, appleTheme, ui } from '@/components/protection-ui';
import { useLearningSession } from './useLearningSession';
import { ReturnAppSetting } from '@/components/return-app-setting';
import { mechanicNames, type Lesson, type Option } from './content';
import { pickLesson, readLearningProgress, saveLastLesson } from './selection';

function MythCard({ lesson, onAnswer }: { lesson: Lesson; onAnswer: (option: Option) => void }) {
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) >= 55) {
        const option = lesson.options?.find(item => item.label === (gesture.dx < 0 ? 'Міф' : 'Правда'));
        if (option) onAnswer(option);
      }
    },
  }), [lesson, onAnswer]);
  return <View {...pan.panHandlers} style={styles.statement}>
    <Text accessibilityRole="header" style={styles.statementText}>{lesson.hook}</Text>
    <Text style={styles.swipeHint}>Свайп ліворуч — міф · праворуч — правда</Text>
  </View>;
}

export default function MicrolearningScreen() {
  const { preview, busy, error, ready, finish, cancel, appId, setReturnTarget } = useLearningSession('microlearning');
  const [lesson, setLesson] = useState(() => {
    const progress = readLearningProgress();
    return pickLesson(progress.last, Math.random, progress);
  });
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState<Option | null>(null);
  useEffect(() => { saveLastLesson(lesson); }, [lesson]);
  const rabbit = lesson.mechanic === 'rabbit';
  function nextLesson() { setLesson(pickLesson(lesson, Math.random, readLearningProgress())); setLevel(0); setSelected(null); }
  function answer(option: Option) { setSelected(option); setLevel(1); }
  return <Page footer={<View style={{ gap: 8 }}>
    <Action label={busy ? 'Зачекай…' : ready ? 'Відкрити доступ' : 'Пауза триває'} disabled={!ready || busy} onPress={() => void finish()} />
    {ready && !preview && <Text style={[ui.mutedText, { textAlign: 'center' }]}>Після відкриття доступу повернись у свій застосунок.</Text>}
  </View>}>
    <View style={styles.header}><Text style={styles.brand}>MICROLEARNING</Text><Pressable accessibilityRole="button" onPress={() => void cancel()} disabled={busy} style={styles.close}><Text style={styles.link}>Закрити</Text></Pressable></View>
    {!preview && appId && <ReturnAppSetting key={appId} tokenId={appId} disabled={busy} onChange={setReturnTarget} />}
    <Text style={styles.topic}>CUSTDEV · {mechanicNames[lesson.mechanic].toUpperCase()}</Text>
    {lesson.mechanic === 'conversation' && <Text style={styles.speaker}>СПІВРОЗМОВНИК</Text>}
    {lesson.mechanic === 'myth' && !selected && level === 0 ? <MythCard lesson={lesson} onAnswer={answer} /> : <Text accessibilityRole="header" style={styles.title}>{lesson.hook}</Text>}
    {lesson.intro && <Text style={styles.intro}>{lesson.intro}</Text>}
    {rabbit && level === 0 && <Text style={styles.intro}>Можна просто зробити паузу або дізнатися трохи більше.</Text>}
    {!rabbit && !selected && level === 0 && <View style={styles.options}>
      {lesson.options?.map(option => <Pressable key={option.label} accessibilityRole="button" onPress={() => answer(option)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
        <Text style={styles.optionText}>{option.label}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => setLevel(1)} style={styles.reveal}><Text style={styles.readText}>Просто показати пояснення</Text></Pressable>
    </View>}
    {!rabbit && selected && <View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.cardLabel}>{lesson.mechanic === 'conversation' ? 'ЯК МОЖЕ ПРОДОВЖИТИСЯ РОЗМОВА' : 'ЦІКАВО'}</Text><Text style={styles.body}>{selected.response}</Text></View>}
    {level >= 1 && (rabbit || !selected) && <View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.cardLabel}>КОРОТКО</Text><Text style={styles.body}>{lesson.insight}</Text></View>}
    {level >= 1 && selected && <Text style={styles.insight}>{lesson.insight}</Text>}
    {rabbit && level === 1 && lesson.followUp && <View style={styles.followUp}><Text style={styles.followLabel}>А ЩО ДАЛІ?</Text><Text style={styles.followText}>{lesson.followUp}</Text></View>}
    {rabbit && level >= 2 && lesson.example && <View style={styles.example}>
      <Text style={styles.cardLabel}>ПРИКЛАД</Text><Text style={styles.sectionTitle}>{lesson.example.title}</Text><Text style={styles.body}>{lesson.example.text}</Text>
      <Text style={styles.insight}>{lesson.detail}</Text>
    </View>}
    {rabbit && level >= 3 && lesson.deepDive && <View style={styles.detail}>
      <Text style={styles.cardLabel}>РОЗГОРНУТИЙ РОЗБІР</Text><Text style={styles.sectionTitle}>{lesson.deepDive.title}</Text>
      {lesson.deepDive.paragraphs.map((paragraph, i) => <Text key={i} style={[styles.body, { marginBottom: 16 }]}>{paragraph}</Text>)}
      <View style={styles.takeaway}><Text style={styles.cardLabel}>ЩО СПРОБУВАТИ</Text><Text style={styles.body}>{lesson.deepDive.takeaway}</Text></View>
      <Text style={styles.source}>The Mom Test · Rob Fitzpatrick{lesson.sourcePages ? ` · с. ${lesson.sourcePages} у наданому PDF` : ''}. Переказ і навчальні приклади.</Text>
    </View>}
    {!rabbit && level >= 2 && <View style={styles.detail}><Text style={styles.cardLabel}>ТРОХИ ГЛИБШЕ</Text><Text style={styles.body}>{lesson.detail}</Text><Text style={styles.source}>За мотивами The Mom Test · Rob Fitzpatrick{lesson.sourcePages ? ` · с. ${lesson.sourcePages}` : ''}</Text></View>}
    {((rabbit && level < 3) || (!rabbit && level === 1)) && <Pressable accessibilityRole="button" style={styles.read} onPress={() => setLevel(level + 1)}><Text style={styles.readText}>{rabbit ? ['Відкрити думку', 'Показати на прикладі', 'Розібрати детально'][level] : 'Заглибитися'}</Text></Pressable>}
    <Pressable accessibilityRole="button" style={styles.next} onPress={nextLesson}><Text style={styles.nextText}>Щось інше →</Text></Pressable>
    {lesson.mechanic === 'conversation' && <Text style={styles.source}>Приклад розмови · відповіді підготовлені заздалегідь</Text>}
    {error !== '' && <Text accessibilityLiveRegion="polite" style={{ color: appleTheme.red, marginTop: 20 }}>{error}</Text>}
    {preview && <Text style={[ui.mutedText, { marginTop: 24 }]}>Перегляд: тут блокування застосунку не змінюється.</Text>}
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { color: appleTheme.label, fontWeight: '700', letterSpacing: 2, fontSize: 11 },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }, link: { color: appleTheme.secondaryLabel, fontSize: 15 },
  topic: { color: '#9fcfa8', fontWeight: '700', fontSize: 11, letterSpacing: 1.4, marginBottom: 16 },
  title: { color: appleTheme.label, fontSize: 29, fontWeight: '700', letterSpacing: -0.7, lineHeight: 36 },
  intro: { color: appleTheme.secondaryLabel, fontSize: 16, lineHeight: 24, marginTop: 14 },
  speaker: { color: appleTheme.secondaryLabel, fontSize: 11, letterSpacing: 1.3, fontWeight: '700', marginBottom: 12 },
  statement: { backgroundColor: '#1d2b22', borderColor: '#35483b', borderWidth: 1, borderRadius: 22, padding: 22 },
  statementText: { color: appleTheme.label, fontSize: 24, lineHeight: 31, fontWeight: '700' },
  swipeHint: { color: '#a1b6a4', fontSize: 12, marginTop: 20, lineHeight: 18 },
  options: { gap: 10, marginTop: 24 }, option: { borderWidth: 1, borderColor: '#35453a', backgroundColor: '#1c241f', borderRadius: 16, minHeight: 52, justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  pressed: { opacity: 0.65 }, optionText: { color: appleTheme.label, fontSize: 16, lineHeight: 22 }, reveal: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  card: { backgroundColor: '#1d2b22', borderRadius: 20, padding: 20, marginTop: 24 },
  detail: { borderTopColor: appleTheme.separator, borderTopWidth: 1, paddingTop: 22, marginTop: 24 },
  example: { backgroundColor: '#202627', borderRadius: 20, padding: 20, marginTop: 24 },
  sectionTitle: { color: appleTheme.label, fontWeight: '600', fontSize: 21, lineHeight: 27, marginBottom: 14 },
  takeaway: { backgroundColor: '#1d2b22', borderRadius: 16, padding: 18, marginTop: 6 },
  cardLabel: { color: '#9fcfa8', fontWeight: '700', fontSize: 10, letterSpacing: 1.3, marginBottom: 12 },
  body: { color: appleTheme.label, fontSize: 16, lineHeight: 25 }, insight: { color: appleTheme.secondaryLabel, marginTop: 16, fontSize: 15, lineHeight: 23 },
  followUp: { marginTop: 25 }, followLabel: { color: appleTheme.secondaryLabel, fontWeight: '700', fontSize: 10, letterSpacing: 1.3, marginBottom: 8 },
  followText: { color: appleTheme.label, fontWeight: '600', fontSize: 21, lineHeight: 28 },
  source: { color: appleTheme.secondaryLabel, marginTop: 16, fontSize: 12, lineHeight: 18 },
  read: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 50 }, readText: { color: '#b7dc9a', fontSize: 16, fontWeight: '600' },
  next: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 }, nextText: { color: appleTheme.secondaryLabel, fontSize: 15 },
});
