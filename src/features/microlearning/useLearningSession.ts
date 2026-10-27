import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { screenTime } from '@/features/screen-time/client';
import { finishAndReturn, getReturnTarget } from '@/features/intervention/return-target';

export function useLearningSession(mode: 'microlearning' | 'microlearning-v2') {
  const params = useLocalSearchParams<{ request?: string; preview?: string; seconds?: string }>();
  const preview = params.preview === '1';
  const requestId = typeof params.request === 'string' ? params.request : '';
  const duration = (Number.isInteger(Number(params.seconds)) && Number(params.seconds) >= 1 && Number(params.seconds) <= 86400) ? Number(params.seconds) : 20;
  const [readyAt, setReadyAt] = useState<number | null>(() => preview ? Date.now() + duration * 1000 : null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => !preview && !requestId ? 'Не знайдено запит на паузу. Повернись до застосунків.' : '');
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  const autoFinished = useRef(false);
  const [appId, setAppId] = useState<string | undefined>();
  const [returnTarget, setReturnTarget] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      if (preview || !requestId) return;
      try {
        const request = await screenTime.startMicrolearning(requestId);
        if (request.id !== requestId || request.mode !== mode) throw new Error('Цей запит уже змінився. Повернись до застосунків.');
        if (alive) { setReadyAt(request.readyAt); setAppId(request.appId); setReturnTarget(getReturnTarget(request.appId)); setError(''); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Не вдалося почати паузу. Спробуй ще раз.'); }
    }
    void refresh();
    const timer = setInterval(() => setNow(Date.now()), 500);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') { setNow(Date.now()); void refresh(); } });
    return () => { alive = false; clearInterval(timer); sub.remove(); };
  }, [preview, requestId, mode, attempt]);

  async function finish() {
    if (readyAt === null || Date.now() < readyAt || lock.current) return false;
    lock.current = true; setBusy(true); setError('');
    try {
      const opened = !preview && await finishAndReturn(requestId, '', appId);
      if (returnTarget && !opened) {
        setError('Доступ відкрито. Не вдалося повернутися автоматично — відкрий застосунок вручну.');
      } else router.replace('/');
      return true;
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося відкрити доступ. Спробуй ще раз.'); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  async function cancel() {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError('');
    try {
      if (!preview) { const pending = await screenTime.pending(); if (pending?.id === requestId) await screenTime.cancel(); }
      router.replace('/'); return true;
    } catch { setError('Не вдалося завершити паузу. Спробуй ще раз.'); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (preview || !returnTarget || readyAt === null || now < readyAt || busy || error || autoFinished.current || AppState.currentState !== 'active') return;
    autoFinished.current = true;
    void finish();
  });
  return { preview, busy, error, appId, returnTarget, setReturnTarget, ready: readyAt !== null && now >= readyAt, finish, cancel, retry: () => setAttempt(value => value + 1) };
}
