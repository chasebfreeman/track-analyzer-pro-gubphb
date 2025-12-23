
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://fdgnmcaxiclsqlydftpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZ25tY2F4aWNsc3FseWRmdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDY2MjIsImV4cCI6MjA4MjA4MjYyMn0.uDqknuhqE31APx3wv-L7Wm6dcfafdO5GI5KLC2DOFnE';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  const configured = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
  console.log('Supabase configured (web):', configured);
  return configured;
};

// Simple localStorage wrapper with error handling
const createStorageAdapter = () => {
  return {
    getItem: (key: string) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const value = window.localStorage.getItem(key);
          return value;
        }
      } catch (error) {
        console.error('Error getting item from localStorage:', error);
      }
      return null;
    },
    setItem: (key: string, value: string) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        console.error('Error setting item in localStorage:', error);
      }
    },
    removeItem: (key: string) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('Error removing item from localStorage:', error);
      }
    },
  };
};

// Create Supabase client with localStorage for session persistence on web
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

console.log('Supabase client initialized (web)');
