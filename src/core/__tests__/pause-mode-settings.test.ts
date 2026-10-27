import { challengeCodeLength, challengeRounds, hasPauseTimer, isMicrolearning, microlearningRoute } from '../pause-mode-settings';
import { getEffectiveSeconds } from '../../features/preview/store';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../../modules/blockit-bridge', () => ({ BlockitBridge: { getString: () => null } }));
jest.mock('../../features/screen-time/client', () => ({ screenTime: {} }));

it('uses a timer only for timed modes', () => {
  expect(hasPauseTimer('countdown')).toBe(true);
  expect(hasPauseTimer('breathing')).toBe(true);
  expect(hasPauseTimer('microlearning')).toBe(true);
  expect(hasPauseTimer('microlearning-v2')).toBe(true);
  for (const mode of ['typing', 'reflection', 'passcode', 'math', 'stroop'] as const) {
    expect(hasPauseTimer(mode)).toBe(false);
    expect(getEffectiveSeconds({ mode, seconds: 60, escalating: true, todayOpens: 10 })).toBe(0);
  }
});

it('routes the two learning variants independently', () => {
  expect(isMicrolearning('microlearning-v2')).toBe(true);
  expect(isMicrolearning('typing')).toBe(false);
  expect(microlearningRoute('microlearning')).toBe('/microlearning');
  expect(microlearningRoute('microlearning-v2')).toBe('/microlearning-v2');
});

it('escalates only the countdown and preserves a fixed breathing duration', () => {
  expect(getEffectiveSeconds({ mode: 'countdown', seconds: 20, escalating: true, todayOpens: 3 })).toBe(35);
  expect(getEffectiveSeconds({ mode: 'breathing', seconds: 20, escalating: true, todayOpens: 3 })).toBe(20);
});

it('bounds mode-specific challenge parameters', () => {
  expect(challengeRounds(7)).toBe(7);
  expect(challengeRounds(0)).toBe(3);
  expect(challengeRounds(11)).toBe(3);
  expect(challengeCodeLength(12)).toBe(12);
  expect(challengeCodeLength(3)).toBe(6);
  expect(challengeCodeLength(NaN)).toBe(6);
});
