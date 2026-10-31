import { loadProtectionView } from '../../features/preview/store';
import { screenTime } from '../../features/screen-time/client';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: { getString: () => null } }));
jest.mock('../../features/screen-time/client', () => ({ screenTime: { status: jest.fn(), selectedApps: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(screenTime.status).mockResolvedValue({ available: true, authorization: 'approved', notifications: true, count: 2, enabled: true, seconds: 20, mode: 'countdown', grantUntil: 0 });
});
it('uses actual selected applications and their effective rules on iPhone', async () => {
  jest.mocked(screenTime.selectedApps).mockResolvedValue([
    { id: 'opaque-first', seconds: 10, mode: 'typing' },
    { id: 'opaque-second', seconds: 60, mode: 'reflection' },
  ]);
  const view = await loadProtectionView();
  expect(view.demo).toBe(false);
  expect(view.apps).toEqual(['opaque-first', 'opaque-second']);
  expect(view.appRules).toEqual({ 'opaque-first': { seconds: 10, mode: 'typing' }, 'opaque-second': { seconds: 60, mode: 'reflection' } });
});
it('surfaces a failed native selection read instead of presenting a noneditable count', async () => {
  jest.mocked(screenTime.selectedApps).mockRejectedValue(new Error('Read failed'));
  await expect(loadProtectionView()).rejects.toThrow('Read failed');
});
