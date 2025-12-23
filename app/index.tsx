
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { isAuthenticated, isLoading, isPinSetup } = useAuth();

  console.log('Index screen - Auth state:', { isAuthenticated, isLoading, isPinSetup });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isPinSetup) {
    console.log('No PIN setup - redirecting to setup-pin');
    return <Redirect href="/auth/setup-pin" />;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated - redirecting to login');
    return <Redirect href="/auth/login" />;
  }

  console.log('Authenticated - redirecting to tracks');
  return <Redirect href="/(tabs)/tracks" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
