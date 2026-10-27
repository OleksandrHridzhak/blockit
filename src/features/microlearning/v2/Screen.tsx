import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, appleTheme, systemFont, ui } from '@/components/protection-ui';
import { useLearningSession } from '../useLearningSession';
import { ReturnAppSetting } from '@/components/return-app-setting';
import { type Answer, type V2Lesson } from './content';
import { chooseV2Lesson, readV2Progress, recordV2Event, shuffledAnswers } from './progress';

function SwipeSurface({ lesson, enabled, onAnswer, children }: PropsWithChildren<{ lesson: V2Lesson; enabled: boolean; onAnswer: (answer: Answer) => void }>) {
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => enabled && lesson.mechanic === 'myth' && Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 55 || !enabled || lesson.mechanic !== 'myth') return;
      const option = lesson.answers?.find(item => item.label === (gesture.dx < 0 ? 'Міф' : 'Правда'));
      if (option) onAnswer(option);
    },
  }), [lesson, enabled, onAnswer]);
  return <View {...pan.panHandlers}>{children}</View>;
}

export default function MicrolearningV2Screen() {
  const session = useLearningSession('microlearning-v2');
  const [card, setCard] = useState(() => {
    const picked = chooseV2Lesson(readV2Progress());
    return { ...picked, answers: shuffledAnswers(picked.lesson) };
  });
  const [depth, setDepth] = useState(0);
  const [selected, setSelected] = useState<Answer | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const answerLock = useRef(false);
  const { lesson } = card;
  const rabbit = lesson.mechanic === 'rabbit';
  useEffect(() => { recordV2Event(lesson, 'shown', { review: card.review }); }, [lesson, card.review]);
  const moveTo = (value: number) => {
    setDepth(value); scroll.current?.scrollTo({ y: 0, animated: false });
    if (value === 0) { answerLock.current = false; setSelected(null); }
    if (value === 1) recordV2Event(lesson, 'explanationOpened');
    if (value === 3) recordV2Event(lesson, 'detailOpened');
  };
  const answer = useCallback((option: Answer) => {
    if (answerLock.current) return;
    answerLock.current = true; setSelected(option); setDepth(1);
    recordV2Event(lesson, 'answered', { helpful: option.helpful });
    recordV2Event(lesson, 'explanationOpened');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [lesson]);
  function next() {
    if (depth === 0) recordV2Event(lesson, 'skipped');
    const picked = chooseV2Lesson(readV2Progress());
    setCard({ ...picked, answers: shuffledAnswers(picked.lesson) });
    setDepth(0); setSelected(null); answerLock.current = false;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  async function finish() {
    if (await session.finish() && !session.preview) recordV2Event(lesson, 'accessGranted');
  }
  async function dismiss() {
    if (await session.cancel() && !session.preview) recordV2Event(lesson, 'dismissed');
  }
  const finalDepth = rabbit ? 3 : 2;
  const stepLabel = rabbit ? ['Одна думка', 'Що за цим', 'На прикладі', 'Розбір'][depth] : depth === 0 ? 'Одна ситуація' : depth === 1 ? 'Що тут важливо' : 'На практиці';

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <View style={styles.brandRow}><Text style={styles.brand}>CustDev</Text><Text style={styles.version}>v2</Text></View>
      <Pressable accessibilityRole="button" onPress={() => void dismiss()} disabled={session.busy} style={styles.headerAction}><Text style={styles.dismiss}>Не відкривати</Text></Pressable>
    </View>
    <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.context}><Text style={styles.eyebrow}>{stepLabel.toUpperCase()}</Text>{card.review && depth === 0 && <Text style={styles.revisit}>Знайома ідея, інша ситуація</Text>}</View>
      <SwipeSurface lesson={lesson} enabled={depth === 0} onAnswer={answer}>
        {depth === 0 ? <>
          {lesson.mechanic === 'conversation' && <Text style={styles.speaker}>СПІВРОЗМОВНИК</Text>}
          <Text style={styles.title} accessibilityRole="header">{lesson.situation}</Text>
          {lesson.prompt && <Text style={styles.prompt}>{lesson.prompt}</Text>}
          {rabbit ? <Pressable accessibilityRole="button" onPress={() => moveTo(1)} style={({ pressed }) => [styles.discover, pressed && styles.pressed]}><Text style={styles.discoverText}>Розкрити думку</Text></Pressable>
            : <View style={styles.answers}>{card.answers.map(option => <Pressable key={option.id} accessibilityRole="button" onPress={() => answer(option)} style={({ pressed }) => [styles.answer, pressed && styles.pressed]}><Text style={styles.answerText}>{option.label}</Text></Pressable>)}</View>}
          {lesson.mechanic === 'myth' && <Text style={styles.hint}>Міф — свайп ліворуч. Правда — праворуч.</Text>}
          {!rabbit && <Pressable accessibilityRole="button" onPress={() => moveTo(1)} style={styles.quietAction}><Text style={styles.quiet}>Показати пояснення</Text></Pressable>}
        </> : depth === 1 ? <View accessibilityLiveRegion="polite">
          {selected?.reply && <View style={styles.reply}><Text style={styles.speaker}>СПІВРОЗМОВНИК</Text><Text style={styles.replyText}>{selected.reply}</Text></View>}
          <Text accessibilityRole="header" style={styles.takeaway}>{lesson.takeaway}</Text>
          <Text style={styles.body}>{selected?.explanation ?? lesson.answers?.find(option => option.helpful)?.explanation ?? lesson.detail}</Text>
        </View> : depth === 2 ? <>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{lesson.example?.title ?? 'Що змінює рішення'}</Text>
          <Text style={styles.body}>{lesson.example?.text ?? lesson.detail}</Text>
          {rabbit && <View style={styles.callout}><Text style={styles.calloutText}>{lesson.detail}</Text></View>}
        </> : <>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{lesson.deepDive?.title}</Text>
          {lesson.deepDive?.paragraphs.map((paragraph, index) => <Text key={index} style={styles.body}>{paragraph}</Text>)}
          <View style={styles.callout}><Text style={styles.eyebrow}>СПРОБУЙ У СВОЇЙ РОЗМОВІ</Text><Text style={styles.calloutText}>{lesson.deepDive?.takeaway}</Text></View>
        </>}
      </SwipeSurface>
      {depth > 0 && <View style={styles.depthActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Попередній рівень пояснення" onPress={() => moveTo(depth - 1)} style={styles.quietAction}><Text style={styles.quiet}>Назад</Text></Pressable>
        {depth < finalDepth && <Pressable accessibilityRole="button" onPress={() => moveTo(depth + 1)} style={styles.quietAction}><Text style={styles.deeper}>{rabbit ? depth === 1 ? 'Показати на прикладі' : 'Розібрати детально' : 'Розібрати на практиці'}</Text></Pressable>}
      </View>}
      <View style={styles.bottomMeta}>
        <Pressable accessibilityRole="button" onPress={next} style={styles.quietAction}><Text style={styles.quiet}>{depth === 0 ? 'Інша ситуація' : 'Ще одна думка'}</Text></Pressable>
        {depth === finalDepth && <Text style={styles.source}>The Mom Test · Rob Fitzpatrick · с. {lesson.pages}. Переказ і навчальні приклади.</Text>}
        {lesson.mechanic === 'conversation' && <Text style={styles.source}>Навчальна розмова з підготовленими репліками</Text>}
      </View>
      {!session.preview && session.appId && <ReturnAppSetting key={session.appId} tokenId={session.appId} disabled={session.busy} onChange={session.setReturnTarget} />}
      {session.error !== '' && <View accessibilityLiveRegion="polite" style={styles.error}><Text style={styles.body}>{session.error}</Text><Pressable accessibilityRole="button" onPress={session.retry} style={styles.quietAction}><Text style={styles.deeper}>Спробувати ще раз</Text></Pressable></View>}
    </ScrollView>
    <SafeAreaView edges={['bottom']} style={styles.footer}>
      <Action label={session.busy ? 'Зачекай…' : session.ready ? 'Відкрити доступ' : 'Пауза триває'} disabled={!session.ready || session.busy} onPress={() => void finish()} />
      {session.preview ? <Text style={styles.footerNote}>Перегляд · блокування не змінюється</Text> : session.ready ? <Text style={styles.footerNote}>Можна повернутися до свого застосунку або читати далі.</Text> : null}
    </SafeAreaView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080c0a' },
  header: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brand: { color: '#b7dc9a', fontSize: 16, fontWeight: '600', fontFamily: systemFont },
  version: { color: '#778779', fontSize: 11 }, headerAction: { minHeight: 44, justifyContent: 'center' }, dismiss: { color: '#97a699', fontSize: 14 },
  scroll: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 },
  context: { gap: 5, marginBottom: 18 }, eyebrow: { color: '#8da88d', fontSize: 10, letterSpacing: 1.3, fontWeight: '700' }, revisit: { color: '#8b988b', fontSize: 12 },
  title: { color: '#f1f5ee', fontFamily: systemFont, fontSize: 28, lineHeight: 35, fontWeight: '600', letterSpacing: -0.6 },
  prompt: { color: '#a3b0a3', fontSize: 16, lineHeight: 23, marginTop: 18 },
  speaker: { color: '#829c84', fontWeight: '600', fontSize: 10, letterSpacing: 1.2, marginBottom: 10 },
  answers: { gap: 10, marginTop: 22 }, answer: { minHeight: 56, backgroundColor: '#172119', borderColor: '#314333', borderWidth: 1, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 17, justifyContent: 'center' },
  answerText: { color: '#e7f1e3', fontSize: 16, lineHeight: 22 }, pressed: { opacity: 0.6 },
  discover: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 16, marginTop: 26, backgroundColor: '#b7dc9a', alignSelf: 'flex-start' }, discoverText: { color: '#172115', fontWeight: '600', fontSize: 16 },
  hint: { color: '#829482', fontSize: 12, lineHeight: 18, marginTop: 14 }, quietAction: { minHeight: 44, justifyContent: 'center', paddingVertical: 11 }, quiet: { color: '#93a294', fontSize: 14 },
  takeaway: { color: '#eef5e9', fontSize: 27, lineHeight: 34, letterSpacing: -0.5, fontWeight: '600', marginBottom: 20 },
  body: { color: '#c4d0c2', fontSize: 17, lineHeight: 27, marginBottom: 16 },
  sectionTitle: { color: '#eef5e9', fontSize: 25, lineHeight: 32, fontWeight: '600', marginBottom: 20, letterSpacing: -0.4 },
  reply: { backgroundColor: '#19271d', borderRadius: 18, padding: 18, marginBottom: 24 }, replyText: { color: '#e5f1de', fontSize: 19, lineHeight: 27 },
  callout: { backgroundColor: '#19271d', borderRadius: 18, padding: 18, gap: 10, marginTop: 8 }, calloutText: { color: '#d6e8ce', fontSize: 16, lineHeight: 25 },
  depthActions: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 12 }, deeper: { color: '#b7dc9a', fontWeight: '600', fontSize: 15 },
  bottomMeta: { marginTop: 18 }, source: { color: '#78897a', fontSize: 11, lineHeight: 17, marginTop: 8 },
  error: { backgroundColor: appleTheme.secondaryBg, padding: 16, borderRadius: 14, marginTop: 20 },
  footer: { backgroundColor: '#080c0a', borderTopWidth: 1, borderTopColor: '#1d2b20', paddingTop: 12, paddingHorizontal: 16 },
  footerNote: { ...ui.mutedText, fontSize: 11, textAlign: 'center', marginTop: 7, marginBottom: 5 },
});
