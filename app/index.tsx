
import { Redirect } from 'expo-router';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useEffect, useState } from 'react';

export default function Index() {
  const { isAuthenticated, isLoading, isPinSetup, isSupabaseEnabled } = useSupabaseAuth();
  const [showLoading, setShowLoading] = useState(true);
  const [forceRedirect, setForceRedirect] = useState(false);

  useEffect(() => {
    console.log('Index: Auth state:', {
      isAuthenticated,
      isLoading,
      isPinSetup,
      isSupabaseEnabled,
      platform: Platform.OS
    });

    // On web, don't show loading for too long
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => {
        console.log('Index: Loading timeout on web, forcing redirect');
        setShowLoading(false);
        setForceRedirect(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, isPinSetup, isSupabaseEnabled]);

  // If we're forcing redirect on web, go to login
  if (forceRedirect && Platform.OS === 'web') {
    console.log('Index: Force redirecting to login (web timeout)');
    if (isSupabaseEnabled) {
      return <Redirect href="/auth/supabase-login" />;
    }
    return <Redirect href="/auth/setup-pin" />;
  }

  // On web, if loading takes too long, proceed anyway
  if (isLoading && showLoading) {
    console.log('Index: Loading...');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If Supabase is enabled, use Supabase auth
  if (isSupabaseEnabled) {
    console.log('Index: Supabase enabled, authenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('Index: Redirecting to tracks (Supabase)');
      return <Redirect href="/(tabs)/tracks" />;
    }
    console.log('Index: Redirecting to Supabase login');
    return <Redirect href="/auth/supabase-login" />;
  }

  // Otherwise use PIN auth
  console.log('Index: PIN auth, setup:', isPinSetup, 'authenticated:', isAuthenticated);
  if (!isPinSetup) {
    console.log('Index: Redirecting to PIN setup');
    return <Redirect href="/auth/setup-pin" />;
  }

  if (isAuthenticated) {
    console.log('Index: Redirecting to tracks (PIN)');
    return <Redirect href="/(tabs)/tracks" />;
  }

  console.log('Index: Redirecting to PIN login');
  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
});
