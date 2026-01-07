
import { Redirect } from 'expo-router';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { View, ActivityIndicator } from 'react-native';
import React from 'react';

export default function Index() {
  const { isLoading, isAuthenticated, isPinSetup } = useSupabaseAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  if (!isPinSetup) {
    return <Redirect href="/auth/setup-pin" />;
  }

  return <Redirect href="/(tabs)/record" />;
}
