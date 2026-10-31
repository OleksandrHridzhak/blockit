import { lessons } from '../../features/microlearning/content';
import { pickLesson, readLastLesson, readLearningProgress, saveLastLesson } from '../../features/microlearning/selection';

const mockStorage = new Map<string, string>();
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: {
  getString: (key: string) => mockStorage.get(key) ?? null,
  setString: (key: string, value: string) => mockStorage.set(key, value),
} }));
beforeEach(() => mockStorage.clear());

test('offers six mechanics with multiple complete lessons', () => {
  expect(lessons).toHaveLength(60);
  const kinds = new Set(lessons.map(lesson => lesson.mechanic));
  expect(kinds.size).toBe(6);
  for (const kind of kinds) {
    const items = lessons.filter(lesson => lesson.mechanic === kind);
    expect(items).toHaveLength(10);
    for (const lesson of items) {
      expect(lesson.insight).toBeTruthy(); expect(lesson.detail).toBeTruthy();
      if (kind !== 'rabbit') {
        expect(lesson.options?.length).toBeGreaterThanOrEqual(2);
        expect(lesson.options?.some(option => option.helpful)).toBe(true);
        expect(lesson.options?.every(option => option.response.length > 0)).toBe(true);
      } else {
        expect(lesson.followUp).toBeTruthy();
        expect(lesson.example?.text.length).toBeGreaterThan(150);
        expect(lesson.deepDive?.paragraphs.length).toBeGreaterThanOrEqual(3);
        expect(lesson.deepDive?.paragraphs.join(' ').split(/\s+/).length).toBeGreaterThanOrEqual(140);
        expect(lesson.deepDive?.takeaway).toBeTruthy();
        expect(lesson.sourcePages).toBeTruthy();
      }
    }
  }
  expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(lessons.length);
});

test('automatically mixes all depths and exhausts unseen cards before repeating', () => {
  for (const random of [0, 0.4, 0.999]) {
    const seenIds: string[] = [];
    let previous = null;
    for (let i = 0; i < lessons.length; i++) {
      const lesson = pickLesson(previous, () => random, { seenIds });
      expect(seenIds).not.toContain(lesson.id);
      seenIds.push(lesson.id); previous = lesson;
    }
    expect(new Set(seenIds).size).toBe(lessons.length);
  }
});

test('starts a new cycle only after the entire library is exhausted', () => {
  lessons.forEach(saveLastLesson);
  expect(readLearningProgress().seenIds).toHaveLength(lessons.length);
  saveLastLesson(lessons[0]);
  expect(readLearningProgress().seenIds).toEqual([lessons[0].id]);
});

test('keeps seen history from the former difficulty picker without requiring a selection', () => {
  mockStorage.set('blockit.microlearning.last.v1', JSON.stringify({ ...lessons[0], difficulty: 3, seenIds: [lessons[0].id] }));
  expect(readLearningProgress()).toEqual({ last: { id: lessons[0].id, mechanic: lessons[0].mechanic }, seenIds: [lessons[0].id] });
});

test('random selection avoids repeating the previous mechanic', () => {
  for (const previous of lessons) {
    for (const random of [0, 0.2, 0.5, 0.999]) {
      const next = pickLesson(previous, () => random);
      expect(next.mechanic).not.toBe(previous.mechanic);
    }
  }
});

test('remembers the last mechanic and handles malformed stored data', () => {
  expect(readLastLesson()).toBeNull();
  saveLastLesson(lessons[0]);
  expect(readLastLesson()).toEqual({ id: lessons[0].id, mechanic: lessons[0].mechanic });
  mockStorage.set('blockit.microlearning.last.v1', '{broken');
  expect(readLastLesson()).toBeNull();
});
