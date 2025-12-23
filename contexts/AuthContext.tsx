
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '@/utils/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isPinSetup: boolean;
  authenticate: (pin: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  logout: () => void;
  authenticateWithBiometrics: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinSetup, setIsPinSetup] = useState(false);

  useEffect(() => {
    checkPinSetup();
  }, []);

  const checkPinSetup = async () => {
    try {
      const pinSetup = await AuthService.isPinSetup();
      setIsPinSetup(pinSetup);
      
      // If no PIN is setup, user needs to create one
      if (!pinSetup) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking PIN setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async (pin: string): Promise<boolean> => {
    try {
      const isValid = await AuthService.verifyPin(pin);
      if (isValid) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error authenticating:', error);
      return false;
    }
  };

  const setupPin = async (pin: string): Promise<void> => {
    try {
      await AuthService.setupPin(pin);
      setIsPinSetup(true);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw error;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const success = await AuthService.authenticateWithBiometrics();
      if (success) {
        setIsAuthenticated(true);
      }
      return success;
    } catch (error) {
      console.error('Error authenticating with biometrics:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isPinSetup,
        authenticate,
        setupPin,
        logout,
        authenticateWithBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
