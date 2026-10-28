import { useThemeStyles, useAppTheme } from '@/features/appearance/theme';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Linking, ScrollView, Text, View } from 'react-native';
import { Action } from '@/components/protection-ui';
import { findCuriosityStory } from './content';
import { readCuriosity, toggleSavedStory } from './storage';
import { useCuriositySession } from './session';
import { CuriosityShell, SmallButton, StoryImage, curiosityStyle as sharedCuriosityStyles } from './ui';

function Fade({ children, reduced }: PropsWithChildren<{ reduced: boolean }>) {
  useAppTheme();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) return;
    opacity.setValue(0);
    const animation = Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced]);
  return <Animated.View style={{ opacity, gap: 22 }}>{children}</Animated.View>;
}
export default function CuriosityStoryScreen() {
  const s = useThemeStyles(sharedCuriosityStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const story = typeof id === 'string' ? findCuriosityStory(id) : undefined;
  const session = useCuriositySession();
  const [stage, setStage] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selection, setSelection] = useState<number | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [reduced, setReduced] = useState(true);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useFocusEffect(useCallback(() => { setSaved(readCuriosity().saved); }, []));
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; listener.remove(); };
  }, []);
  const back = () => router.navigate({ pathname: '/curiosity', params: session.routeParams });
  function changeStage(next: number) {
    setStage(next);
    scroll.current?.scrollTo({ y: 0, animated: !reduced });
  }
  function save() {
    if (!story) return;
    try { setSaved(toggleSavedStory(story.id)); setError(''); }
    catch { setError('Не вдалося зберегти історію. Спробуй ще раз.'); }
  }
  if (!story) return <CuriosityShell finish={() => void session.finish()} busy={session.busy} back={back}>
    <View style={s.content}><Text style={s.title}>Історію не знайдено</Text><Text style={s.muted}>Вона могла змінитися після оновлення добірки.</Text><Action label="До добірки" onPress={back} /></View>
  </CuriosityShell>;
  return <CuriosityShell finish={() => void session.finish()} busy={session.busy} back={back}>
    <ScrollView ref={scroll} contentContainerStyle={s.content}>
      <View style={s.row}>
        <Text style={s.eyebrow}>{story.category} · {stage === 0 ? 'Інтрига · ~5 с' : stage === 1 ? 'Відкриття · ~15 с' : stage === 2 ? 'Глибше · ~45 с' : `Стаття · ${story.readingMinutes} хв`}</Text>
      </View>
      <View style={s.card}><StoryImage story={story} large /></View>
      <Fade key={`${story.id}-${stage}`} reduced={reduced}>
        {stage === 0 && <><Text style={s.title} accessibilityRole="header">{story.title}</Text><Text style={[s.body, { fontSize: 23, lineHeight: 33 }]}>{story.hook}</Text><Text style={s.muted}>Жодного таймера. Продовжуй у своєму темпі.</Text></>}
        {stage === 1 && <>
          <Text style={s.title} accessibilityRole="header">{story.discovery.prompt}</Text>
          {story.discovery.kind === 'choice' && story.discovery.options?.map((option, index) => <SmallButton key={option} label={option} selected={selection === index} onPress={() => { setSelection(index); setRevealed(true); }} />)}
          {!revealed && story.discovery.kind !== 'choice' && <Action label={story.discovery.kind === 'connection' ? 'Побачити зв’язок' : 'Розкрити факт'} onPress={() => setRevealed(true)} />}
          {revealed && <View style={s.callout} accessibilityLiveRegion="polite">
            <Text style={s.eyebrow}>Ось що відомо</Text>
            {story.discovery.options && story.discovery.answer !== undefined && <Text style={s.heading}>{story.discovery.options[story.discovery.answer]}</Text>}
            <Text style={s.body}>{story.discovery.explanation}</Text>
          </View>}
        </>}
        {stage === 2 && <><Text style={s.title} accessibilityRole="header">{story.deepDive.title}</Text>{story.deepDive.paragraphs.map(paragraph => <Text key={paragraph} style={s.body}>{paragraph}</Text>)}</>}
        {stage === 3 && <>
          <Text style={s.title} accessibilityRole="header">{story.title}</Text><Text style={s.body}>{story.article.intro}</Text>
          {story.article.sections.map(section => <View style={s.section} key={section.heading}>
            <Text style={s.heading} accessibilityRole="header">{section.heading}</Text>{section.paragraphs.map(paragraph => <Text style={s.body} key={paragraph}>{paragraph}</Text>)}
          </View>)}
          <View style={s.callout}><Text style={s.heading}>Джерела</Text>
            {story.sources.map(source => <SmallButton key={source.url} label={`↗ ${source.title}`} onPress={() => {
              Linking.openURL(source.url).catch(() => setError('Не вдалося відкрити джерело. Для цього потрібен інтернет.'));
            }} />)}
            <Text style={s.muted}>{story.imageAlt}</Text>
            {story.imageKey === 'octopus' ? <SmallButton label="Фото: Nick Hobgood · CC BY-SA 3.0" onPress={() => { Linking.openURL('https://commons.wikimedia.org/wiki/File:Octopus_shell.jpg').catch(() => setError('Не вдалося відкрити сторінку фото.')); }} />
              : <Text style={s.muted}>Фото: Unsplash. Ілюстрація до теми, не зображення конкретного досліду.</Text>}
          </View>
        </>}
      </Fade>
      {stage < 3 && <View style={s.section}>
        <Action label={stage === 0 ? 'Хочу дізнатися' : stage === 1 && !revealed ? 'Показати пояснення' : stage === 1 ? 'Трохи глибше' : 'Читати повну статтю'}
          onPress={() => { if (stage === 1 && !revealed) setRevealed(true); else changeStage(stage + 1); }} />
        {stage < 2 && <SmallButton label="Одразу до статті" onPress={() => changeStage(3)} />}
      </View>}
      <View style={s.row}><SmallButton label={saved.includes(story.id) ? '✓ Збережено' : 'Зберегти на потім'} selected={saved.includes(story.id)} onPress={save} />
        {stage > 0 && <SmallButton label="Попередній етап" onPress={() => changeStage(stage - 1)} />}</View>
      {(error || session.error) !== '' && <Text style={s.muted} accessibilityLiveRegion="polite">{error || session.error}</Text>}
      {stage === 3 && <Action secondary label="Повернутися до добірки" onPress={back} />}
      {!session.preview && <SmallButton label="До звичайної паузи" disabled={session.busy} onPress={session.standardPause} />}
    </ScrollView>
  </CuriosityShell>;
}
