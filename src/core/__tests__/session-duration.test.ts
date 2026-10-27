import { isSessionMinutes, parseSessionMinutes, sessionMinutesOr } from '../session-duration';

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
