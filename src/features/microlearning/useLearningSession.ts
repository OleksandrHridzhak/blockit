import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { screenTime } from '@/features/screen-time/client';
import { finishAndReturn, getReturnTarget } from '@/features/intervention/return-target';
import { isMicrolearning, microlearningRoute } from '@/core/pause-mode-settings';
import { interventionDestination } from '@/features/curiosity/storage';

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
  const completed = useRef(false);
  const refreshing = useRef(false);
  const [syncing, setSyncing] = useState(!preview);
  const [appId, setAppId] = useState<string | undefined>();
  const [returnTarget, setReturnTarget] = useState<string | null>(null);

  const synchronize = useCallback(async (isCurrent: () => boolean = () => true) => {
    const pending = await screenTime.pending();
    if (!isCurrent()) return null;
    if (!pending) {
      setReadyAt(null);
      const access = await screenTime.activeAccess();
      if (!isCurrent()) return null;
      router.replace(access ? { pathname: '/intervene', params: { request: access.id } } : '/');
      return null;
    }
    if (pending.id !== requestId || pending.mode !== mode) {
      setReadyAt(null);
      router.replace({ pathname: isMicrolearning(pending.mode) ? microlearningRoute(pending.mode) : interventionDestination(pending.groupId, pending.appId), params: { request: pending.id } });
      return null;
    }
    return pending;
  }, [requestId, mode]);

  useEffect(() => {
    let alive = true;
    completed.current = false;
    autoFinished.current = false;
    async function refresh() {
      if (preview || !requestId || lock.current || completed.current || refreshing.current) return;
      refreshing.current = true;
      await Promise.resolve();
      if (!alive) return;
      setSyncing(true);
      try {
        const pending = await synchronize(() => alive);
        if (!alive || !pending) return;
        const request = pending.readyAt > 0 ? pending : await screenTime.startMicrolearning(pending.id);
        if (request.id !== requestId || request.mode !== mode) throw new Error('Цей запит уже змінився. Повернись до застосунків.');
        if (alive) { setReadyAt(request.readyAt); setAppId(request.appId); setReturnTarget(getReturnTarget(request.appId)); setError(''); }
      } catch (e) {
        if (alive) { setReadyAt(null); setError(e instanceof Error ? e.message : 'Не вдалося почати паузу. Спробуй ще раз.'); }
      } finally { if (alive) { refreshing.current = false; setSyncing(false); } }
    }
    void refresh();
    const timer = setInterval(() => setNow(Date.now()), 500);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') { setNow(Date.now()); void refresh(); } });
    return () => { alive = false; refreshing.current = false; clearInterval(timer); sub.remove(); };
  }, [preview, requestId, mode, attempt, synchronize]);

  async function finish() {
    if (readyAt === null || Date.now() < readyAt || lock.current || refreshing.current || completed.current) return false;
    lock.current = true; setBusy(true); setError('');
    try {
      if (!preview) {
        const pending = await synchronize();
        if (!pending) return false;
        if (pending.readyAt <= 0) { setReadyAt(null); setAttempt(value => value + 1); return false; }
        if (Date.now() < pending.readyAt) { setReadyAt(pending.readyAt); return false; }
      }
      const opened = !preview && await finishAndReturn(requestId, '', appId);
      completed.current = true;
      if (returnTarget && !opened) {
        setError('Доступ відкрито. Не вдалося повернутися автоматично — відкрий застосунок вручну.');
      } else router.replace('/');
      return true;
    }
    catch (e) {
      // Reconcile a request replaced while the native finish call was in flight.
      try { if (!preview && !await synchronize()) return false; } catch { /* Keep the original failure visible. */ }
      setError(e instanceof Error ? e.message : 'Не вдалося відкрити доступ. Спробуй ще раз.'); return false;
    }
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
    if (preview || syncing || refreshing.current || !returnTarget || readyAt === null || now < readyAt || busy || error || autoFinished.current || completed.current || AppState.currentState !== 'active') return;
    autoFinished.current = true;
    void finish();
  });
  return { preview, busy: busy || syncing, error, appId, returnTarget, setReturnTarget, ready: !syncing && readyAt !== null && now >= readyAt, finish, cancel, retry: () => setAttempt(value => value + 1) };
}
