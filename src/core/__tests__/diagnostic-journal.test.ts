import { createDiagnosticJournal, diagnosticData, instrumentDiagnosticMethods, JOURNAL_LIMIT } from '../diagnostic-journal';

let saved: string | null;
const storage = { read: () => saved, write: (value: string) => { saved = value; } };
beforeEach(() => { jest.useFakeTimers(); saved = null; });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('persists errors immediately and restores previous sessions after restart', () => {
  const journal = createDiagnosticJournal(storage);
  journal.setRoute('/intervene');
  journal.record('failure', new Error('Native service unavailable'), 'error');
  const restored = createDiagnosticJournal(storage).snapshot();
  expect(restored.entries).toHaveLength(2);
  expect(restored.entries[1]).toMatchObject({ event: 'failure', route: '/intervene', data: { message: 'Native service unavailable' } });
  expect((restored.entries[1].data as { stack: string }).stack).toContain('Error:');
});
it('batches ordinary writes and bounds retained entries', () => {
  const journal = createDiagnosticJournal(storage);
  for (let i = 0; i < JOURNAL_LIMIT + 8; i++) journal.record('tick', { i });
  expect(saved).toBeNull();
  jest.advanceTimersByTime(750);
  expect(JSON.parse(saved!).entries).toHaveLength(JOURNAL_LIMIT);
  expect(journal.snapshot().dropped).toBe(8);
});
it('bounds serialized bytes and handles circular or hostile diagnostic objects', () => {
  const journal = createDiagnosticJournal(storage);
  const circular: { self?: unknown } = {}; circular.self = circular;
  expect(diagnosticData(circular)).toEqual({ self: '[circular]' });
  expect(diagnosticData(Object.defineProperty({}, 'value', { enumerable: true, get() { throw Error('getter'); } }))).toBe('[unserializable]');
  for (let i = 0; i < 500; i++) journal.record('large', { a: 'a'.repeat(4000), b: 'b'.repeat(4000), c: 'c'.repeat(4000) });
  journal.flush();
  expect(saved!.length * 2).toBeLessThanOrEqual(2_000_000);
  expect(journal.snapshot().dropped).toBeGreaterThan(0);
});
it('redacts secrets, response bodies, answers, URL query values and email addresses', () => {
  const result = JSON.stringify(diagnosticData({ Authorization: 'Bearer private', answer: 'typed response',
    body: 'private payload', nested: { password: 'secret123' }, url: 'https://example.com?a=private&b=secret',
    message: 'Bearer hidden-token person@example.com' }));
  for (const secret of ['private', 'typed response', 'private payload', 'secret123', 'hidden-token', 'person@example.com']) expect(result).not.toContain(secret);
});
it('keeps operating with broken storage and supports disabling and clearing', () => {
  const journal = createDiagnosticJournal({ read() { throw Error('storage'); }, write() { throw Error('disk'); } });
  expect(() => journal.record('error', {}, 'error')).not.toThrow();
  expect(journal.snapshot().storageError).toContain('persistence failed');
  journal.setEnabled(false);
  const count = journal.snapshot().entries.length;
  journal.record('must-not-appear');
  expect(journal.snapshot().entries).toHaveLength(count);
  journal.clear(); expect(journal.snapshot().entries).toEqual([]);
});
it('captures handled async failures and synchronous throws while preserving the original error', async () => {
  const journal = createDiagnosticJournal(storage);
  const error = new Error('native failed');
  const client = instrumentDiagnosticMethods({ async finish(_id: string, _answer: string) { throw error; },
    status() { throw error; } }, journal);
  await expect(client.finish('request-id', 'PRIVATE ANSWER')).rejects.toBe(error);
  expect(() => client.status()).toThrow(error);
  expect(journal.snapshot().entries.filter(entry => entry.level === 'error')).toHaveLength(2);
  expect(saved).not.toContain('PRIVATE ANSWER');
});
it('records slow operations without cancelling them and preserves sync and async return values', async () => {
  const journal = createDiagnosticJournal(storage);
  let resolve!: (value: number) => void;
  const client = instrumentDiagnosticMethods({ status: () => new Promise<number>(done => { resolve = done; }), pick: () => true }, journal);
  const pending = client.status();
  jest.advanceTimersByTime(5000);
  expect(journal.snapshot().entries.some(entry => entry.event === 'screen-time.status.slow')).toBe(true);
  resolve(42); await expect(pending).resolves.toBe(42);
  expect(client.pick()).toBe(true);
  expect(journal.snapshot().entries.find(entry => entry.event === 'screen-time.status.end')?.data).toMatchObject({ result: 42 });
});
