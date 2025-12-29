
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { AuthService } from '@/utils/authService';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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
  const [isSupabaseEnabled, setIsSupabaseEnabled] = useState(false);

  useEffect(() => {
    console.log('SupabaseAuthContext: Initializing... Platform:', Platform.OS);
    
    let mounted = true;
    let authSubscription: any = null;

    const initialize = async () => {
      try {
        // Check Supabase configuration synchronously
        const supabaseConfigured = isSupabaseConfigured();
        console.log('SupabaseAuthContext: Supabase configured:', supabaseConfigured);
        
        if (supabaseConfigured) {
          if (!mounted) return;
          setIsSupabaseEnabled(true);
          
          // Set up auth listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('SupabaseAuthContext: Auth state changed:', _event);
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            setIsAuthenticated(!!session);
          });
          authSubscription = subscription;

          // Try to get initial session with timeout
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout')), 500)
            );
            
            const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
            
            if (!mounted) return;
            
            if (result.error) {
              console.error('SupabaseAuthContext: Error getting session:', result.error);
            } else if (result.data?.session) {
              console.log('SupabaseAuthContext: Initial session found');
              setSession(result.data.session);
              setUser(result.data.session.user);
              setIsAuthenticated(true);
            } else {
              console.log('SupabaseAuthContext: No initial session');
            }
          } catch (error) {
            console.log('SupabaseAuthContext: Session check timed out or failed, continuing without session');
          }
        } else {
          // Fallback to local auth
          console.log('SupabaseAuthContext: Supabase not configured, using local auth');
          if (!mounted) return;
          setIsSupabaseEnabled(false);
          
          try {
            const pinSetup = await AuthService.isPinSetup();
            console.log('SupabaseAuthContext: PIN setup:', pinSetup);
            if (!mounted) return;
            setIsPinSetup(pinSetup);
            
            if (!pinSetup) {
              setIsAuthenticated(false);
            }
          } catch (error) {
            console.error('SupabaseAuthContext: Error checking PIN setup:', error);
            if (!mounted) return;
            setIsPinSetup(false);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('SupabaseAuthContext: Error during initialization:', error);
        // Fallback to local auth on error
        if (!mounted) return;
        setIsSupabaseEnabled(false);
        
        try {
          const pinSetup = await AuthService.isPinSetup();
          if (!mounted) return;
          setIsPinSetup(pinSetup);
          if (!pinSetup) {
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.error('SupabaseAuthContext: Error in fallback:', err);
          if (!mounted) return;
          setIsPinSetup(false);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log('SupabaseAuthContext: Initialization complete');
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Supabase auth methods
  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('SupabaseAuthContext: Signing in with email...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('SupabaseAuthContext: Sign in error:', error);
        return { success: false, error: error.message };
      }

      console.log('SupabaseAuthContext: Sign in successful');
      return { success: true };
    } catch (error) {
      console.error('SupabaseAuthContext: Error signing in:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('SupabaseAuthContext: Signing up with email...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed'
        }
      });

      if (error) {
        console.error('SupabaseAuthContext: Sign up error:', error);
        return { success: false, error: error.message };
      }

      console.log('SupabaseAuthContext: Sign up successful');
      return { success: true };
    } catch (error) {
      console.error('SupabaseAuthContext: Error signing up:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      console.log('SupabaseAuthContext: Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      console.log('SupabaseAuthContext: Sign out successful');
    } catch (error) {
      console.error('SupabaseAuthContext: Error signing out:', error);
    }
  };

  // Local PIN auth methods (fallback)
  const authenticate = async (pin: string): Promise<boolean> => {
    try {
      console.log('SupabaseAuthContext: Authenticating with PIN...');
      const isValid = await AuthService.verifyPin(pin);
      if (isValid) {
        setIsAuthenticated(true);
        console.log('SupabaseAuthContext: PIN authentication successful');
        return true;
      }
      console.log('SupabaseAuthContext: PIN authentication failed');
      return false;
    } catch (error) {
      console.error('SupabaseAuthContext: Error authenticating:', error);
      return false;
    }
  };

  const setupPin = async (pin: string): Promise<void> => {
    try {
      console.log('SupabaseAuthContext: Setting up PIN...');
      await AuthService.setupPin(pin);
      setIsPinSetup(true);
      setIsAuthenticated(true);
      console.log('SupabaseAuthContext: PIN setup successful');
    } catch (error) {
      console.error('SupabaseAuthContext: Error setting up PIN:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('SupabaseAuthContext: Logging out (local)...');
    setIsAuthenticated(false);
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      console.log('SupabaseAuthContext: Authenticating with biometrics...');
      const success = await AuthService.authenticateWithBiometrics();
      if (success) {
        setIsAuthenticated(true);
        console.log('SupabaseAuthContext: Biometric authentication successful');
      }
      return success;
    } catch (error) {
      console.error('SupabaseAuthContext: Error authenticating with biometrics:', error);
      return false;
    }
  };

  console.log('SupabaseAuthContext: Rendering provider, isLoading:', isLoading);

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
