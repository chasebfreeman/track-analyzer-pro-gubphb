
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { AuthService } from '@/utils/authService';
import { Session, User } from '@supabase/supabase-js';

interface SupabaseAuthContextType {
  // Supabase auth
  user: User | null;
  session: Session | null;
  isSupabaseEnabled: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  
  // Local PIN auth (fallback)
  isAuthenticated: boolean;
  isLoading: boolean;
  isPinSetup: boolean;
  authenticate: (pin: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  logout: () => void;
  authenticateWithBiometrics: () => Promise<boolean>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const isSupabaseEnabled = isSupabaseConfigured();

  useEffect(() => {
    if (isSupabaseEnabled) {
      initializeSupabaseAuth();
    } else {
      initializeLocalAuth();
    }
  }, [isSupabaseEnabled]);

  const initializeSupabaseAuth = async () => {
    try {
      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsAuthenticated(!!initialSession);

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('Auth state changed:', _event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
      });

      setIsLoading(false);

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing Supabase auth:', error);
      setIsLoading(false);
    }
  };

  const initializeLocalAuth = async () => {
    try {
      const pinSetup = await AuthService.isPinSetup();
      setIsPinSetup(pinSetup);
      
      if (!pinSetup) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking PIN setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Supabase auth methods
  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Local PIN auth methods (fallback)
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
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        isSupabaseEnabled,
        signInWithEmail,
        signUpWithEmail,
        signOut,
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
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
