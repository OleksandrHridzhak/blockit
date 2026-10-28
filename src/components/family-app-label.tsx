import { requireNativeViewManager } from 'expo-modules-core';
import { Platform, Text, View, type ViewProps, useWindowDimensions } from 'react-native';
import { ui } from './protection-ui';

interface Props extends ViewProps { tokenId: string }
const NativeLabel = Platform.OS === 'ios'
  ? requireNativeViewManager<Props>('BlockitScreenTime', 'FamilyActivityLabel') : null;

export function FamilyAppLabel({ tokenId, fallback = 'Застосунок' }: { tokenId: string; fallback?: string }) {
  const { fontScale } = useWindowDimensions();
  return NativeLabel
    ? <View pointerEvents="none" style={{ flex: 1 }}><NativeLabel tokenId={tokenId} style={{ width: '100%', height: Math.max(56, 56 * fontScale) }} /></View>
    : <Text style={ui.body}>{fallback}</Text>;
}
