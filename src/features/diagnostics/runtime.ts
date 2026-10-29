import Constants from 'expo-constants';
import { AppState, Linking, Platform } from 'react-native';
import { diagnosticJournal as journal } from './journal';

type ErrorHandler = (error: Error, fatal?: boolean) => void;
type Runtime = typeof globalThis & {
  __blockitDiagnostics?: boolean;
  ErrorUtils?: { getGlobalHandler(): ErrorHandler; setGlobalHandler(handler: ErrorHandler): void };
  HermesInternal?: { enablePromiseRejectionTracker?(options: {
    allRejections: boolean; onUnhandled(id: number, error: unknown): void; onHandled(id: number): void;
  }): void };
};
export function installDiagnostics() {
  const runtime = globalThis as Runtime;
  if (runtime.__blockitDiagnostics) return;
  runtime.__blockitDiagnostics = true;
  journal.record('runtime-start', { platform: Platform.OS, os: Platform.Version, dev: __DEV__,
    version: Constants.expoConfig?.version, build: Constants.nativeBuildVersion,
    executionEnvironment: Constants.executionEnvironment, engine: runtime.HermesInternal ? 'hermes' : 'other' });
  for (const level of ['debug', 'log', 'info', 'warn', 'error'] as const) {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
      journal.record(`console.${level}`, args, level === 'log' ? 'debug' : level);
      original.apply(console, args);
    };
  }
  if (runtime.ErrorUtils) {
    const previous = runtime.ErrorUtils.getGlobalHandler();
    runtime.ErrorUtils.setGlobalHandler((error, fatal) => {
      journal.record('javascript-error', { error, fatal }, 'error');
      previous(error, fatal);
    });
  }
  // Hermes' tracker is also needed in TestFlight, where __DEV__ is false.
  // Keep RN's existing developer reporting when replacing its singleton tracker.
  if (runtime.HermesInternal?.enablePromiseRejectionTracker) {
    // RN exposes this tracker only as an internal JS module; keep its dev overlay behavior.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const previous = __DEV__ ? require('react-native/Libraries/promiseRejectionTrackingOptions').default : undefined;
    runtime.HermesInternal.enablePromiseRejectionTracker({ allRejections: true,
      onUnhandled(id, error) { journal.record('unhandled-rejection', { id, error }, 'error'); previous?.onUnhandled?.(id, error); },
      onHandled(id) { journal.record('rejection-handled-late', { id }); previous?.onHandled?.(id); },
    });
  } else if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', event => journal.record('unhandled-rejection', { error: event.reason }, 'error'));
    window.addEventListener('error', event => journal.record('window-error', { error: event.error, message: event.message }, 'error'));
    window.addEventListener('pagehide', () => journal.flush());
  }
  let state = AppState.currentState;
  let lastTick = Date.now();
  AppState.addEventListener('change', next => {
    journal.record('app-state', { previous: state, next }); state = next; lastTick = Date.now(); journal.flush();
  });
  AppState.addEventListener('memoryWarning', () => journal.record('memory-warning', undefined, 'warn'));
  Linking.addEventListener('url', ({ url }) => journal.record('deep-link', { url }));
  void Linking.getInitialURL().then(url => { if (url) journal.record('initial-deep-link', { url }); })
    .catch(error => journal.record('initial-deep-link-error', { error }, 'error'));
  setInterval(() => {
    const elapsed = Date.now() - lastTick; lastTick = Date.now();
    if (state === 'active' && elapsed > 7500) journal.record('js-thread-delay', { elapsedMs: elapsed }, 'warn');
  }, 5000);
  if (typeof globalThis.fetch === 'function') {
    const original = globalThis.fetch;
    globalThis.fetch = async (input, options) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = options?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
      const started = Date.now();
      journal.record('network-start', { url, method });
      try {
        const response = await original(input, options);
        journal.record('network-end', { url, method, status: response.status, elapsedMs: Date.now() - started }, response.ok ? 'debug' : 'warn');
        return response;
      } catch (error) { journal.record('network-error', { url, method, error, elapsedMs: Date.now() - started }, 'error'); throw error; }
    };
  }
  journal.flush();
}
