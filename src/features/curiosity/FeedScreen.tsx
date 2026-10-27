import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, FlatList, Pressable, Text, View } from 'react-native';
import { Action } from '@/components/protection-ui';
import { curiosityStories } from './content';
import { readCuriosity, toggleSavedStory } from './storage';
import { useCuriositySession } from './session';
import { CuriosityShell, SmallButton, StoryImage, curiosityStyle as s } from './ui';

export default function CuriosityFeedScreen() {
  const session = useCuriositySession();
  const finish = session.finish;
  const [saved, setSaved] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    try { setSaved(readCuriosity().saved); } catch { setError('Не вдалося прочитати збережене.'); }
  }, []));
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { void finish(); return true; });
    return () => listener.remove();
  }, [finish]));
  const stories = filter === 'saved' ? curiosityStories.filter(story => saved.includes(story.id)) : curiosityStories;
  function save(id: string) {
    try { setSaved(toggleSavedStory(id)); setError(''); }
    catch { setError('Не вдалося зберегти історію. Спробуй ще раз.'); }
  }
  return <CuriosityShell finish={() => void session.finish()} busy={session.busy}>
    <FlatList data={stories} keyExtractor={story => story.id} initialNumToRender={3} contentContainerStyle={s.content}
      ListHeaderComponent={<View style={s.section}>
        <Text style={s.eyebrow}>Маленька зміна маршруту</Text>
        <Text style={s.title} accessibilityRole="header">А що, як{`\n`}натомість здивуватися?</Text>
        <Text style={s.muted}>Вісім історій про незвичайне у звичайному. Обери одну або заверши сесію будь-коли.</Text>
        <View style={s.row}>
          <SmallButton label="Добірка" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <SmallButton label={`Збережене · ${saved.filter(id => curiosityStories.some(story => story.id === id)).length}`} selected={filter === 'saved'} onPress={() => setFilter('saved')} />
        </View>
        {!session.preview && <View style={s.callout}>
          <Text style={s.muted}>Читання — за бажанням. Чинне правило блокування продовжує діяти; історії самі не надають доступу.</Text>
          <SmallButton label="До звичайної паузи" onPress={session.standardPause} />
        </View>}
        {(error || session.error) !== '' && <Text accessibilityLiveRegion="polite" style={s.muted}>{error || session.error}</Text>}
      </View>}
      renderItem={({ item: story, index }) => <View style={s.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Відкрити історію: ${story.title}`} onPress={() => router.push({ pathname: '/curiosity/story/[id]', params: { id: story.id, ...session.routeParams } })}>
          <StoryImage story={story} large={index === 0} />
          <View style={s.cardBody}>
            <Text style={s.eyebrow}>{story.category} · {story.readingMinutes} хв читання</Text>
            <Text style={s.cardTitle}>{story.title}</Text>
          </View>
        </Pressable>
        <View style={{ paddingHorizontal: 18, paddingBottom: 14, alignItems: 'flex-start' }}>
          <SmallButton label={saved.includes(story.id) ? '✓ Збережено' : 'Зберегти на потім'} selected={saved.includes(story.id)} onPress={() => save(story.id)} />
        </View>
      </View>}
      ListEmptyComponent={<View style={s.callout}><Text style={s.heading}>Тут будуть збережені історії</Text><Text style={s.muted}>У добірці натисни «Зберегти на потім» біля історії, яка зацікавила.</Text><SmallButton label="До добірки" onPress={() => setFilter('all')} /></View>}
      ListFooterComponent={<View style={s.section}><Text style={s.heading}>На цьому добірка закінчується</Text><Text style={s.muted}>Не потрібно читати все. Можна повернутися до свого дня.</Text><Action label="Завершити сесію" disabled={session.busy} onPress={() => void session.finish()} /></View>} />
  </CuriosityShell>;
}
