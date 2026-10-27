import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useLearningSession } from './useLearningSession';
import { screenTime } from '@/features/screen-time/client';
import { finishAndReturn, getReturnTarget } from '@/features/intervention/return-target';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: () => ({ request: 'current' }) }));
jest.mock('@/features/screen-time/client', () => ({ screenTime: { startMicrolearning: jest.fn() } }));
jest.mock('@/features/intervention/return-target', () => ({ finishAndReturn: jest.fn(), getReturnTarget: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  jest.mocked(screenTime.startMicrolearning).mockResolvedValue({ id: 'current', mode: 'microlearning', readyAt: Date.now() + 1000, appId: 'opaque-token' });
  jest.mocked(getReturnTarget).mockReturnValue('instagram');
  jest.mocked(finishAndReturn).mockResolvedValue(true);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('returns once after the pause ends while Blockit is in the foreground', async () => {
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(result.current.appId).toBe('opaque-token'));
  expect(finishAndReturn).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1500); });
  expect(finishAndReturn).toHaveBeenCalledTimes(1);
  expect(finishAndReturn).toHaveBeenCalledWith('current', '', 'opaque-token');
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(finishAndReturn).toHaveBeenCalledTimes(1);
});

it('does not launch an app while Blockit is in the background', async () => {
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(result.current.appId).toBe('opaque-token'));
  AppState.currentState = 'background';
  await act(async () => { jest.advanceTimersByTime(1500); });
  expect(result.current.ready).toBe(true);
  expect(finishAndReturn).not.toHaveBeenCalled();
});
