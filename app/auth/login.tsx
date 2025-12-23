
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/utils/authService';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [authTypes, setAuthTypes] = useState<string[]>([]);
  const router = useRouter();
  const { authenticate, authenticateWithBiometrics } = useAuth();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await AuthService.isBiometricAvailable();
    const enabled = await AuthService.isBiometricEnabled();
    const types = await AuthService.getSupportedAuthTypes();
    
    setBiometricAvailable(available);
    setBiometricEnabled(enabled);
    setAuthTypes(types);

    // Auto-trigger biometric if available and enabled
    if (available && enabled) {
      handleBiometricAuth();
    }
  };

  const handlePinInput = async (digit: string) => {
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      const isValid = await authenticate(newPin);
      if (isValid) {
        router.replace('/(tabs)/tracks');
      } else {
        Alert.alert('Error', 'Incorrect PIN. Please try again.');
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleBiometricAuth = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      router.replace('/(tabs)/tracks');
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keyButton} />;
              }
              if (key === 'back') {
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={styles.keyButton}
                    onPress={handleBackspace}
                  >
                    <IconSymbol
                      ios_icon_name="delete.left"
                      android_material_icon_name="backspace"
                      size={28}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={keyIndex}
                  style={styles.keyButton}
                  onPress={() => handlePinInput(key)}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="lock.shield.fill"
            android_material_icon_name="security"
            size={60}
            color={colors.primary}
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your PIN to continue</Text>
        </View>

        {renderPinDots()}
        {renderKeypad()}

        {biometricAvailable && biometricEnabled && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <IconSymbol
              ios_icon_name={authTypes.includes('Face ID') ? 'faceid' : 'touchid'}
              android_material_icon_name="fingerprint"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.biometricText}>
              Use {authTypes.join(' or ')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 40,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keypad: {
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 16,
  },
  keyButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keyText: {
    fontSize: 32,
    fontWeight: '400',
    color: colors.text,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
