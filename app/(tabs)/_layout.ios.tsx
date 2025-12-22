
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { colors } from '@/styles/commonStyles';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  console.log('iOS Native Tabs Layout rendering with isDark:', isDark);
  
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={isDark ? '#98989D' : '#8E8E93'}
      labelStyle={{
        color: isDark ? '#98989D' : '#8E8E93',
      }}
      backgroundColor={isDark ? '#1C1C1E' : '#F2F2F7'}
      backBehavior="history"
    >
      <NativeTabs.Trigger 
        name="tracks"
        disablePopToTop={false}
        disableScrollToTop={false}
      >
        <Label>Tracks</Label>
        <Icon sf="map.fill" drawable="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger 
        name="record"
        disablePopToTop={false}
        disableScrollToTop={false}
      >
        <Label>Record</Label>
        <Icon sf="plus.circle.fill" drawable="add_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger 
        name="browse"
        disablePopToTop={false}
        disableScrollToTop={false}
      >
        <Label>Browse</Label>
        <Icon sf="magnifyingglass" drawable="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
