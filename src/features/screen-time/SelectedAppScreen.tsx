import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Action, Copy, ListRow, ListSection, Page } from '@/components/protection-ui';
import { ProtectionRuleEditor } from '@/components/protection-rule-editor';
import { FamilyAppLabel } from '@/components/family-app-label';
import { ReturnAppSetting } from '@/components/return-app-setting';
import { appCuriosityEnabled, setGroupCuriosity } from '@/features/curiosity/storage';
import { screenTime, type GroupMode, type SelectedApp } from '@/features/screen-time/client';

export default function SelectedAppScreen() {
  const { appId } = useLocalSearchParams<{ appId: string }>();
  const [app, setApp] = useState<SelectedApp | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    screenTime.selectedApps().then(apps => { if (alive) { setApp(apps.find(app => app.id === appId) ?? null); setLoaded(true); } })
      .catch(e => { if (alive) { setError(e instanceof Error ? e.message : 'Не вдалося прочитати налаштування.'); setLoaded(true); } });
    return () => { alive = false; };
  }, [appId]);
  if (!app) return <Page><Copy>{error || (loaded ? 'Цей застосунок більше не обраний. Онови список на головному екрані.' : 'Завантажуємо налаштування…')}</Copy><Action secondary label="До застосунків" onPress={() => router.replace('/')} /></Page>;
  return <ProtectionRuleEditor key={app.id} demo={false} label="обраного застосунку"
    initial={{ seconds: app.seconds, mode: app.mode, sessionMinutes: app.sessionMinutes ?? 15, curiosity: appCuriosityEnabled(app.id, app.groupId) }}
    identity={busy => <><ListSection><ListRow showSeparator={false}><FamilyAppLabel tokenId={app.id} /></ListRow></ListSection><ReturnAppSetting key={app.id} tokenId={app.id} disabled={busy} /></>}
    onSave={async draft => {
      if (draft.seconds !== app.seconds || draft.mode !== app.mode || draft.sessionMinutes !== (app.sessionMinutes ?? 15)) await screenTime.saveAppRule(app.id, draft.seconds, draft.mode as GroupMode, draft.sessionMinutes ?? 15);
      setGroupCuriosity(`app:${app.id}`, draft.curiosity);
      return true;
    }}
    onRemove={async () => { await screenTime.removeApp(app.id); }} />;
}
