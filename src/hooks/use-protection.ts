import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadProtectionView, type ProtectionView } from '@/features/preview/store';

export function useProtection() {
  const [view, setView] = useState<ProtectionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const refresh = useCallback(async () => { setView(await loadProtectionView()); }, []);
  useFocusEffect(useCallback(() => {
    refresh().catch(() => setError('Не вдалося перевірити захист. Спробуй ще раз.'));
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh().catch(() => setError('Не вдалося оновити стан.'));
    });
    return () => sub.remove();
  }, [refresh]));
  const run = async (task: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await task(); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося зберегти зміни. Спробуй ще раз.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return { view, busy, error, run, refresh };
}
