
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={colors.textSecondary}
      labelStyle={{
        color: colors.textSecondary,
      }}
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
