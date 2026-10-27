import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { finishCuriositySession } from './session-actions';

export function useCuriositySession() {
  const params = useLocalSearchParams<{ request?: string; preview?: string; groupId?: string }>();
  const requestId = typeof params.request === 'string' ? params.request : undefined;
  const preview = params.preview === '1' || !requestId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const routeParams = { ...(requestId ? { request: requestId } : {}), preview: preview ? '1' : '0' };
  async function finish() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await finishCuriositySession(requestId, preview);
      router.replace('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося завершити сесію. Спробуй ще раз.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function standardPause() {
    if (requestId && !preview) router.replace({ pathname: '/intervene', params: { request: requestId } });
  }
  return { preview, busy, error, finish, standardPause, routeParams };
}
