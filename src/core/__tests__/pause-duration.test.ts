import { parsePauseSeconds, pauseDurationText } from '../pause-duration';

it('preserves short pauses and converts minutes to stored seconds', () => {
  expect(parsePauseSeconds('10', 'seconds')).toBe(10);
  expect(parsePauseSeconds('30', 'seconds')).toBe(30);
  expect(parsePauseSeconds('2', 'minutes')).toBe(120);
  expect(parsePauseSeconds('0,5', 'minutes')).toBe(30);
});

it('preserves duration when switching units, including sub-minute values', () => {
  for (const seconds of [1, 10, 20, 30, 59, 60, 90, 86400]) {
    expect(parsePauseSeconds(pauseDurationText(seconds, 'minutes'), 'minutes')).toBe(seconds);
    expect(parsePauseSeconds(pauseDurationText(seconds, 'seconds'), 'seconds')).toBe(seconds);
  }
});

it('rejects invalid or out-of-range durations', () => {
  for (const text of ['', '0', '-1', '1.5', '1e2', '86401', 'abc']) expect(parsePauseSeconds(text, 'seconds')).toBeNull();
  for (const text of ['', '0', '0.001', '1440.01', 'Infinity', '1e2']) expect(parsePauseSeconds(text, 'minutes')).toBeNull();
});
