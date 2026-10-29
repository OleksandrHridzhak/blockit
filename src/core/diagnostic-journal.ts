export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';
export interface DiagnosticEntry {
  time: number; sequence: number; session: string; level: DiagnosticLevel;
  event: string; route?: string; data?: unknown;
}
export const JOURNAL_LIMIT = 2000;
const MAX_BYTES = 2_000_000;
const SECRET = /password|secret|authorization|cookie|access.?token|refresh.?token|answer|phrase|reflection|body|email/i;

export function redactText(value: string): string {
  return value.slice(0, 8000).replace(/(Bearer\s+)[\w.\-]+/gi, '$1[redacted]')
    .replace(/([?&][^=\s&#]+)=([^&#\s]*)/g, '$1=[redacted]')
    .replace(/((?:password|secret|token|cookie|authorization|answer|phrase)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .slice(0, 4000);
}
export function diagnosticData(value: unknown): unknown {
  const seen = new WeakSet<object>();
  let nodes = 200;
  let characters = 12000;
  function visit(item: unknown, depth: number): unknown {
    try {
      if (--nodes < 0 || characters <= 0) return '[size limit]';
      if (typeof item === 'string') {
        const text = redactText(item).slice(0, characters); characters -= text.length; return text;
      }
      if (item == null || typeof item === 'number' || typeof item === 'boolean') return item;
      if (typeof item !== 'object') return visit(String(item), depth);
      if (seen.has(item)) return '[circular]';
      if (depth >= 5) return '[depth limit]';
      seen.add(item);
      if (item instanceof Error) return visit({ name: item.name, message: item.message, stack: item.stack,
        cause: item.cause, ...Object.fromEntries(Object.entries(item).slice(0, 20)) }, depth + 1);
      if (Array.isArray(item)) {
        const result = [];
        for (const child of item.slice(0, 50)) { if (nodes <= 0 || characters <= 0) break; result.push(visit(child, depth + 1)); }
        return result;
      }
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(item).slice(0, 50)) {
        if (nodes <= 0 || characters <= 0) break;
        characters -= key.length;
        result[key.slice(0, 100)] = SECRET.test(key) ? '[redacted]' : visit(child, depth + 1);
      }
      return result;
    } catch { return '[unserializable]'; }
  }
  return visit(value, 0);
}

export function createDiagnosticJournal(storage: { read(): string | null; write(value: string): void }, enabled = true) {
  const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let entries: DiagnosticEntry[] = [];
  let sequence = 0;
  let dropped = 0;
  let storageError = '';
  let route = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const saved = JSON.parse(storage.read() ?? 'null');
    if (saved?.schema === 1 && Array.isArray(saved.entries)) {
      entries = saved.entries.filter((entry: DiagnosticEntry) => entry && typeof entry.event === 'string'
        && Number.isFinite(entry.time)).slice(-JOURNAL_LIMIT);
      dropped = Number(saved.dropped) || 0;
    }
  } catch { storageError = 'Previous journal could not be read'; }
  function snapshot() { return { schema: 1, session, enabled, dropped, storageError, limits: { entries: JOURNAL_LIMIT, bytes: MAX_BYTES }, entries: [...entries] }; }
  function flush() {
    if (timer) { clearTimeout(timer); timer = undefined; }
    try {
      let text = JSON.stringify(snapshot());
      // Three UTF-8 bytes per UTF-16 code unit safely bounds all JSON text.
      while (text.length * 3 > MAX_BYTES && entries.length > 1) {
        const count = Math.max(1, Math.ceil(entries.length / 10));
        entries.splice(0, count); dropped += count; text = JSON.stringify(snapshot());
      }
      storage.write(text); storageError = '';
    } catch { storageError = 'Journal persistence failed; current session is available in memory'; }
  }
  function record(event: string, data?: unknown, level: DiagnosticLevel = 'info') {
    if (!enabled) return;
    entries.push({ time: Date.now(), sequence: ++sequence, session, level, event: event.slice(0, 160),
      route: route || undefined, data: diagnosticData(data) });
    if (entries.length > JOURNAL_LIMIT) { entries.shift(); dropped++; }
    if (level === 'error') flush();
    else timer ??= setTimeout(flush, 750);
  }
  return { record, flush, snapshot, isEnabled: () => enabled,
    setRoute(value: string) { route = value; record('navigation', { pathname: value }); },
    setEnabled(value: boolean) {
      if (!value) record('capture-disabled');
      enabled = value;
      if (value) record('capture-enabled');
      flush();
    },
    clear() { entries = []; dropped = 0; flush(); },
  };
}

// Keeps the original return value / rejection and records errors even when a caller handles them.
export function instrumentDiagnosticMethods<T extends object>(target: T, journal: ReturnType<typeof createDiagnosticJournal>): T {
  let nextCall = 0;
  return Object.fromEntries(Object.entries(target).map(([name, method]) => [name, (...args: unknown[]) => {
    if (!journal.isEnabled()) return method.apply(target, args);
    const call = ++nextCall;
    const started = Date.now();
    const safeArgs = name === 'finish' ? [args[0], { length: String(args[1] ?? '').length }]
      : name === 'shareDiagnosticFile' ? ['[report file]'] : args;
    journal.record(`screen-time.${name}.start`, { call, args: safeArgs });
    if (!/^(status|pending|activeAccess|history|groups|selectedApps|diagnostics|protectionOverrides)$/.test(name)) journal.flush();
    const slow = setTimeout(() => journal.record(`screen-time.${name}.slow`, { call, elapsedMs: Date.now() - started }, 'warn'), 5000);
    function success(value: unknown) {
      clearTimeout(slow);
      journal.record(`screen-time.${name}.end`, { call, elapsedMs: Date.now() - started,
        result: name === 'diagnostics' ? '[native snapshot]' : value });
      return value;
    }
    function failure(error: unknown): never {
      clearTimeout(slow);
      journal.record(`screen-time.${name}.error`, { call, elapsedMs: Date.now() - started, error }, 'error');
      throw error;
    }
    try {
      const value = method.apply(target, args);
      return value && typeof value.then === 'function' ? value.then(success, failure) : success(value);
    } catch (error) { return failure(error); }
  }])) as T;
}
