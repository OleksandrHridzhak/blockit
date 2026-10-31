import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useLearningSession } from './useLearningSession';
import { screenTime } from '@/features/screen-time/client';
import { finishAndReturn, getReturnTarget } from '@/features/intervention/return-target';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: () => ({ request: 'current' }) }));
jest.mock('@/features/screen-time/client', () => ({ screenTime: { startMicrolearning: jest.fn(), pending: jest.fn(), activeAccess: jest.fn() } }));
jest.mock('@/features/curiosity/storage', () => ({ interventionDestination: () => '/curiosity' }));
jest.mock('@/features/intervention/return-target', () => ({ finishAndReturn: jest.fn(), getReturnTarget: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  jest.mocked(screenTime.startMicrolearning).mockResolvedValue({ id: 'current', mode: 'microlearning', readyAt: Date.now() + 1000, appId: 'opaque-token' });
  jest.mocked(screenTime.pending).mockResolvedValue({ id: 'current', mode: 'microlearning', readyAt: Date.now() + 1000, appId: 'opaque-token' });
  jest.mocked(screenTime.activeAccess).mockResolvedValue(null);
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

it('resumes the existing deadline without starting the pause again', async () => {
  jest.mocked(screenTime.pending).mockResolvedValue({ id: 'current', mode: 'microlearning', readyAt: Date.now() + 5000, appId: 'opaque-token' });
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(result.current.appId).toBe('opaque-token'));
  expect(screenTime.startMicrolearning).not.toHaveBeenCalled();
  expect(result.current.ready).toBe(false);
});

it('starts a new learning timer only when its deadline is unset', async () => {
  jest.mocked(screenTime.pending).mockResolvedValueOnce({ id: 'current', mode: 'microlearning', readyAt: 0, appId: 'opaque-token' });
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(result.current.appId).toBe('opaque-token'));
  expect(screenTime.startMicrolearning).toHaveBeenCalledTimes(1);
  expect(screenTime.startMicrolearning).toHaveBeenCalledWith('current');
});

it('replaces the stale screen with the current request on foreground', async () => {
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(result.current.appId).toBe('opaque-token'));
  jest.mocked(screenTime.pending).mockResolvedValue({ id: 'new', mode: 'microlearning-v2', readyAt: 0 });
  const listener = jest.mocked(AppState.addEventListener).mock.calls[0][1];
  await act(async () => { listener('active'); });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/microlearning-v2', params: { request: 'new' } });
  expect(result.current.ready).toBe(false);
  expect(finishAndReturn).not.toHaveBeenCalled();
});

it('recovers an already granted session instead of restarting it', async () => {
  jest.mocked(screenTime.pending).mockResolvedValue(null);
  jest.mocked(screenTime.activeAccess).mockResolvedValue({ id: 'granted', mode: 'countdown', readyAt: 0 });
  await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/intervene', params: { request: 'granted' } }));
  expect(screenTime.startMicrolearning).not.toHaveBeenCalled();
});

it('does not finish an old request replaced while the screen was open', async () => {
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(result.current.appId).toBe('opaque-token'));
  jest.mocked(screenTime.pending).mockResolvedValue({ id: 'new', mode: 'microlearning', readyAt: 0 });
  await act(async () => { jest.advanceTimersByTime(1500); });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/microlearning', params: { request: 'new' } });
  expect(finishAndReturn).not.toHaveBeenCalled();
});

it('recovers when the native request changes during finish', async () => {
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(result.current.appId).toBe('opaque-token'));
  jest.mocked(finishAndReturn).mockImplementationOnce(async () => {
    jest.mocked(screenTime.pending).mockResolvedValue({ id: 'replacement', mode: 'microlearning', readyAt: Date.now() + 60000 });
    throw new Error('stale request');
  });
  await act(async () => { jest.advanceTimersByTime(1500); });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/microlearning', params: { request: 'replacement' } });
  expect(result.current.error).toBe('');
  expect(result.current.ready).toBe(false);
});

it('leaves an expired request without offering to finish it again', async () => {
  jest.mocked(screenTime.pending).mockResolvedValue(null);
  const { result } = await renderHook(() => useLearningSession('microlearning'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(result.current.ready).toBe(false);
  expect(finishAndReturn).not.toHaveBeenCalled();
});
