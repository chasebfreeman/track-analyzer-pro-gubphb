
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
    
    // Initialize immediately without waiting
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('SupabaseAuthContext: Checking Supabase configuration...');
      const supabaseConfigured = isSupabaseConfigured();
      console.log('SupabaseAuthContext: Supabase configured:', supabaseConfigured);
      
      if (supabaseConfigured) {
        setIsSupabaseEnabled(true);
        
        // For web, use a non-blocking approach
        if (Platform.OS === 'web') {
          console.log('SupabaseAuthContext: Web platform - using non-blocking initialization');
          
          // Set up auth listener immediately
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('SupabaseAuthContext: Auth state changed:', _event);
            setSession(session);
            setUser(session?.user ?? null);
            setIsAuthenticated(!!session);
          });

          // Mark as loaded immediately so the app can render
          setIsLoading(false);
          console.log('SupabaseAuthContext: Web initialization complete (non-blocking)');

          // Try to get session in the background
          supabase.auth.getSession()
            .then(({ data: { session: initialSession }, error }) => {
              if (error) {
                console.error('SupabaseAuthContext: Error getting session:', error);
                return;
              }
              if (initialSession) {
                console.log('SupabaseAuthContext: Initial session found');
                setSession(initialSession);
                setUser(initialSession.user);
                setIsAuthenticated(true);
              } else {
                console.log('SupabaseAuthContext: No initial session');
              }
            })
            .catch((error) => {
              console.error('SupabaseAuthContext: Error getting session:', error);
            });

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // For native, use the normal approach with timeout
          await initializeSupabaseAuth();
        }
      } else {
        // Fallback to local auth
        setIsSupabaseEnabled(false);
        await initializeLocalAuth();
      }
    } catch (error) {
      console.error('SupabaseAuthContext: Error during initialization:', error);
      // Fallback to local auth if Supabase fails
      setIsSupabaseEnabled(false);
      await initializeLocalAuth();
    }
  };

  const initializeSupabaseAuth = async () => {
    try {
      console.log('SupabaseAuthContext: Initializing Supabase auth...');
      
      // For native, use a longer timeout
      const timeoutDuration = 5000;
      
      // Try to get session with a timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timeout')), timeoutDuration)
      );

      try {
        const { data: { session: initialSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('SupabaseAuthContext: Error getting session:', error);
          throw error;
        }

        console.log('SupabaseAuthContext: Initial session:', initialSession ? 'Found' : 'Not found');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsAuthenticated(!!initialSession);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('SupabaseAuthContext: Auth state changed:', _event);
          setSession(session);
          setUser(session?.user ?? null);
          setIsAuthenticated(!!session);
        });

        setIsLoading(false);
        console.log('SupabaseAuthContext: Supabase auth initialized successfully');

        return () => {
          subscription.unsubscribe();
        };
      } catch (sessionError) {
        console.error('SupabaseAuthContext: Session fetch failed or timed out:', sessionError);
        throw sessionError;
      }
    } catch (error) {
      console.error('SupabaseAuthContext: Error initializing Supabase auth:', error);
      // Fallback to local auth
      setIsSupabaseEnabled(false);
      await initializeLocalAuth();
    }
  };

  const initializeLocalAuth = async () => {
    try {
      console.log('SupabaseAuthContext: Initializing local PIN auth...');
      const pinSetup = await AuthService.isPinSetup();
      console.log('SupabaseAuthContext: PIN setup:', pinSetup);
      setIsPinSetup(pinSetup);
      
      if (!pinSetup) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('SupabaseAuthContext: Error checking PIN setup:', error);
      // Even if there's an error, set isPinSetup to false so user can set it up
      setIsPinSetup(false);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      console.log('SupabaseAuthContext: Local auth initialized');
    }
  };

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
