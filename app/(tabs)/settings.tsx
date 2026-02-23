
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/utils/supabase';
import * as Application from 'expo-application';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, signOut } = useSupabaseAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    console.log('User tapped Logout button');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed logout');
            await signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    console.log('User tapped Privacy Policy button');
    router.push('/privacy-policy');
  };

  const handleDeleteAccount = async () => {
    console.log('User tapped Delete Account button');
    
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete:\n\n• All your tracks\n• All your readings\n• All your data\n• Your account credentials\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('User cancelled account deletion'),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Show second confirmation
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Are you absolutely sure you want to delete your account and all data?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => console.log('User cancelled account deletion on second prompt'),
                },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: performAccountDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  };

 const performAccountDeletion = async () => {
  console.log('User confirmed account deletion - starting deletion process');
  setIsDeleting(true);

  try {
    if (!user?.id) {
      Alert.alert('Error', 'Unable to delete account. Please try logging out and back in.');
      return;
    }

    console.log('Invoking delete-account edge function...');

    const { data, error } = await supabase.functions.invoke('delete-account');

    if (error) {
      console.error('delete-account invoke error:', error);
      Alert.alert('Error', error.message || 'Failed to delete account');
      return;
    }

    console.log('delete-account success:', data);

    // Sign out locally and redirect
    await signOut();

    Alert.alert(
      'Account Deleted',
      'Your account and all associated data have been permanently deleted.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/auth/login'),
        },
      ]
    );
  } catch (e: any) {
    console.error('Error during account deletion:', e);
    Alert.alert('Error', e?.message || 'An error occurred while deleting your account.');
  } finally {
    setIsDeleting(false);
  }
}; 

  const styles = getStyles(colors);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <IconSymbol
                  ios_icon_name="person.circle"
                  android_material_icon_name="account-circle"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
  <Text style={styles.sectionTitle}>About</Text>

  <View style={styles.card}>
    {/* App Name */}
    <View style={styles.infoRow}>
      <IconSymbol
        ios_icon_name="flag.checkered"
        android_material_icon_name="sports-score"
        size={24}
        color={colors.primary}
      />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>App Name</Text>
        <Text style={styles.infoValue}>Track Specialist</Text>
      </View>
    </View>

    <View style={styles.divider} />

    {/* Version */}
    <View style={styles.infoRow}>
      <IconSymbol
        ios_icon_name="info.circle"
        android_material_icon_name="info"
        size={24}
        color={colors.primary}
      />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>Version</Text>
        <Text style={styles.infoValue}>
          {Application.nativeApplicationVersion ?? '—'}
          {Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''}
        </Text>
      </View>
    </View>

    <View style={styles.divider} />

    {/* Runtime policy (simple indicator) */}
    <View style={styles.infoRow}>
      <IconSymbol
        ios_icon_name="gearshape"
        android_material_icon_name="settings"
        size={24}
        color={colors.primary}
      />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>Runtime</Text>
        <Text style={styles.infoValue}>
          {Application.nativeApplicationVersion ? 'appVersion policy' : '—'}
        </Text>
      </View>
    </View>
  </View>
</View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Multi-User System</Text>
            
            <View style={styles.card}>
              <Text style={styles.featureText}>
                ✓ All team members can view all tracks and readings
              </Text>
              <Text style={styles.featureText}>
                ✓ Real-time synchronization across devices
              </Text>
              <Text style={styles.featureText}>
                ✓ Secure authentication with Supabase
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol
              ios_icon_name="arrow.right.square"
              android_material_icon_name="logout"
              size={24}
              color="#FF3B30"
            />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteAccountButton} 
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={24}
              color="#FF3B30"
            />
            {isDeleting ? (
              <ActivityIndicator color="#FF3B30" style={{ marginLeft: 12 }} />
            ) : (
              <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>

          {/* Extra bottom padding for comfortable scrolling */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 120,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    featureText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 8,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#FF3B30',
      gap: 12,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FF3B30',
    },
    deleteAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: '#FF3B30',
      gap: 12,
    },
    deleteAccountButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FF3B30',
    },
    bottomSpacer: {
      height: 40,
    },
  });
}
