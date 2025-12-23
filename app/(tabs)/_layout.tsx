
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useThemeColors } from '@/styles/commonStyles';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const isDark = colorScheme === 'dark';
  
  console.log('TabLayout (Android) rendering, colorScheme:', colorScheme);
  console.log('TabLayout colors:', { primary: colors.primary, textSecondary: colors.textSecondary });
  
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={colors.text}
      labelStyle={{
        color: colors.text,
      }}
      backgroundColor={isDark ? '#1C1C1E' : '#F2F2F7'}
      backBehavior="initialRoute"
    >
      <NativeTabs.Trigger name="tracks">
        <Icon sf={{ default: 'map', selected: 'map.fill' }} drawable="map" />
        <Label>Tracks</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="record">
        <Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} drawable="add_circle" />
        <Label>Record</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="browse">
        <Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} drawable="search" />
        <Label>Browse</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} drawable="settings" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
