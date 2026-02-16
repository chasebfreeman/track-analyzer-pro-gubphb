
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  isSupabaseEnabled: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('SupabaseAuthProvider: Initializing auth state');
    
    // Delay initialization to ensure environment is ready
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          console.log('Initial session:', !!session);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Exception getting initial session:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    // Initialize after a short delay to ensure environment is ready
    const timer = setTimeout(() => {
      initializeAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      console.log('Auth not initialized yet, skipping auth state listener');
      return;
    }

    console.log('Setting up auth state listener');
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [isInitialized]);

  const signInWithEmail = async (email: string, password: string) => {
    console.log('Attempting sign in with email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Sign in error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('Sign in successful');
      return { success: true };
    } catch (error) {
      console.log('Sign in exception:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    console.log('Attempting sign up with email:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.log('Sign up error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('Sign up successful');
      return { success: true };
    } catch (error) {
      console.log('Sign up exception:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    console.log('User signing out');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        isSupabaseEnabled: isSupabaseConfigured(),
        signInWithEmail,
        signUpWithEmail,
        signOut,
        isLoading,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}
