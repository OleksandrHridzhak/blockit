import { useAppTheme } from '@/features/appearance/theme';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditorialIcon } from '@/components/editorial-icon';
import { systemFont } from '@/components/protection-ui';

export default function AppTabs() {
  const appleTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarShowLabel: true,
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarIconStyle: { height: 24, margin: 0 },
        sceneStyle: { backgroundColor: appleTheme.bg },
        tabBarActiveTintColor: appleTheme.tint,
        tabBarInactiveTintColor: appleTheme.secondaryLabel,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarStyle: {
          backgroundColor: appleTheme.tabBar,
          borderTopColor: appleTheme.separatorSubtle,
          borderTopWidth: 0.5,
          height: 64 + insets.bottom,
          paddingTop: 5,
          paddingBottom: Math.max(insets.bottom, 4),
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: systemFont,
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Застосунки',
          tabBarIcon: ({ focused }) => (
            <EditorialIcon name="shield" active={focused} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Статистика',
          tabBarIcon: ({ focused }) => (
            <EditorialIcon name="chart" active={focused} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Параметри',
          tabBarIcon: ({ focused }) => (
            <EditorialIcon name="settings" active={focused} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
