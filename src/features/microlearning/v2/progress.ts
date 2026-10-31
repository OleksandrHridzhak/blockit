import { Platform } from 'react-native';
import { diagnosticJournal } from '@/features/diagnostics/journal';
import { BlockitBridge } from '../../../../modules/blockit-bridge';
import { v2Lessons, type Concept, type V2Lesson } from './content';

const KEY = 'blockit.microlearning.v2';
const DAY = 24 * 60 * 60 * 1000;
export type LearningEvent = 'shown' | 'answered' | 'explanationOpened' | 'detailOpened' | 'skipped' | 'accessGranted' | 'dismissed';
export type CardState = { lastShownAt: number; shows: number; answeredAt?: number; helpful?: boolean; explanationAt?: number; detailAt?: number };
export type Review = { dueAt: number; step: number; lastLessonId: string };
export type V2Progress = {
  cards: Record<string, CardState>; reviews: Partial<Record<Concept, Review>>; lastId?: string; newSinceReview: number;
  events: { type: LearningEvent; lessonId: string; at: number; helpful?: boolean }[];
};
const empty = (): V2Progress => ({ cards: {}, reviews: {}, newSinceReview: 0, events: [] });
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function readV2Progress(): V2Progress {
  try {
    const raw = Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : BlockitBridge.getString(KEY);
    if (!raw) return empty();
    const value = JSON.parse(raw) as Partial<V2Progress>;
    if (!value || typeof value !== 'object') return empty();
    const cards: V2Progress['cards'] = {};
    const reviews: V2Progress['reviews'] = {};
    for (const lesson of v2Lessons) {
      const card = value.cards?.[lesson.id];
      if (card && finite(card.lastShownAt) && finite(card.shows)) cards[lesson.id] = {
        lastShownAt: card.lastShownAt, shows: Math.floor(card.shows),
        ...(finite(card.answeredAt) ? { answeredAt: card.answeredAt } : {}),
        ...(typeof card.helpful === 'boolean' ? { helpful: card.helpful } : {}),
        ...(finite(card.explanationAt) ? { explanationAt: card.explanationAt } : {}),
        ...(finite(card.detailAt) ? { detailAt: card.detailAt } : {}),
      };
      const review = value.reviews?.[lesson.concept];
      if (review && finite(review.dueAt) && Number.isInteger(review.step) && review.step >= 0 && review.step <= 3
        && v2Lessons.some(item => item.id === review.lastLessonId && item.concept === lesson.concept)) {
        reviews[lesson.concept] = { dueAt: review.dueAt, step: review.step, lastLessonId: review.lastLessonId };
      }
    }
    const ids = new Set(v2Lessons.map(lesson => lesson.id));
    const eventTypes: LearningEvent[] = ['shown', 'answered', 'explanationOpened', 'detailOpened', 'skipped', 'accessGranted', 'dismissed'];
    return { cards, reviews, lastId: ids.has(value.lastId ?? '') ? value.lastId : undefined,
      newSinceReview: finite(value.newSinceReview) ? Math.min(1000, Math.floor(value.newSinceReview)) : 0,
      events: Array.isArray(value.events) ? value.events.filter(event => event && eventTypes.includes(event.type) && ids.has(event.lessonId) && finite(event.at)).slice(-200) : [],
    };
  } catch (error) { diagnosticJournal.record('learning-v2-read-error', { error }, 'error'); return empty(); }
}
function write(progress: V2Progress) {
  try {
    const raw = JSON.stringify(progress);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, raw);
    else BlockitBridge.setString(KEY, raw);
  } catch (error) { diagnosticJournal.record('learning-v2-write-error', { error }, 'error'); }
}
export function chooseV2Lesson(progress: V2Progress, now = Date.now(), random = Math.random): { lesson: V2Lesson; review: boolean } {
  const due = v2Lessons.filter(lesson => {
    const review = progress.reviews[lesson.concept];
    return review && review.dueAt <= now && review.lastLessonId !== lesson.id && (progress.cards[lesson.id]?.lastShownAt ?? 0) <= now - DAY;
  });
  const unseen = v2Lessons.filter(lesson => !progress.cards[lesson.id]?.shows);
  const review = due.length > 0 && (progress.newSinceReview >= 2 || unseen.length === 0);
  let pool = review ? due : unseen.length ? unseen : v2Lessons;
  const different = pool.filter(lesson => lesson.id !== progress.lastId);
  if (different.length) pool = different;
  const previous = v2Lessons.find(lesson => lesson.id === progress.lastId);
  const differentMechanic = pool.filter(lesson => lesson.mechanic !== previous?.mechanic);
  if (differentMechanic.length) pool = differentMechanic;
  if (!review && !unseen.length) {
    const oldest = Math.min(...pool.map(lesson => progress.cards[lesson.id]?.lastShownAt ?? 0));
    pool = pool.filter(lesson => (progress.cards[lesson.id]?.lastShownAt ?? 0) === oldest);
  }
  return { lesson: pool[Math.floor(random() * pool.length)] ?? v2Lessons[0], review };
}
export function recordV2Event(lesson: V2Lesson, type: LearningEvent, options: { now?: number; helpful?: boolean; review?: boolean } = {}): void {
  diagnosticJournal.record('learning-v2-event', { lesson: lesson.id, type, review: options.review });
  const progress = readV2Progress();
  const now = options.now ?? Date.now();
  const card = progress.cards[lesson.id] ?? { shows: 0, lastShownAt: 0 };
  if (type === 'shown') {
    // A refresh/remount is one exposure, not another learning achievement.
    if (progress.lastId === lesson.id && now - card.lastShownAt < 1000) return;
    card.lastShownAt = now; card.shows += 1; progress.lastId = lesson.id;
    progress.newSinceReview = options.review ? 0 : progress.newSinceReview + 1;
  }
  if (type === 'answered') { card.answeredAt = now; card.helpful = options.helpful; }
  if (type === 'explanationOpened') card.explanationAt = now;
  if (type === 'detailOpened') card.detailAt = now;
  if (type === 'answered' || type === 'explanationOpened') {
    const prior = progress.reviews[lesson.concept];
    // Only a helpful answer in another context after a delay lengthens the interval.
    const advances = type === 'answered' && options.helpful && prior && prior.dueAt <= now && prior.lastLessonId !== lesson.id;
    const step = advances ? Math.min(3, prior.step + 1) : type === 'answered' && !options.helpful ? 0 : prior?.step ?? 0;
    if (!prior || type === 'answered' || prior.lastLessonId !== lesson.id) {
      progress.reviews[lesson.concept] = { dueAt: now + [1, 3, 7, 14][step] * DAY, step, lastLessonId: lesson.id };
    }
  }
  progress.cards[lesson.id] = card;
  progress.events = [...progress.events, { type, lessonId: lesson.id, at: now, ...(options.helpful !== undefined ? { helpful: options.helpful } : {}) }].slice(-200);
  write(progress);
}
export function shuffledAnswers(lesson: V2Lesson, random = Math.random) {
  const answers = [...(lesson.answers ?? [])];
  return random() < 0.5 ? answers : answers.reverse();
}
