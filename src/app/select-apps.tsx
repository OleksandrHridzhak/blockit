import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Action, Copy, Kicker, Page, ui } from '@/components/protection-ui';
import { previewApps, readPreview, savePreview } from '@/features/preview/store';

export default function SelectAppsScreen() {
  const [selected, setSelected] = useState(() => readPreview().apps);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const visible = useMemo(() => previewApps.filter(app => app.name.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  const save = () => {
    try { savePreview({ apps: selected }); router.replace('/'); }
    catch { setError('Не вдалося зберегти список. Перевір, чи браузер дозволяє локальне збереження.'); }
  };
  return <Page footer={<Action label={selected.length ? `Зберегти вибір (${selected.length})` : 'Зберегти порожній список'} onPress={save} />}>
    <Stack.Screen options={{ headerShown: false }} />
    <Action label="Назад без збереження" secondary onPress={() => router.replace('/')} />
    <View style={{ gap: 10 }}><Copy title>Обери застосунки</Copy><Kicker>Демонстраційний список</Kicker><Copy muted>Це приклади для перевірки інтерфейсу. У повній iOS-збірці тут відкриється системний список твоїх застосунків.</Copy></View>
    <TextInput accessibilityLabel="Знайти застосунок" placeholder="Знайти застосунок" placeholderTextColor="#8E8E8E" value={search} onChangeText={setSearch} autoCorrect={false} style={ui.input} />
    <View>{visible.map(app => <Pressable key={app.id} accessibilityRole="checkbox" accessibilityLabel={app.name} accessibilityState={{ checked: selected.includes(app.id) }} onPress={() => toggle(app.id)} style={({ pressed }) => [ui.appRow, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={ui.appMark}><Text style={ui.appMarkText}>{app.name.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Copy>{app.name}</Copy></View>
      <View style={[ui.check, selected.includes(app.id) && { backgroundColor: '#FAFAFA' }]}>{selected.includes(app.id) && <Text style={{ color: '#121212', fontSize: 16 }}>✓</Text>}</View>
    </Pressable>)}</View>
    {visible.length === 0 && <Copy muted>Нічого не знайдено. Спробуй іншу назву.</Copy>}
    {error !== '' && <Copy>{error}</Copy>}
  </Page>;
}
