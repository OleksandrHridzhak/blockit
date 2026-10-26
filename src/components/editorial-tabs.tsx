import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditorialIcon } from '@/components/editorial-icon';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: { paddingVertical: 4 },
      tabBarIconStyle: { height: 24, margin: 0 },
      sceneStyle: { backgroundColor: '#121212' },
      tabBarActiveTintColor: '#FAFAFA',
      tabBarInactiveTintColor: '#8E8E8E',
      tabBarActiveBackgroundColor: 'transparent',
      tabBarInactiveBackgroundColor: 'transparent',
      tabBarStyle: { backgroundColor: '#121212', borderTopColor: '#2E2E2E', borderTopWidth: 1,
        height: 80 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 12),
        elevation: 0, shadowOpacity: 0 },
      tabBarLabelStyle: { fontFamily: 'GeistSemiBold', fontSize: 12, lineHeight: 18, letterSpacing: 0.1, marginTop: 0 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Застосунки', tabBarIcon: ({ focused }) => <EditorialIcon name="shield" active={focused} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Правила', tabBarIcon: ({ focused }) => <EditorialIcon name="info" active={focused} /> }} />
    </Tabs>
  );
}
