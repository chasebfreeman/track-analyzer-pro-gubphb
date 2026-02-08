
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
import { useRouter, Stack } from 'expo-router';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { useThemeColors } from '@/styles/commonStyles';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';

const getStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 120,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      marginLeft: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    settingIcon: {
      marginRight: 12,
    },
    settingText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    logoutButton: {
      backgroundColor: '#FF3B30',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    logoutText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    deleteAccountButton: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: '#FF3B30',
    },
    deleteAccountText: {
      color: '#FF3B30',
      fontSize: 16,
      fontWeight: '600',
    },
    versionText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 24,
      marginBottom: 40,
    },
  });

export default function SettingsScreen() {
  console.log('User opened Settings screen');
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { signOut, user } = useSupabaseAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    console.log('User tapped Logout button');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('User cancelled logout'),
        },
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
        console.error('No user ID found');
        Alert.alert('Error', 'Unable to delete account. Please try logging out and back in.');
        setIsDeleting(false);
        return;
      }

      console.log('Deleting user data for user ID:', user.id);

      // Delete all readings associated with user
      console.log('Deleting readings...');
      const { error: readingsError } = await supabase
        .from('readings')
        .delete()
        .eq('user_id', user.id);

      if (readingsError) {
        console.error('Error deleting readings:', readingsError);
        throw new Error('Failed to delete readings');
      }

      // Delete all tracks associated with user
      console.log('Deleting tracks...');
      const { error: tracksError } = await supabase
        .from('tracks')
        .delete()
        .eq('user_id', user.id);

      if (tracksError) {
        console.error('Error deleting tracks:', tracksError);
        throw new Error('Failed to delete tracks');
      }

      // Delete team member entry
      console.log('Deleting team member entry...');
      const { error: teamError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id);

      if (teamError) {
        console.error('Error deleting team member:', teamError);
        // Don't throw - this might not exist
      }

      // Delete user profiles
      console.log('Deleting user profiles...');
      const { error: profilesError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user.id);

      if (profilesError) {
        console.error('Error deleting user profiles:', profilesError);
        // Don't throw - this might not exist
      }

      // Delete the auth user account (this must be done last)
      console.log('Deleting auth account...');
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError);
        // Try alternative method - sign out and let user know
        console.log('Attempting to sign out user instead');
        await signOut();
        Alert.alert(
          'Account Data Deleted',
          'Your data has been deleted. Please contact support to complete account deletion.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
        return;
      }

      console.log('Account deletion completed successfully');
      
      // Sign out and redirect
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
    } catch (error) {
      console.error('Error during account deletion:', error);
      Alert.alert(
        'Error',
        'An error occurred while deleting your account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.section}>
            <View style={styles.settingItem}>
              <IconSymbol
                ios_icon_name="person.circle"
                android_material_icon_name="account-circle"
                size={24}
                color={colors.primary}
                style={styles.settingIcon}
              />
              <Text style={styles.settingText}>{user?.email || 'Not logged in'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicy}>
              <IconSymbol
                ios_icon_name="doc.text"
                android_material_icon_name="description"
                size={24}
                color={colors.primary}
                style={styles.settingIcon}
              />
              <Text style={styles.settingText}>Privacy Policy</Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.deleteAccountButton} 
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FF3B30" />
              ) : (
                <Text style={styles.deleteAccountText}>Delete Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Track Analyzer Pro v1.1</Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
