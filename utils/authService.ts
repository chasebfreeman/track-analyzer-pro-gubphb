
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY = 'user_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export const AuthService = {
  // Check if PIN is set up
  async isPinSetup(): Promise<boolean> {
    try {
      const pin = await SecureStore.getItemAsync(PIN_KEY);
      return pin !== null;
    } catch (error) {
      console.error('Error checking PIN setup:', error);
      return false;
    }
  },

  // Set up a new PIN
  async setupPin(pin: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
      console.log('PIN setup successfully');
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw error;
    }
  },

  // Verify PIN
  async verifyPin(pin: string): Promise<boolean> {
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_KEY);
      return storedPin === pin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  },

  // Change PIN
  async changePin(oldPin: string, newPin: string): Promise<boolean> {
    try {
      const isValid = await this.verifyPin(oldPin);
      if (!isValid) {
        return false;
      }
      await SecureStore.setItemAsync(PIN_KEY, newPin);
      console.log('PIN changed successfully');
      return true;
    } catch (error) {
      console.error('Error changing PIN:', error);
      return false;
    }
  },

  // Reset PIN (for development/testing - remove in production)
  async resetPin(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      console.log('PIN reset successfully');
    } catch (error) {
      console.error('Error resetting PIN:', error);
      throw error;
    }
  },

  // Check if biometric authentication is available
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  },

  // Get supported authentication types
  async getSupportedAuthTypes(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const typeNames: string[] = [];
      
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        typeNames.push('Fingerprint');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        typeNames.push('Face ID');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        typeNames.push('Iris');
      }
      
      return typeNames;
    } catch (error) {
      console.error('Error getting supported auth types:', error);
      return [];
    }
  },

  // Authenticate with biometrics
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Track Specialist',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      
      return result.success;
    } catch (error) {
      console.error('Error authenticating with biometrics:', error);
      return false;
    }
  },

  // Check if biometric is enabled
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled:', error);
      return false;
    }
  },

  // Enable/disable biometric authentication
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
      console.log('Biometric authentication', enabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('Error setting biometric enabled:', error);
      throw error;
    }
  },
};
