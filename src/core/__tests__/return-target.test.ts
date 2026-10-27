import { getReturnTarget, setReturnTarget, finishAndReturn } from '../../features/intervention/return-target';
import { openGuardedTargetApp } from '../../features/intervention/open-target-app';
import { screenTime } from '../../features/screen-time/client';

const mockStorage = new Map<string, string>();
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: {
  getString: (key: string) => mockStorage.get(key) ?? null,
  setString: (key: string, value: string) => mockStorage.set(key, value),
} }));
jest.mock('../../features/screen-time/client', () => ({ screenTime: { finish: jest.fn() } }));
jest.mock('../../features/intervention/open-target-app', () => ({ openGuardedTargetApp: jest.fn() }));

beforeEach(() => { mockStorage.clear(); jest.resetAllMocks(); });

it('remembers the chosen target per opaque app token and allows turning return off', () => {
  setReturnTarget('opaque-a', 'instagram');
  setReturnTarget('opaque-b', 'youtube');
  expect(getReturnTarget('opaque-a')).toBe('instagram');
  expect(getReturnTarget('opaque-b')).toBe('youtube');
  setReturnTarget('opaque-a', null);
  expect(getReturnTarget('opaque-a')).toBeNull();
  expect(getReturnTarget('opaque-b')).toBe('youtube');
});

it('waits for native access before opening the selected app', async () => {
  setReturnTarget('opaque', 'instagram');
  let grant!: () => void;
  jest.mocked(screenTime.finish).mockImplementation(() => new Promise<void>(resolve => { grant = resolve; }));
  jest.mocked(openGuardedTargetApp).mockResolvedValue(true);
  const result = finishAndReturn('request', '', 'opaque');
  expect(openGuardedTargetApp).not.toHaveBeenCalled();
  grant();
  await expect(result).resolves.toBe(true);
  expect(openGuardedTargetApp).toHaveBeenCalledWith('instagram');
});

it('never opens the target if native access is rejected', async () => {
  setReturnTarget('opaque', 'youtube');
  jest.mocked(screenTime.finish).mockRejectedValue(new Error('expired request'));
  await expect(finishAndReturn('old', '', 'opaque')).rejects.toThrow('expired request');
  expect(openGuardedTargetApp).not.toHaveBeenCalled();
});

it('does not guess the app represented by a private Screen Time token', async () => {
  jest.mocked(screenTime.finish).mockResolvedValue(undefined);
  await expect(finishAndReturn('request', '', 'unmapped')).resolves.toBe(false);
  expect(openGuardedTargetApp).not.toHaveBeenCalled();
});
