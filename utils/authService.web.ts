
// Web-specific auth service using localStorage instead of SecureStore
const PIN_KEY = 'user_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    // Test if we can actually use it
    const testKey = '__auth_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage not available:', error);
    return false;
  }
};

// In-memory fallback storage
const memoryStorage: { [key: string]: string } = {};

const getItem = (key: string): string | null => {
  try {
    if (isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    } else {
      return memoryStorage[key] || null;
    }
  } catch (error) {
    console.error('Error getting item:', error);
    return memoryStorage[key] || null;
  }
};

const setItem = (key: string, value: string): void => {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    } else {
      memoryStorage[key] = value;
    }
  } catch (error) {
    console.error('Error setting item:', error);
    memoryStorage[key] = value;
  }
};

const removeItem = (key: string): void => {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    } else {
      delete memoryStorage[key];
    }
  } catch (error) {
    console.error('Error removing item:', error);
    delete memoryStorage[key];
  }
};

export const AuthService = {
  // Check if PIN is set up
  async isPinSetup(): Promise<boolean> {
    try {
      const pin = getItem(PIN_KEY);
      return pin !== null;
    } catch (error) {
      console.error('Error checking PIN setup:', error);
      return false;
    }
  },

  // Set up a new PIN
  async setupPin(pin: string): Promise<void> {
    try {
      setItem(PIN_KEY, pin);
      console.log('PIN setup successfully');
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw error;
    }
  },

  // Verify PIN
  async verifyPin(pin: string): Promise<boolean> {
    try {
      const storedPin = getItem(PIN_KEY);
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
      setItem(PIN_KEY, newPin);
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
      removeItem(PIN_KEY);
      removeItem(BIOMETRIC_ENABLED_KEY);
      console.log('PIN reset successfully');
    } catch (error) {
      console.error('Error resetting PIN:', error);
      throw error;
    }
  },

  // Check if biometric authentication is available (not available on web)
  async isBiometricAvailable(): Promise<boolean> {
    return false;
  },

  // Get supported authentication types (none on web)
  async getSupportedAuthTypes(): Promise<string[]> {
    return [];
  },

  // Authenticate with biometrics (not available on web)
  async authenticateWithBiometrics(): Promise<boolean> {
    console.log('Biometric authentication not available on web');
    return false;
  },

  // Check if biometric is enabled (always false on web)
  async isBiometricEnabled(): Promise<boolean> {
    return false;
  },

  // Enable/disable biometric authentication (no-op on web)
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    console.log('Biometric authentication not available on web');
  },
};
