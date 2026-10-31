import { curiosityStories } from '../../features/curiosity/content';
import { curiosityEnabled, interventionDestination, normalizeCuriosity, readCuriosity, setGroupCuriosity, toggleSavedStory } from '../../features/curiosity/storage';
import { finishCuriositySession } from '../../features/curiosity/session-actions';
import { screenTime } from '../../features/screen-time/client';

const mockValues = new Map<string, string>();
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: {
  getString: (key: string) => mockValues.get(key) ?? null,
  setString: (key: string, value: string) => mockValues.set(key, value),
} }));
jest.mock('../../features/screen-time/client', () => ({ screenTime: { pending: jest.fn(), cancel: jest.fn() } }));

beforeEach(() => { mockValues.clear(); jest.clearAllMocks(); });
describe('optional Curiosity integration', () => {
  it('keeps the standard intervention as the default', () => {
    expect(curiosityEnabled()).toBe(false);
    expect(curiosityEnabled('legacy')).toBe(false);
    expect(interventionDestination('legacy')).toBe('/intervene');
  });
  it('persists an opt-in for one group and can turn it off', () => {
    setGroupCuriosity('social', true);
    expect(interventionDestination('social')).toBe('/curiosity');
    expect(interventionDestination('work')).toBe('/intervene');
    setGroupCuriosity('social', false);
    expect(interventionDestination('social')).toBe('/intervene');
  });
  it('saves stories without enabling the intervention', () => {
    toggleSavedStory('three-hearts');
    expect(readCuriosity().saved).toEqual(['three-hearts']);
    expect(curiosityEnabled('social')).toBe(false);
    toggleSavedStory('three-hearts');
    expect(readCuriosity().saved).toEqual([]);
  });
  it('uses the group preference even when an app previously had its own setting', () => {
    setGroupCuriosity('social', true);
    expect(interventionDestination('social', 'instagram-token')).toBe('/curiosity');
    setGroupCuriosity('app:instagram-token', false);
    expect(interventionDestination('social', 'instagram-token')).toBe('/curiosity');
    expect(interventionDestination('social', 'other-token')).toBe('/curiosity');
  });
  it('uses a solo application preference without changing group settings', () => {
    setGroupCuriosity('app:instagram-token', true);
    expect(interventionDestination('legacy', 'instagram-token')).toBe('/curiosity');
    expect(interventionDestination('social', 'instagram-token')).toBe('/intervene');
    expect(interventionDestination('social', 'other-token')).toBe('/intervene');
  });
  it('handles malformed stored preferences without enabling anything', () => {
    mockValues.set('blockit.curiosity.v1', '{broken');
    expect(interventionDestination('social')).toBe('/intervene');
    expect(normalizeCuriosity({ enabled: 'true', groups: { social: 'yes' }, saved: [null, 'x', 'x'] })).toEqual({ enabled: false, groups: {}, saved: ['x'] });
  });
  it('never touches a real request in preview', async () => {
    await finishCuriositySession('request', true);
    expect(screenTime.pending).not.toHaveBeenCalled();
    expect(screenTime.cancel).not.toHaveBeenCalled();
  });
  it('does not cancel a newer or completed request', async () => {
    jest.mocked(screenTime.pending).mockResolvedValue({ id: 'new', readyAt: 0, mode: 'countdown' });
    await finishCuriositySession('old', false);
    expect(screenTime.cancel).not.toHaveBeenCalled();
    jest.mocked(screenTime.pending).mockResolvedValue(null);
    await finishCuriositySession('old', false);
    expect(screenTime.cancel).not.toHaveBeenCalled();
  });
  it('uses the existing cancellation when ending the active session', async () => {
    jest.mocked(screenTime.pending).mockResolvedValue({ id: 'current', readyAt: 0, mode: 'typing' });
    await finishCuriositySession('current', false);
    expect(screenTime.cancel).toHaveBeenCalledTimes(1);
  });
});
describe('local discovery collection', () => {
  it('has a finite collection, several topics and complete sourced articles', () => {
    expect(curiosityStories).toHaveLength(8);
    expect(new Set(curiosityStories.map(story => story.id)).size).toBe(8);
    expect(new Set(curiosityStories.map(story => story.category)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(curiosityStories.map(story => story.discovery.kind)).size).toBe(3);
    for (const story of curiosityStories) {
      expect(story.hook.length).toBeGreaterThan(20);
      expect(story.deepDive.paragraphs.length).toBeGreaterThanOrEqual(2);
      const article = story.article.intro + ' ' + story.article.sections.flatMap(section => section.paragraphs).join(' ');
      expect(article.split(/\s+/).length).toBeGreaterThanOrEqual(240);
      expect(story.article.sections.length).toBeGreaterThanOrEqual(4);
      expect(story.sources.length).toBeGreaterThanOrEqual(2);
      expect(story.sources.every(source => source.url.startsWith('https://'))).toBe(true);
    }
  });
});

