import { Platform } from 'react-native';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { lessons, type Lesson, type Mechanic } from './content';

const KEY = 'blockit.microlearning.last.v1';
export type LastLesson = { id: string; mechanic: Mechanic };
export type LearningProgress = { last: LastLesson | null; seenIds: string[] };
const empty = (): LearningProgress => ({ last: null, seenIds: [] });

export function pickLesson(previous?: LastLesson | null, random: () => number = Math.random, options?: { seenIds?: string[] }): Lesson {
  const pool = lessons;
  const unseen = pool.filter(item => !options?.seenIds?.includes(item.id));
  const candidates = unseen.length ? unseen : pool;
  const mechanics = [...new Set(candidates.map(item => item.mechanic))];
  const available = mechanics.length > 1 ? mechanics.filter(type => type !== previous?.mechanic) : mechanics;
  const type = available[Math.floor(random() * available.length)] ?? available[0];
  const choices = candidates.filter(item => item.mechanic === type && item.id !== previous?.id);
  const fallback = candidates.find(item => item.mechanic === type) ?? pool[0];
  // Mix depth automatically, favoring applied and deeper material over basics.
  const weighted = choices.flatMap(lesson => (lesson.difficulty ?? 1) === 1 ? [lesson] : [lesson, lesson]);
  return weighted[Math.floor(random() * weighted.length)] ?? fallback;
}
export function readLearningProgress(): LearningProgress {
  try {
    const raw = Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    if (!raw) return empty();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return empty();
    const record = value as Record<string, unknown>;
    const match = lessons.find(item => item.id === record.id && item.mechanic === record.mechanic);
    const seenIds = Array.isArray(record.seenIds) ? [...new Set(record.seenIds.filter((id): id is string => typeof id === 'string' && lessons.some(lesson => lesson.id === id)))].slice(-lessons.length) : [];
    return { last: match ? { id: match.id, mechanic: match.mechanic } : null, seenIds };
  } catch { return empty(); }
}
export function readLastLesson(): LastLesson | null { return readLearningProgress().last; }
function write(progress: LearningProgress) {
  try {
    const raw = JSON.stringify({ ...progress.last, seenIds: progress.seenIds });
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, raw);
    else BlockitBridge.setString(KEY, raw);
  } catch { /* Learning remains available if local storage fails. */ }
}
export function saveLastLesson(lesson: Lesson): void {
  const current = readLearningProgress();
  const completed = lessons.every(item => current.seenIds.includes(item.id));
  const seenIds = completed ? [] : current.seenIds;
  write({ ...current, last: { id: lesson.id, mechanic: lesson.mechanic }, seenIds: [...new Set([...seenIds, lesson.id])] });
}
