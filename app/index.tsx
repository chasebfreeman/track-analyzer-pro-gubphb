
import { Redirect } from 'expo-router';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { isAuthenticated, isLoading, isPinSetup, isSupabaseEnabled } = useSupabaseAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If Supabase is enabled, use Supabase auth
  if (isSupabaseEnabled) {
    if (isAuthenticated) {
      return <Redirect href="/(tabs)/tracks" />;
    }
    return <Redirect href="/auth/supabase-login" />;
  }

  // Otherwise use PIN auth
  if (!isPinSetup) {
    return <Redirect href="/auth/setup-pin" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/tracks" />;
  }

  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
