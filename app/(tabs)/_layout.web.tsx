
import React from 'react';
import { Tabs } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { useThemeColors } from '@/styles/commonStyles';

export default function TabLayout() {
  const colors = useThemeColors();
  
  console.log('TabLayout (Web) rendering');
  
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="tracks"
        options={{
          title: 'Tracks',
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
