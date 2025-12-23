
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { SupabaseStorageService } from '@/utils/supabaseStorage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function SettingsScreen() {
  const router = useRouter();
  const { 
    isSupabaseEnabled, 
    user, 
    signOut, 
    logout, 
    isAuthenticated 
  } = useSupabaseAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            if (isSupabaseEnabled) {
              await signOut();
            } else {
              logout();
            }
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const handleSyncData = async () => {
    if (!isSupabaseEnabled) {
      Alert.alert(
        'Supabase Not Configured',
        'Please enable Supabase to sync your data to the cloud.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Sync Local Data',
      'This will upload all your local tracks and readings to Supabase. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            setIsSyncing(true);
            try {
              await SupabaseStorageService.syncLocalToSupabase();
              Alert.alert('Success', 'All data synced to cloud successfully!');
            } catch (error) {
              console.error('Sync error:', error);
              Alert.alert('Error', 'Failed to sync data. Please try again.');
            } finally {
              setIsSyncing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Cloud Sync Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cloud Sync</Text>
          
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <IconSymbol
                ios_icon_name={isSupabaseEnabled ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                android_material_icon_name={isSupabaseEnabled ? 'check-circle' : 'cancel'}
                size={24}
                color={isSupabaseEnabled ? '#4CAF50' : colors.textSecondary}
              />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  {isSupabaseEnabled ? 'Cloud Sync Enabled' : 'Cloud Sync Disabled'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {isSupabaseEnabled 
                    ? 'Data synced across all team members' 
                    : 'Using local storage only'}
                </Text>
              </View>
            </View>

            {isSupabaseEnabled && user && (
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            )}
          </View>

          {isSupabaseEnabled && (
            <TouchableOpacity
              style={[styles.button, isSyncing && styles.buttonDisabled]}
              onPress={handleSyncData}
              disabled={isSyncing}
            >
              <IconSymbol
                ios_icon_name="arrow.triangle.2.circlepath"
                android_material_icon_name="sync"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.buttonText}>
                {isSyncing ? 'Syncing...' : 'Sync Local Data to Cloud'}
              </Text>
            </TouchableOpacity>
          )}

          {!isSupabaseEnabled && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                To enable cloud syncing for your team:
              </Text>
              <Text style={styles.infoStep}>1. Press the Supabase button in Natively</Text>
              <Text style={styles.infoStep}>2. Connect to your Supabase project</Text>
              <Text style={styles.infoStep}>3. Run the database setup SQL</Text>
              <Text style={styles.infoStep}>4. Restart the app</Text>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.card} onPress={handleLogout}>
            <View style={styles.menuItem}>
              <IconSymbol
                ios_icon_name="rectangle.portrait.and.arrow.right"
                android_material_icon_name="logout"
                size={24}
                color={colors.error}
              />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.card}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
            
            <Text style={[styles.infoLabel, { marginTop: 16 }]}>Team Capacity</Text>
            <Text style={styles.infoValue}>6-10 users</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    fontWeight: '600',
  },
  infoStep: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    paddingLeft: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
});
