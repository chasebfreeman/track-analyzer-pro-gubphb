
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

// Simple localStorage wrapper with error handling and fallback
const createStorageAdapter = () => {
  // Check if localStorage is available
  const isLocalStorageAvailable = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      // Test if we can actually use it
      const testKey = '__supabase_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage not available:', error);
      return false;
    }
  };

  const hasLocalStorage = isLocalStorageAvailable();
  console.log('localStorage available:', hasLocalStorage);

  // In-memory fallback storage
  const memoryStorage: { [key: string]: string } = {};

  return {
    getItem: (key: string) => {
      try {
        if (hasLocalStorage) {
          const value = window.localStorage.getItem(key);
          return value;
        } else {
          return memoryStorage[key] || null;
        }
      } catch (error) {
        console.error('Error getting item from storage:', error);
        return memoryStorage[key] || null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        if (hasLocalStorage) {
          window.localStorage.setItem(key, value);
        } else {
          memoryStorage[key] = value;
        }
      } catch (error) {
        console.error('Error setting item in storage:', error);
        memoryStorage[key] = value;
      }
    },
    removeItem: (key: string) => {
      try {
        if (hasLocalStorage) {
          window.localStorage.removeItem(key);
        } else {
          delete memoryStorage[key];
        }
      } catch (error) {
        console.error('Error removing item from storage:', error);
        delete memoryStorage[key];
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
  global: {
    fetch: (url, options = {}) => {
      // Add timeout to all fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});

console.log('Supabase client initialized (web)');
