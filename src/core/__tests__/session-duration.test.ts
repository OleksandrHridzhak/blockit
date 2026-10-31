import { formatSessionDuration, isSessionMinutes, parseSessionMinutes, sessionMinutesOr } from '../session-duration';

it('preserves second-based access and displays whole seconds', () => {
  for (const seconds of [1, 2, 30, 59, 61, 125, 86400]) {
    expect(sessionMinutesOr(seconds / 60)).toBe(seconds / 60);
  }
  expect(isSessionMinutes(0)).toBe(false);
  expect(isSessionMinutes(0.001)).toBe(false);
  expect(isSessionMinutes(1440 + 1 / 60)).toBe(false);
  expect(formatSessionDuration(0.5)).toBe('30 с');
  expect(formatSessionDuration(1 / 60)).toBe('1 с');
  expect(formatSessionDuration(2)).toBe('2 хв');
});

it('accepts custom whole-minute durations instead of a fixed list', () => {
  expect(parseSessionMinutes('7')).toBe(7);
  expect(parseSessionMinutes('37', 15)).toBe(37);
  expect(parseSessionMinutes(' 120 ')).toBe(120);
  expect(sessionMinutesOr(17)).toBe(17);
  expect(isSessionMinutes(1440)).toBe(true);
});

it('rejects empty, fractional, exponential and out-of-range values', () => {
  for (const value of ['', '0', '-2', '1.5', '3e1', '1441', 'abc']) expect(parseSessionMinutes(value)).toBeNull();
  expect(parseSessionMinutes('14', 15)).toBeNull();
  expect(parseSessionMinutes('15', 15)).toBe(15);
  expect(sessionMinutesOr(NaN)).toBe(5);
});
