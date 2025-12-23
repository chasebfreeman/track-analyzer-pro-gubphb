
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function SetupPinScreen() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const router = useRouter();
  const { setupPin } = useAuth();

  const handlePinInput = (digit: string) => {
    if (step === 'enter') {
      if (pin.length < 4) {
        setPin(pin + digit);
      }
      if (pin.length === 3) {
        // Move to confirm step
        setTimeout(() => setStep('confirm'), 100);
      }
    } else {
      if (confirmPin.length < 4) {
        setConfirmPin(confirmPin + digit);
      }
      if (confirmPin.length === 3) {
        // Check if PINs match
        const fullConfirmPin = confirmPin + digit;
        const fullPin = pin;
        
        if (fullPin === fullConfirmPin) {
          handleSetupPin(fullPin);
        } else {
          Alert.alert('Error', 'PINs do not match. Please try again.');
          setPin('');
          setConfirmPin('');
          setStep('enter');
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin(confirmPin.slice(0, -1));
      } else {
        setStep('enter');
      }
    }
  };

  const handleSetupPin = async (pinValue: string) => {
    try {
      await setupPin(pinValue);
      Alert.alert('Success', 'PIN created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/tracks'),
        },
      ]);
    } catch (error) {
      console.error('Error setting up PIN:', error);
      Alert.alert('Error', 'Failed to create PIN. Please try again.');
      setPin('');
      setConfirmPin('');
      setStep('enter');
    }
  };

  const renderPinDots = () => {
    const currentPin = step === 'enter' ? pin : confirmPin;
    return (
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              currentPin.length > index && styles.pinDotFilled,
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
            ios_icon_name="lock.shield"
            android_material_icon_name="security"
            size={60}
            color={colors.primary}
          />
          <Text style={styles.title}>
            {step === 'enter' ? 'Create Your PIN' : 'Confirm Your PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'enter'
              ? 'Enter a 4-digit PIN to secure your data'
              : 'Re-enter your PIN to confirm'}
          </Text>
        </View>

        {renderPinDots()}
        {renderKeypad()}
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
});
