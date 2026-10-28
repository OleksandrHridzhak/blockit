import { groupsService } from '../../features/groups/service';
import { screenTime, type AppGroup } from '../../features/screen-time/client';
import { getAppRule, saveAppRule } from '../../features/preview/store';

const mockStorage = new Map<string, string>();
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: {
  getString: (key: string) => mockStorage.get(key) ?? null,
  setString: (key: string, value: string) => mockStorage.set(key, value),
} }));
jest.mock('../../features/screen-time/client', () => ({ screenTime: { status: jest.fn(), saveGroup: jest.fn(), pickGroup: jest.fn() } }));

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  jest.mocked(screenTime.status).mockResolvedValue({ available: false, authorization: 'notDetermined', notifications: false, count: 0, enabled: false, seconds: 20, mode: 'countdown', grantUntil: 0 });
});

it('retains the same advanced preview settings as a standalone app when a group is reopened', async () => {
  const group: AppGroup = {
    id: 'social', name: 'Соцмережі', seconds: 30, mode: 'countdown', appIds: ['instagram'],
    previewRule: { seconds: 30, mode: 'math', sessionMinutes: 17, escalating: true, mathRounds: 4, stroopRounds: 7, codeLength: 9 },
  };
  await groupsService.save(group, true);
  expect((await groupsService.load()).groups[0]).toEqual(group);
  expect(screenTime.saveGroup).not.toHaveBeenCalled();
});

it('reopens a standalone app with an individually entered session duration', () => {
  saveAppRule('instagram', { seconds: 20, mode: 'typing', sessionMinutes: 37, escalating: true, mathRounds: 4, stroopRounds: 7, codeLength: 9 });
  expect(getAppRule('instagram')).toMatchObject({ sessionMinutes: 37, escalating: true, mathRounds: 4, stroopRounds: 7, codeLength: 9 });
});

it('retains second-based access for standalone apps and groups after saving', async () => {
  saveAppRule('instagram', { seconds: 20, mode: 'countdown', sessionMinutes: 1 / 60 });
  expect(getAppRule('instagram').sessionMinutes).toBe(1 / 60);
  const group: AppGroup = { id: 'seconds', name: 'Група 1', seconds: 20, mode: 'countdown', appIds: ['youtube'], sessionMinutes: 0.5,
    previewRule: { seconds: 20, mode: 'countdown', sessionMinutes: 0.5 } };
  await groupsService.save(group, true);
  expect((await groupsService.load()).groups.find(item => item.id === 'seconds')).toEqual(group);
});

it('persists microlearning as a distinct mode for an app and a group', async () => {
  saveAppRule('instagram', { seconds: 30, mode: 'microlearning' });
  expect(getAppRule('instagram')).toMatchObject({ seconds: 30, mode: 'microlearning' });
  const group: AppGroup = { id: 'learn', name: 'Навчання', seconds: 10, mode: 'microlearning', appIds: ['youtube'] };
  await groupsService.save(group, true);
  expect((await groupsService.load()).groups).toEqual([group]);
});

it('keeps v2 rules distinct from the original learning mode', async () => {
  saveAppRule('instagram', { seconds: 20, mode: 'microlearning-v2' });
  expect(getAppRule('instagram').mode).toBe('microlearning-v2');
  const group: AppGroup = { id: 'v2', name: 'V2', seconds: 30, mode: 'microlearning-v2', appIds: ['youtube'] };
  await groupsService.save(group, true);
  expect((await groupsService.load()).groups[0].mode).toBe('microlearning-v2');
});

it('keeps advanced settings on other groups when membership changes', async () => {
  const first: AppGroup = { id: 'a', name: 'A', seconds: 20, mode: 'typing', appIds: ['instagram', 'youtube'],
    previewRule: { seconds: 20, mode: 'breathing', sessionMinutes: 2 } };
  await groupsService.save(first, true);
  await groupsService.save({ id: 'b', name: 'B', seconds: 10, mode: 'reflection', appIds: ['instagram'] }, true);
  const groups = (await groupsService.load()).groups;
  expect(groups[0]).toEqual({ ...first, appIds: ['youtube'] });
  expect(groups[1].appIds).toEqual(['instagram']);
});
