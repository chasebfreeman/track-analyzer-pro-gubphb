
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme, View, Text, StyleSheet, Platform } from 'react-native';
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import { colors } from '@/styles/commonStyles';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('RootLayout: Component mounted, Platform:', Platform.OS);
    setMounted(true);
    
    // Much shorter timeout for web - if it doesn't load quickly, something is wrong
    const timeoutDuration = Platform.OS === 'web' ? 3000 : 10000;
    
    // Safety timeout - if app doesn't load in time, show error
    const safetyTimeout = setTimeout(() => {
      console.error('RootLayout: App initialization timeout');
      setError('App initialization timeout. Please refresh the page.');
    }, timeoutDuration);

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      console.log('RootLayout: Fonts loaded, hiding splash screen');
      SplashScreen.hideAsync().catch((err) => {
        console.error('RootLayout: Error hiding splash screen:', err);
      });
    }
  }, [loaded]);

  useEffect(() => {
    // Global error handler for web
    if (Platform.OS === 'web') {
      const errorHandler = (event: ErrorEvent) => {
        console.error('RootLayout: Global error:', event.error || event.message);
        setError(event.message || 'An unexpected error occurred');
      };

      const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        console.error('RootLayout: Unhandled promise rejection:', event.reason);
        setError('An unexpected error occurred');
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('error', errorHandler);
        window.addEventListener('unhandledrejection', unhandledRejectionHandler);
        return () => {
          window.removeEventListener('error', errorHandler);
          window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
        };
      }
    }
  }, []);

  if (!loaded || !mounted) {
    console.log('RootLayout: Waiting for fonts to load or component to mount');
    return null;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>Please refresh the page</Text>
      </View>
    );
  }

  console.log('RootLayout: Rendering app');

  return (
    <SupabaseAuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="modal" 
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Modal',
            }}
          />
          <Stack.Screen 
            name="formsheet" 
            options={{
              presentation: 'formSheet',
              headerShown: true,
              title: 'Form Sheet',
            }}
          />
          <Stack.Screen 
            name="transparent-modal" 
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              headerShown: false,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SupabaseAuthProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
