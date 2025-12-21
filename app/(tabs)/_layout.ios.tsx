
import React from 'react';
import { Tabs } from 'expo-router/unstable-native-tabs';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="tracks"
        options={{
          title: 'Tracks',
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              ios_icon_name="map.fill" 
              android_material_icon_name="map" 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              ios_icon_name="plus.circle.fill" 
              android_material_icon_name="add_circle" 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => (
            <IconSymbol 
              ios_icon_name="magnifyingglass" 
              android_material_icon_name="search" 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
