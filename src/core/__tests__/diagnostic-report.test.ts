import { Share } from 'react-native';
import { screenTime } from '../../features/screen-time/client';
import { diagnosticJournal } from '../../features/diagnostics/journal';
import { shareDiagnosticReport } from '../../features/diagnostics/report';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, Share: { share: jest.fn() } }));
jest.mock('../../features/screen-time/client', () => ({ screenTime: {
  diagnostics: jest.fn(), canShareDiagnosticFile: jest.fn(), shareDiagnosticFile: jest.fn(),
} }));
jest.mock('../../features/diagnostics/journal', () => ({ diagnosticJournal: {
  record: jest.fn(), flush: jest.fn(), snapshot: jest.fn(),
} }));
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  jest.mocked(diagnosticJournal.snapshot).mockReturnValue({ schema: 1, session: 'current', enabled: true,
    dropped: 4, storageError: '', limits: { entries: 2000, bytes: 2_000_000 },
    entries: [{ time: 1500, sequence: 1, session: 'previous', level: 'error', event: 'javascript-error' }] });
  jest.mocked(screenTime.canShareDiagnosticFile).mockReturnValue(true);
  jest.mocked(screenTime.shareDiagnosticFile).mockResolvedValue(undefined);
  jest.mocked(Share.share).mockResolvedValue({ action: 'sharedAction', activityType: undefined });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('exports all retained native and JS events chronologically as a file', async () => {
  jest.mocked(screenTime.diagnostics).mockResolvedValue(JSON.stringify({ build: 'test',
    trace: Array.from({ length: 100 }, (_, i) => ({ time: i + 1, event: `native-${i}`, detail: 'full detail', process: 'extension' })) }));
  await shareDiagnosticReport();
  const report = JSON.parse(jest.mocked(screenTime.shareDiagnosticFile).mock.calls[0][0]);
  expect(report.timeline).toHaveLength(101);
  expect(report.timeline.slice(0, 3).map((entry: { time: number }) => entry.time)).toEqual([1000, 1500, 2000]);
  expect(report.timeline.at(-1)).toMatchObject({ event: 'native-99', detail: 'full detail' });
  expect(report.javascript.dropped).toBe(4);
  expect(report.native.build).toBe('test');
  expect(Share.share).not.toHaveBeenCalled();
});
it('still exports JS history on older builds with unavailable native diagnostics', async () => {
  jest.mocked(screenTime.diagnostics).mockRejectedValue(new Error('Old native module'));
  jest.mocked(screenTime.canShareDiagnosticFile).mockReturnValue(false);
  await shareDiagnosticReport();
  const report = JSON.parse(jest.mocked(Share.share).mock.calls[0][0].message!);
  expect(report.native.unavailable).toBe('Old native module');
  expect(report.timeline[0].event).toBe('javascript-error');
});
it('keeps export usable when native diagnostics never finish', async () => {
  jest.mocked(screenTime.diagnostics).mockReturnValue(new Promise(() => {}));
  const sharing = shareDiagnosticReport();
  await jest.advanceTimersByTimeAsync(8000);
  await sharing;
  const report = JSON.parse(jest.mocked(screenTime.shareDiagnosticFile).mock.calls[0][0]);
  expect(report.native.unavailable).toContain('8 секунд');
  expect(report.timeline).toHaveLength(1);
});
