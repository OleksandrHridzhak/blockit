import { Platform, Share } from 'react-native';
import { screenTime } from '@/features/screen-time/client';
import { diagnosticJournal } from './journal';

export async function readNativeDiagnostics(): Promise<Record<string, unknown>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const text = await Promise.race([screenTime.diagnostics(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Системна діагностика не відповіла за 8 секунд. Журнал застосунку доступний.')), 8000);
    })]);
    return JSON.parse(text);
  } finally { if (timer) clearTimeout(timer); }
}
export async function shareDiagnosticReport() {
  diagnosticJournal.record('report-export');
  let native: Record<string, unknown> = {};
  try { native = await readNativeDiagnostics(); }
  catch (error) { native = { unavailable: error instanceof Error ? error.message : String(error) }; }
  diagnosticJournal.flush();
  const javascript = diagnosticJournal.snapshot();
  const trace = Array.isArray(native.trace) ? native.trace : [];
  const timeline = [
    ...javascript.entries.map(entry => ({ source: 'javascript', ...entry })),
    ...trace.map(entry => ({ ...entry, source: 'native', time: entry.time * 1000 })),
  ].sort((a, b) => a.time - b.time);
  const report = JSON.stringify({ schema: 1, exportedAt: new Date().toISOString(),
    coverage: { localOnly: true, nativeCrashReports: 'OS crash / jetsam reports require Apple device diagnostics',
      retention: 'Bounded rings; dropped JS entries are counted. Native rings retain 512 entries per process.',
      persistence: 'Batched up to 750ms; errors and app background flush immediately.' },
    native: { ...native, trace: undefined }, javascript: { ...javascript, entries: undefined }, timeline }, null, 2);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([report], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `blockit-diagnostics-${Date.now()}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (screenTime.canShareDiagnosticFile()) {
    await screenTime.shareDiagnosticFile(report);
  } else {
    await Share.share({ message: report });
  }
}
