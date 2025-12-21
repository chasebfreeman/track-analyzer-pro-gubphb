
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: 'tracks',
      route: '/(tabs)/tracks',
      icon: 'map',
      label: 'Tracks',
    },
    {
      name: 'record',
      route: '/(tabs)/record',
      icon: 'add_circle',
      label: 'Record',
    },
    {
      name: 'browse',
      route: '/(tabs)/browse',
      icon: 'search',
      label: 'Browse',
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen key="tracks" name="tracks" />
        <Stack.Screen key="record" name="record" />
        <Stack.Screen key="browse" name="browse" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
