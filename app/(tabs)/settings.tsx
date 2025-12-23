
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '@/utils/authService';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function SettingsScreen() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [authTypes, setAuthTypes] = useState<string[]>([]);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const available = await AuthService.isBiometricAvailable();
    const enabled = await AuthService.isBiometricEnabled();
    const types = await AuthService.getSupportedAuthTypes();
    
    setBiometricAvailable(available);
    setBiometricEnabled(enabled);
    setAuthTypes(types);
  };

  const handleToggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        // Test biometric authentication before enabling
        const success = await AuthService.authenticateWithBiometrics();
        if (success) {
          await AuthService.setBiometricEnabled(true);
          setBiometricEnabled(true);
          Alert.alert('Success', 'Biometric authentication enabled');
        } else {
          Alert.alert('Error', 'Biometric authentication failed');
        }
      } else {
        await AuthService.setBiometricEnabled(false);
        setBiometricEnabled(false);
        Alert.alert('Success', 'Biometric authentication disabled');
      }
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const handleChangePin = () => {
    Alert.alert(
      'Change PIN',
      'This feature will allow you to change your PIN',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            Alert.alert('Coming Soon', 'PIN change feature will be available soon');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Lock App',
      'Are you sure you want to lock the app? You will need to enter your PIN to access it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="gearshape.fill"
            android_material_icon_name="settings"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          {biometricAvailable && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <IconSymbol
                  ios_icon_name={authTypes.includes('Face ID') ? 'faceid' : 'touchid'}
                  android_material_icon_name="fingerprint"
                  size={24}
                  color={colors.text}
                />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>
                    {authTypes.join(' / ')}
                  </Text>
                  <Text style={styles.settingDescription}>
                    Use biometric authentication to unlock the app
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleChangePin}
          >
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="key.fill"
                android_material_icon_name="vpn_key"
                size={24}
                color={colors.text}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Change PIN</Text>
                <Text style={styles.settingDescription}>
                  Update your security PIN
                </Text>
              </View>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLogout}
          >
            <View style={styles.settingInfo}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={24}
                color={colors.error}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.error }]}>
                  Lock App
                </Text>
                <Text style={styles.settingDescription}>
                  Lock the app and require PIN to access
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your data is secured with encryption and stored locally on your device.
          </Text>
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
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: 40,
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
