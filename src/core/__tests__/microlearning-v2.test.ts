import { v2Lessons } from '../../features/microlearning/v2/content';
import { chooseV2Lesson, readV2Progress, recordV2Event, shuffledAnswers } from '../../features/microlearning/v2/progress';

const mockStorage = new Map<string, string>();
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: {
  getString: (key: string) => mockStorage.get(key) ?? null,
  setString: (key: string, value: string) => mockStorage.set(key, value),
} }));
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000_000_000_000;
beforeEach(() => mockStorage.clear());

it('has twelve anchor cards, six mechanics and two contexts for every principle', () => {
  expect(v2Lessons).toHaveLength(12);
  expect(new Set(v2Lessons.map(lesson => lesson.id)).size).toBe(12);
  expect(new Set(v2Lessons.map(lesson => lesson.mechanic)).size).toBe(6);
  for (const lesson of v2Lessons) {
    expect(v2Lessons.filter(item => item.concept === lesson.concept)).toHaveLength(2);
    expect(lesson.situation.length).toBeLessThan(180);
    if (lesson.mechanic !== 'rabbit') {
      expect(lesson.answers).toHaveLength(2);
      expect(lesson.answers?.filter(answer => answer.helpful)).toHaveLength(1);
      expect(lesson.answers?.every(answer => answer.label.length < 100 && answer.explanation.length > 30)).toBe(true);
    } else {
      expect(lesson.example).toBeDefined();
      expect(lesson.deepDive?.paragraphs.length).toBeGreaterThanOrEqual(3);
    }
  }
});

it('shows every new card before reusing one when no reviews are due', () => {
  const ids = new Set<string>();
  for (let i = 0; i < v2Lessons.length; i++) {
    const { lesson, review } = chooseV2Lesson(readV2Progress(), NOW + i * 2000, () => 0.5);
    expect(ids.has(lesson.id)).toBe(false);
    expect(review).toBe(false);
    ids.add(lesson.id); recordV2Event(lesson, 'shown', { now: NOW + i * 2000 });
  }
  expect(ids.size).toBe(12);
});

it('keeps impressions and skips separate from learning and v1 progress', () => {
  const lesson = v2Lessons[0];
  mockStorage.set('blockit.microlearning.last.v1', 'untouched');
  recordV2Event(lesson, 'shown', { now: NOW });
  recordV2Event(lesson, 'skipped', { now: NOW + 100 });
  const progress = readV2Progress();
  expect(progress.cards[lesson.id].shows).toBe(1);
  expect(progress.cards[lesson.id].answeredAt).toBeUndefined();
  expect(progress.reviews[lesson.concept]).toBeUndefined();
  expect(mockStorage.get('blockit.microlearning.last.v1')).toBe('untouched');
});

it('returns a due principle in another context after two other exposures', () => {
  const first = v2Lessons.find(lesson => lesson.id === 'v2-export')!;
  recordV2Event(first, 'shown', { now: NOW });
  recordV2Event(first, 'answered', { now: NOW, helpful: true });
  for (const lesson of v2Lessons.filter(lesson => lesson.concept !== first.concept).slice(0, 2)) recordV2Event(lesson, 'shown', { now: NOW + 2000 });
  expect(chooseV2Lesson(readV2Progress(), NOW + DAY - 1, () => 0).review).toBe(false);
  const picked = chooseV2Lesson(readV2Progress(), NOW + DAY, () => 0);
  expect(picked.review).toBe(true);
  expect(picked.lesson.concept).toBe(first.concept);
  expect(picked.lesson.id).not.toBe(first.id);
});

it('reading an explanation schedules review but does not count as a correct answer', () => {
  const lesson = v2Lessons[0];
  recordV2Event(lesson, 'explanationOpened', { now: NOW });
  expect(readV2Progress().cards[lesson.id].answeredAt).toBeUndefined();
  expect(readV2Progress().reviews[lesson.concept]).toMatchObject({ step: 0, dueAt: NOW + DAY });
  const alternate = v2Lessons.find(item => item.concept === lesson.concept && item.id !== lesson.id)!;
  recordV2Event(alternate, 'explanationOpened', { now: NOW + DAY });
  expect(readV2Progress().reviews[lesson.concept]).toMatchObject({ step: 0, dueAt: NOW + 2 * DAY, lastLessonId: alternate.id });
  expect(readV2Progress().cards[alternate.id].answeredAt).toBeUndefined();
});

it('advances spacing only after a helpful answer in another context after a delay', () => {
  const first = v2Lessons.find(lesson => lesson.id === 'v2-owner')!;
  const second = v2Lessons.find(lesson => lesson.id === 'v2-teacher')!;
  recordV2Event(first, 'answered', { now: NOW, helpful: true });
  recordV2Event(first, 'answered', { now: NOW + 100, helpful: true });
  expect(readV2Progress().reviews[first.concept]?.step).toBe(0);
  const reviewTime = NOW + DAY + 1000;
  recordV2Event(second, 'answered', { now: reviewTime, helpful: true });
  expect(readV2Progress().reviews[first.concept]).toMatchObject({ step: 1, dueAt: reviewTime + 3 * DAY });
  recordV2Event(second, 'explanationOpened', { now: reviewTime + 100 });
  expect(readV2Progress().reviews[first.concept]?.dueAt).toBe(reviewTime + 3 * DAY);
  recordV2Event(first, 'answered', { now: reviewTime + 200, helpful: false });
  expect(readV2Progress().reviews[first.concept]?.step).toBe(0);
});

it('deduplicates immediate remounts and limits the event history', () => {
  const lesson = v2Lessons[0];
  recordV2Event(lesson, 'shown', { now: NOW });
  recordV2Event(lesson, 'shown', { now: NOW + 100 });
  expect(readV2Progress().cards[lesson.id].shows).toBe(1);
  for (let i = 0; i < 220; i++) recordV2Event(lesson, 'skipped', { now: NOW + i });
  expect(readV2Progress().events).toHaveLength(200);
});

it('handles malformed local state and balances answer order without changing correctness', () => {
  mockStorage.set('blockit.microlearning.v2', '{broken');
  expect(readV2Progress().cards).toEqual({});
  const lesson = v2Lessons[0];
  expect(shuffledAnswers(lesson, () => 0)).toEqual(lesson.answers);
  expect(shuffledAnswers(lesson, () => 0.9)).toEqual([...lesson.answers!].reverse());
});
