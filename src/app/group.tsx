import { useThemeStyles, useAppTheme } from '@/features/appearance/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Action, Copy, ListRow, ListSection, Page, ui as sharedUI } from '@/components/protection-ui';
import { ProtectionRuleEditor } from '@/components/protection-rule-editor';
import { FamilyAppLabel } from '@/components/family-app-label';
import { EditorialIcon } from '@/components/editorial-icon';
import { APP_CATALOG } from '@/core/catalog';
import { groupsService, groupModes } from '@/features/groups/service';
import { type AppGroup, type GroupMode } from '@/features/screen-time/client';
import { curiosityEnabled, setGroupCuriosity } from '@/features/curiosity/storage';

export default function GroupScreen() {
  useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof groupsService.load>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    groupsService.load().then(value => { if (alive) setData(value); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Не вдалося завантажити групу.'); });
    return () => { alive = false; };
  }, []);
  if (!data) return <Page><Copy>{error || 'Завантажуємо групу…'}</Copy><Action secondary label="Назад" onPress={() => router.back()} /></Page>;
  const group = data.groups.find(group => group.id === id);
  if (id && !group) return <Page><Copy>Цю групу вже видалено.</Copy><Action label="До груп" onPress={() => router.replace('/')} /></Page>;
  let number = 1;
  while (data.groups.some(item => item.name.trim().toLocaleLowerCase() === `група ${number}`)) number++;
  return <GroupEditor key={id ?? 'new'} initial={group} demo={data.demo} defaultName={`Група ${number}`} />;
}
function GroupEditor({ initial, demo, defaultName }: { initial?: AppGroup; demo: boolean; defaultName: string }) {
  const appleTheme = useAppTheme();
  const ui = useThemeStyles(sharedUI);
  const [group, setGroup] = useState<AppGroup>(() => initial ?? {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: defaultName, seconds: 20, mode: 'countdown', appIds: [],
  });
  return <ProtectionRuleEditor demo={demo} label={group.name.trim() || 'групи'}
    initial={{ ...(demo ? initial?.previewRule : undefined), seconds: initial?.seconds ?? 20,
      mode: demo ? initial?.previewRule?.mode ?? initial?.mode ?? 'countdown' : initial?.mode ?? 'countdown',
      sessionMinutes: demo ? initial?.previewRule?.sessionMinutes ?? 5 : initial?.sessionMinutes ?? 15,
      curiosity: curiosityEnabled(initial?.id) }}
    valid={Boolean(group.name.trim())} saveLabel={initial ? 'Зберегти правило' : demo ? 'Створити групу' : 'Обрати застосунки й створити'}
    identity={busy => <ListSection title="НАЗВА ГРУПИ"><TextInput accessibilityLabel="Назва групи"
      placeholder="Наприклад, Соцмережі" placeholderTextColor={appleTheme.secondaryLabel}
      value={group.name} onChangeText={name => setGroup({ ...group, name })} maxLength={60} editable={!busy}
      autoCapitalize="sentences" returnKeyType="done" style={[ui.body, { minHeight: 52, padding: 16 }]} /></ListSection>}
    selection={busy => <ListSection title="ЗАСТОСУНКИ" footer={demo ? 'Обери застосунки для спільного правила.' : 'Один застосунок може бути окремим або належати одній групі. Додавання сюди перемістить його з попереднього списку.'}>
      {demo ? APP_CATALOG.map(app => <Pressable key={app.id} accessibilityRole="checkbox" accessibilityState={{ checked: group.appIds.includes(app.id), disabled: busy }}
        disabled={busy} onPress={() => setGroup({ ...group, appIds: group.appIds.includes(app.id) ? group.appIds.filter(id => id !== app.id) : [...group.appIds, app.id] })}
        style={{ minHeight: 48, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[ui.body, { flex: 1 }]}>{app.name}</Text><EditorialIcon name={group.appIds.includes(app.id) ? 'check' : 'add'} active size={20} />
      </Pressable>) : group.appIds.length > 0 ? group.appIds.map(id => <ListRow key={id}><FamilyAppLabel tokenId={id} /></ListRow>)
        : <ListRow showSeparator={false}><Copy muted>Застосунки ще не обрано</Copy></ListRow>}
    </ListSection>}
    canChangeSelection={Boolean(initial) && !demo}
    onSave={async (draft, pick) => {
      const nativeMode = groupModes.some(item => item.id === draft.mode) ? draft.mode as GroupMode : 'countdown';
      const { curiosity, ...rule } = draft;
      const saved = await groupsService.save({ ...group, name: group.name.trim(), seconds: draft.seconds, mode: nativeMode, sessionMinutes: draft.sessionMinutes,
        ...(demo ? { previewRule: rule } : {}),
      }, demo, pick || (!initial && !demo));
      if (saved) setGroupCuriosity(group.id, curiosity);
      return saved;
    }}
    onRemove={initial ? async () => { await groupsService.remove(group.id, demo); } : undefined}
    removeLabel="Видалити групу" />;
}
