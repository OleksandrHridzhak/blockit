import { Platform } from 'react-native';
import { diagnosticJournal } from '@/features/diagnostics/journal';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { screenTime, type AppGroup, type GroupMode } from '@/features/screen-time/client';

export const groupModes: { id: GroupMode; title: string; detail: string }[] = [
  { id: 'countdown', title: 'Тільки пауза', detail: 'Після паузи доступ відкриється автоматично.' },
  { id: 'reflection', title: 'Обрати намір', detail: 'Обери мету відкриття в Blockit.' },
  { id: 'typing', title: 'Написати фразу', detail: 'Введи фразу, щоб отримати доступ.' },
  { id: 'microlearning', title: 'Microlearning', detail: 'Короткі ідеї про CustDev під час паузи.' },
  { id: 'microlearning-v2', title: 'Microlearning v2', detail: 'Одна ситуація, коротка відповідь і розумні повторення.' },
];
const KEY = 'blockit.groups.preview.v1';
function demoGroups(): AppGroup[] {
  try {
    const raw = Platform.OS === 'web' && typeof localStorage !== 'undefined'
      ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((group): group is AppGroup =>
      group && typeof group.id === 'string' && typeof group.name === 'string' && Array.isArray(group.appIds)
      && (Number.isInteger(group.seconds) && group.seconds >= 1 && group.seconds <= 86400) && groupModes.some(mode => mode.id === group.mode)) : [];
  } catch (error) { diagnosticJournal.record('groups-read-error', { error }, 'error'); return []; }
}
function writeDemo(groups: AppGroup[]) {
  const raw = JSON.stringify(groups);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, raw);
  else BlockitBridge.setString(KEY, raw);
}
export const groupsService = {
  async load() {
    const status = await screenTime.status();
    return { status, demo: !status.available, groups: status.available ? await screenTime.groups() : demoGroups() };
  },
  async save(group: AppGroup, demo: boolean, pick = false) {
    if (!demo) return pick ? screenTime.pickGroup(group) : (await screenTime.saveGroup(group), true);
    const groups = demoGroups().filter(item => item.id !== group.id).map(item => ({
      ...item, appIds: item.appIds.filter(id => !group.appIds.includes(id)),
    }));
    writeDemo([...groups, group]);
    return true;
  },
  async remove(id: string, demo: boolean) {
    if (!demo) await screenTime.deleteGroup(id);
    else writeDemo(demoGroups().filter(group => group.id !== id));
  },
};
