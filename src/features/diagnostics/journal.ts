import appConfig from '../../../app.json';
import { Platform } from 'react-native';
import { BlockitBridge } from '../../../modules/blockit-bridge';
import { createDiagnosticJournal } from '@/core/diagnostic-journal';

const KEY = 'blockit.diagnostics.journal.v1';
const ENABLED_KEY = 'blockit.diagnostics.enabled';
function read(key: string) {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined'
    ? localStorage.getItem(key) : BlockitBridge.getString(key);
}
function write(key: string, value: string) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  else BlockitBridge.setString(key, value);
}
let enabled = __DEV__ || appConfig.expo.extra.diagnostics === true;
try { const saved = read(ENABLED_KEY); if (saved !== null) enabled = saved === 'true'; } catch { /* In-memory capture still works. */ }
export const diagnosticJournal = createDiagnosticJournal({ read: () => read(KEY), write: value => write(KEY, value) }, enabled);
export function setDiagnosticCapture(value: boolean) {
  write(ENABLED_KEY, String(value));
  diagnosticJournal.setEnabled(value);
}
