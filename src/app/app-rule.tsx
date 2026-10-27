import { useLocalSearchParams } from 'expo-router';
import { AppBadge, ui } from '@/components/protection-ui';
import { ProtectionRuleEditor } from '@/components/protection-rule-editor';
import { getCatalogApp } from '@/core/catalog';
import { getAppRule, previewApps, removeAppFromPreview, saveAppRule } from '@/features/preview/store';
import { appCuriosityEnabled, setGroupCuriosity } from '@/features/curiosity/storage';
import { Text, View } from 'react-native';

export default function AppRuleScreen() {
  const { appId } = useLocalSearchParams<{ appId: string }>();
  const id = typeof appId === 'string' ? appId.trim().toLowerCase() : '';
  const catalog = getCatalogApp(id);
  const name = catalog?.name ?? previewApps.find(app => app.id === id)?.name ?? 'Застосунок';
  return <ProtectionRuleEditor key={id} demo label={name} valid={Boolean(id)}
    initial={{ ...getAppRule(id), curiosity: appCuriosityEnabled(id, 'legacy') }}
    identity={() => <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <AppBadge name={name} color={catalog?.accentColor} size={56} /><Text style={ui.title}>{name}</Text>
    </View>}
    onSave={async draft => {
      const { curiosity, ...rule } = draft;
      saveAppRule(id, rule);
      setGroupCuriosity(`app:${id}`, curiosity);
      return true;
    }}
    onRemove={async () => { removeAppFromPreview(id); }} />;
}
