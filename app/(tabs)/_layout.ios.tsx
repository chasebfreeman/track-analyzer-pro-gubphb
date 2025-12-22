
import React, { useEffect, useState } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { colors } from '@/styles/commonStyles';
import { useColorScheme, Platform, AppState } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [appState, setAppState] = useState(AppState.currentState);
  
  useEffect(() => {
    console.log('=== iOS Native Tabs Layout Mounted ===');
    console.log('Platform:', Platform.OS, Platform.Version);
    console.log('Color scheme:', colorScheme);
    console.log('App State:', appState);
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed:', appState, '->', nextAppState);
      setAppState(nextAppState);
    });
    
    return () => {
      console.log('=== iOS Native Tabs Layout Unmounted ===');
      subscription.remove();
    };
  }, []);

  const isDark = colorScheme === 'dark';
  
  console.log('Rendering iOS Native Tabs with isDark:', isDark);
  
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
      <NativeTabs.Trigger name="tracks">
        <Label>Tracks</Label>
        <Icon sf="map.fill" drawable="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="record">
        <Label>Record</Label>
        <Icon sf="plus.circle.fill" drawable="add_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="browse">
        <Label>Browse</Label>
        <Icon sf="magnifyingglass" drawable="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
