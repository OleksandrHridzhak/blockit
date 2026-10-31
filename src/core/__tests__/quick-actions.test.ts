import { activeOverride, loadOverrides, setOverride } from '../../features/groups/quick-actions';
import { screenTime } from '../../features/screen-time/client';

const mockStorage = new Map<string, string>();
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: {
  getString: (key: string) => mockStorage.get(key) ?? null,
  setString: (key: string, value: string) => mockStorage.set(key, value),
} }));
jest.mock('../../features/screen-time/client', () => ({ screenTime: { protectionOverrides: jest.fn(), setProtectionOverride: jest.fn() } }));

beforeEach(() => { mockStorage.clear(); jest.clearAllMocks(); jest.spyOn(Date, 'now').mockReturnValue(1000000); });
afterEach(() => jest.restoreAllMocks());

it('suspends one app without changing another app or group and survives reload', async () => {
  await setOverride(true, 'app:instagram', 15);
  await setOverride(true, 'group:work', -1);
  const values = await loadOverrides(true);
  expect(values).toEqual({ 'app:instagram': 1900000, 'group:work': 0 });
  expect(activeOverride(values, 'app:youtube')).toBeUndefined();
  await setOverride(true, 'app:instagram', 0);
  expect(await loadOverrides(true)).toEqual({ 'group:work': 0 });
});

it('expires a temporary override at its deadline while keeping manual disable', async () => {
  await setOverride(true, 'app:instagram', 1);
  await setOverride(true, 'group:work', -1);
  const values = await loadOverrides(true);
  expect(activeOverride(values, 'app:instagram', 1060000)).toBeUndefined();
  jest.spyOn(Date, 'now').mockReturnValue(1060000);
  expect(await loadOverrides(true)).toEqual({ 'group:work': 0 });
});

it('routes native actions to the bridge and rejects unsupported durations', async () => {
  await setOverride(false, 'group:work', 7);
  expect(screenTime.setProtectionOverride).toHaveBeenCalledWith('group:work', 7);
  for (const value of [-2, 1.5, 1441, NaN]) await expect(setOverride(true, 'app:instagram', value)).rejects.toThrow();
  expect(mockStorage.size).toBe(0);
});
