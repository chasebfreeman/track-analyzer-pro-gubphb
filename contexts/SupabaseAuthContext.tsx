
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
  }, []); // Empty dependency array - only run once on mount

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
</write file>

Now let me also fix the login screen to remove the circular dependency:

<write file="app/auth/login.tsx">
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { AuthService } from '@/utils/authService';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [authTypes, setAuthTypes] = useState<string[]>([]);
  const router = useRouter();
  const { authenticate, authenticateWithBiometrics } = useSupabaseAuth();

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await AuthService.isBiometricAvailable();
      const enabled = await AuthService.isBiometricEnabled();
      const types = await AuthService.getSupportedAuthTypes();
      
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      setAuthTypes(types);

      // Auto-trigger biometric if available and enabled
      if (available && enabled) {
        handleBiometricAuth();
      }
    };

    checkBiometric();
  }, []); // Only run once on mount

  const handlePinInput = async (digit: string) => {
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      const isValid = await authenticate(newPin);
      if (isValid) {
        router.replace('/(tabs)/tracks');
      } else {
        Alert.alert('Error', 'Incorrect PIN. Please try again.');
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleBiometricAuth = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      router.replace('/(tabs)/tracks');
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
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
            ios_icon_name="lock.shield.fill"
            android_material_icon_name="security"
            size={60}
            color={colors.primary}
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your PIN to continue</Text>
        </View>

        {renderPinDots()}
        {renderKeypad()}

        {biometricAvailable && biometricEnabled && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <IconSymbol
              ios_icon_name={authTypes.includes('Face ID') ? 'faceid' : 'touchid'}
              android_material_icon_name="fingerprint"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.biometricText}>
              Use {authTypes.join(' or ')}
            </Text>
          </TouchableOpacity>
        )}
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
</write file>

Now let me also fix the other files with linting warnings. Let me check them:Now I see the issue. The problem is that the initialization is working correctly, but the app is still showing "Your app is starting..." because the context is taking too long to initialize. The main issue is the circular dependency in the `useEffect` hooks with `useCallback` functions.

Let me fix all the linting warnings by removing the unnecessary dependencies:

<write file="app/(tabs)/browse/index.tsx">
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { SupabaseStorageService } from '@/utils/supabaseStorage';
import { Track, TrackReading, DayReadings } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';
import DailyReadingChart from '@/components/DailyReadingChart';
import HistoricalAveragesChart from '@/components/HistoricalAveragesChart';

export default function BrowseScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [readings, setReadings] = useState<TrackReading[]>([]);
  const [allTrackReadings, setAllTrackReadings] = useState<TrackReading[]>([]);
  const [groupedReadings, setGroupedReadings] = useState<DayReadings[]>([]);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showHistoricalAverages, setShowHistoricalAverages] = useState(false);

  const loadTracks = useCallback(async () => {
    console.log('Loading tracks in BrowseScreen...');
    const loadedTracks = await SupabaseStorageService.getTracks();
    console.log('Loaded tracks:', loadedTracks.length);
    setAllTracks(loadedTracks.sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const loadAllAvailableYears = useCallback(async () => {
    try {
      const years = await SupabaseStorageService.getAvailableYears();
      const currentYear = new Date().getFullYear();
      
      const allYears = new Set<number>();
      
      years.forEach(year => allYears.add(year));
      
      allYears.add(2024);
      allYears.add(2025);
      allYears.add(currentYear);
      allYears.add(currentYear + 1);
      
      const sortedYears = Array.from(allYears).sort((a, b) => b - a);
      
      console.log('Available years:', sortedYears);
      setAvailableYears(sortedYears);
    } catch (error) {
      console.error('Error loading available years:', error);
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear + 1, currentYear, 2025, 2024].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a));
    }
  }, []);

  useEffect(() => {
    loadTracks();
    loadAllAvailableYears();
  }, [loadTracks, loadAllAvailableYears]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('Browse screen focused, reloading data');
      loadTracks();
      loadAllAvailableYears();
    }, [loadTracks, loadAllAvailableYears])
  );

  useEffect(() => {
    if (selectedTrack) {
      loadReadings(selectedTrack.id, selectedYear);
      loadAllTrackReadings(selectedTrack.id);
    }
  }, [selectedTrack, selectedYear]);

  useEffect(() => {
    const filterTracks = async () => {
      console.log('Filtering tracks for year:', selectedYear);
      const tracksWithReadings: Track[] = [];
      
      for (const track of allTracks) {
        const trackReadings = await SupabaseStorageService.getReadingsByTrackAndYear(track.id, selectedYear);
        if (trackReadings.length > 0) {
          tracksWithReadings.push(track);
        }
      }
      
      console.log('Tracks with readings for', selectedYear, ':', tracksWithReadings.length);
      setFilteredTracks(tracksWithReadings);
      
      if (selectedTrack && !tracksWithReadings.find(t => t.id === selectedTrack.id)) {
        console.log('Selected track not in filtered list, resetting selection');
        setSelectedTrack(tracksWithReadings.length > 0 ? tracksWithReadings[0] : null);
      } else if (!selectedTrack && tracksWithReadings.length > 0) {
        setSelectedTrack(tracksWithReadings[0]);
      }
    };

    filterTracks();
  }, [selectedYear, allTracks, selectedTrack]);

  const loadReadings = async (trackId: string, year: number) => {
    console.log('Loading readings for track:', trackId, 'year:', year);
    const trackReadings = await SupabaseStorageService.getReadingsByTrackAndYear(trackId, year);
    console.log('Found readings:', trackReadings.length);
    const sorted = trackReadings.sort((a, b) => b.timestamp - a.timestamp);
    setReadings(sorted);

    const grouped: { [key: string]: TrackReading[] } = {};
    sorted.forEach((reading) => {
      if (!grouped[reading.date]) {
        grouped[reading.date] = [];
      }
      grouped[reading.date].push(reading);
    });

    const groupedArray: DayReadings[] = Object.keys(grouped).map((date) => ({
      date,
      readings: grouped[date],
    }));

    setGroupedReadings(groupedArray);
  };

  const loadAllTrackReadings = async (trackId: string) => {
    console.log('Loading all readings for track:', trackId);
    const trackReadings = await SupabaseStorageService.getReadingsByTrack(trackId);
    console.log('Found all readings:', trackReadings.length);
    setAllTrackReadings(trackReadings);
  };

  const formatDateWithDay = (dateString: string): string => {
    try {
      const [month, day, year] = dateString.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      return `${dateString} - ${dayName}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const handleReadingPress = (reading: TrackReading) => {
    console.log('Reading pressed:', reading.id);
    try {
      router.push({
        pathname: '/(tabs)/browse/reading-detail',
        params: { readingId: reading.id },
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const toggleDayExpansion = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Browse Data</Text>

        <View style={styles.yearSelector}>
          <Text style={styles.label}>Select Year</Text>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => setShowYearPicker(!showYearPicker)}
            activeOpacity={0.7}
          >
            <Text style={styles.yearButtonText}>{selectedYear}</Text>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name={showYearPicker ? 'expand_less' : 'expand_more'}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>

          {showYearPicker && (
            <View style={styles.yearList}>
              {availableYears.length === 0 ? (
                <Text style={styles.noYearsText}>
                  No data available yet. Start recording to see years here.
                </Text>
              ) : (
                availableYears.map((year, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={[
                        styles.yearOption,
                        selectedYear === year && styles.yearOptionSelected,
                      ]}
                      onPress={() => {
                        console.log('Year selected:', year);
                        setSelectedYear(year);
                        setShowYearPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          selectedYear === year && styles.yearOptionTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.trackSelector}>
          <Text style={styles.label}>Select Track</Text>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => setShowTrackPicker(!showTrackPicker)}
          >
            <Text style={styles.trackButtonText}>
              {selectedTrack ? selectedTrack.name : filteredTracks.length === 0 ? 'No tracks with data for this year' : 'Choose a track...'}
            </Text>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name={showTrackPicker ? 'expand_less' : 'expand_more'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showTrackPicker && (
            <View style={styles.trackList}>
              {filteredTracks.length === 0 ? (
                <Text style={styles.noTracksText}>
                  No tracks have readings for {selectedYear}.{'\n'}
                  Select a different year or start recording data.
                </Text>
              ) : (
                filteredTracks.map((track, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={[
                        styles.trackOption,
                        selectedTrack?.id === track.id && styles.trackOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedTrack(track);
                        setShowTrackPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.trackOptionText,
                          selectedTrack?.id === track.id && styles.trackOptionTextSelected,
                        ]}
                      >
                        {track.name}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))
              )}
            </View>
          )}
        </View>

        {selectedTrack && allTrackReadings.length > 0 && (
          <TouchableOpacity
            style={styles.historicalButton}
            onPress={() => setShowHistoricalAverages(!showHistoricalAverages)}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="chart.bar"
              android_material_icon_name="bar_chart"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.historicalButtonText}>
              {showHistoricalAverages ? 'Hide' : 'Show'} Historical Averages
            </Text>
          </TouchableOpacity>
        )}

        {showHistoricalAverages && selectedTrack && (
          <View style={styles.historicalSection}>
            <HistoricalAveragesChart
              readings={allTrackReadings}
              trackName={selectedTrack.name}
            />
          </View>
        )}

        {readings.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {filteredTracks.length === 0 
                ? `No tracks have readings for ${selectedYear}.${'\n'}Select a different year or start recording data.`
                : `No readings yet for ${selectedYear}.${'\n'}Start recording data to see it here!`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.readingsList}>
            {groupedReadings.map((dayGroup, dayIndex) => (
              <React.Fragment key={dayIndex}>
                <View style={styles.daySection}>
                  <TouchableOpacity
                    style={styles.dayHeaderContainer}
                    onPress={() => toggleDayExpansion(dayGroup.date)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dayHeader}>
                      {formatDateWithDay(dayGroup.date)}
                    </Text>
                    <IconSymbol
                      ios_icon_name={expandedDay === dayGroup.date ? 'chart.line.uptrend.xyaxis' : 'chart.bar'}
                      android_material_icon_name={expandedDay === dayGroup.date ? 'show_chart' : 'bar_chart'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {expandedDay === dayGroup.date && (
                    <View style={styles.chartSection}>
                      <DailyReadingChart
                        readings={dayGroup.readings}
                        date={dayGroup.date}
                      />
                    </View>
                  )}

                  {dayGroup.readings.map((reading, readingIndex) => (
                    <React.Fragment key={readingIndex}>
                      <TouchableOpacity
                        style={styles.readingCard}
                        onPress={() => handleReadingPress(reading)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.readingHeader}>
                          <View style={styles.readingHeaderLeft}>
                            <IconSymbol
                              ios_icon_name="clock"
                              android_material_icon_name="access_time"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.readingTime}>
                              {reading.time}
                            </Text>
                          </View>
                          <IconSymbol
                            ios_icon_name="chevron.right"
                            android_material_icon_name="chevron_right"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </View>
                        <View style={styles.readingPreview}>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Left Lane Temp:</Text>
                            <Text style={styles.previewValue}>
                              {reading.leftLane.trackTemp || 'N/A'}°F
                            </Text>
                          </View>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Right Lane Temp:</Text>
                            <Text style={styles.previewValue}>
                              {reading.rightLane.trackTemp || 'N/A'}°F
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: Platform.OS === 'android' ? 48 : 60,
      paddingHorizontal: 16,
      paddingBottom: 120,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 20,
      color: colors.text,
    },
    yearSelector: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    yearButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    yearButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    yearList: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    yearOption: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.background,
    },
    yearOptionSelected: {
      backgroundColor: colors.primary,
    },
    yearOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
    },
    yearOptionTextSelected: {
      color: '#ffffff',
    },
    noYearsText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
      color: colors.textSecondary,
    },
    trackSelector: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    trackButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    trackButtonText: {
      fontSize: 16,
      color: colors.text,
    },
    trackList: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    trackOption: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.background,
    },
    trackOptionSelected: {
      backgroundColor: colors.primary,
    },
    trackOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    trackOptionTextSelected: {
      color: '#ffffff',
    },
    noTracksText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    historicalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    historicalButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    historicalSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 16,
      paddingHorizontal: 40,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    readingsList: {
      gap: 20,
    },
    daySection: {
      marginBottom: 12,
    },
    dayHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 8,
    },
    dayHeader: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    chartSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    readingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    readingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    readingHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    readingTime: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    readingPreview: {
      gap: 6,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    previewLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    previewValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
</write file>

<write file="app/(tabs)/browse/reading-detail.tsx">
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '@/styles/commonStyles';
import { SupabaseStorageService } from '@/utils/supabaseStorage';
import { TrackReading, Track } from '@/types/TrackData';
import { IconSymbol } from '@/components/IconSymbol';

export default function ReadingDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  const [reading, setReading] = React.useState<TrackReading | null>(null);
  const [track, setTrack] = React.useState<Track | null>(null);

  useEffect(() => {
    const loadReading = async () => {
      try {
        const readings = await SupabaseStorageService.getReadings();
        const foundReading = readings.find((r) => r.id === params.readingId);
        if (foundReading) {
          setReading(foundReading);
          
          // Load the track information
          const tracks = await SupabaseStorageService.getTracks();
          const foundTrack = tracks.find((t) => t.id === foundReading.trackId);
          if (foundTrack) {
            setTrack(foundTrack);
          }
        }
      } catch (error) {
        console.error('Error loading reading:', error);
      }
    };

    loadReading();
  }, [params.readingId]);

  const handleEdit = () => {
    if (!reading) return;

    console.log('Navigating to edit reading:', reading.id);
    
    // Navigate to record screen with reading data
    router.push({
      pathname: '/(tabs)/record',
      params: {
        editMode: 'true',
        readingId: reading.id,
        trackId: reading.trackId,
        year: reading.year.toString(),
        classCurrentlyRunning: reading.classCurrentlyRunning || '',
        // Left lane data
        leftLaneTrackTemp: reading.leftLane.trackTemp,
        leftLaneUvIndex: reading.leftLane.uvIndex,
        leftLaneKegSL: reading.leftLane.kegSL,
        leftLaneKegOut: reading.leftLane.kegOut,
        leftLaneGrippoSL: reading.leftLane.grippoSL,
        leftLaneGrippoOut: reading.leftLane.grippoOut,
        leftLaneShine: reading.leftLane.shine,
        leftLaneNotes: reading.leftLane.notes,
        leftLaneImageUri: reading.leftLane.imageUri || '',
        // Right lane data
        rightLaneTrackTemp: reading.rightLane.trackTemp,
        rightLaneUvIndex: reading.rightLane.uvIndex,
        rightLaneKegSL: reading.rightLane.kegSL,
        rightLaneKegOut: reading.rightLane.kegOut,
        rightLaneGrippoSL: reading.rightLane.grippoSL,
        rightLaneGrippoOut: reading.rightLane.grippoOut,
        rightLaneShine: reading.rightLane.shine,
        rightLaneNotes: reading.rightLane.notes,
        rightLaneImageUri: reading.rightLane.imageUri || '',
      },
    });
  };

  const handleDelete = () => {
    if (!reading) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete the reading from ${reading.date} at ${reading.time}?`
      );
      if (confirmed) {
        deleteReading();
      }
    } else {
      Alert.alert(
        'Delete Reading',
        `Are you sure you want to delete the reading from ${reading.date} at ${reading.time}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: deleteReading,
          },
        ]
      );
    }
  };

  const deleteReading = async () => {
    if (!reading) return;

    try {
      await SupabaseStorageService.deleteReading(reading.id);
      router.back();
    } catch (error) {
      console.error('Error deleting reading:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete reading. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete reading. Please try again.');
      }
    }
  };

  const renderLaneData = (lane: any, title: string) => {
    const styles = getStyles(colors);
    
    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>{title}</Text>
        <View style={styles.dataGrid}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Track Temp:</Text>
            <Text style={styles.dataValue}>
              {lane.trackTemp || 'N/A'}°F
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>UV Index:</Text>
            <Text style={styles.dataValue}>
              {lane.uvIndex || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Keg SL:</Text>
            <Text style={styles.dataValue}>
              {lane.kegSL || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Keg Out:</Text>
            <Text style={styles.dataValue}>
              {lane.kegOut || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Grippo SL:</Text>
            <Text style={styles.dataValue}>
              {lane.grippoSL || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Grippo Out:</Text>
            <Text style={styles.dataValue}>
              {lane.grippoOut || 'N/A'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Shine:</Text>
            <Text style={styles.dataValue}>
              {lane.shine || 'N/A'}
            </Text>
          </View>
          {lane.notes && (
            <View style={styles.notesRow}>
              <Text style={styles.dataLabel}>Notes:</Text>
              <Text style={styles.notesValue}>
                {lane.notes}
              </Text>
            </View>
          )}
          {lane.imageUri && (
            <Image source={{ uri: lane.imageUri }} style={styles.laneImage} />
          )}
        </View>
      </View>
    );
  };

  const styles = getStyles(colors);

  if (!reading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEdit}
          >
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={24}
              color="#ff3b30"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{track ? track.name : 'Reading Details'}</Text>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar_today"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateTimeText}>{reading.date}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <IconSymbol
                ios_icon_name="clock"
                android_material_icon_name="access_time"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateTimeText}>{reading.time}</Text>
            </View>
          </View>
        </View>

        {reading.classCurrentlyRunning && (
          <View style={styles.classSection}>
            <Text style={styles.classSectionTitle}>Class Currently Running</Text>
            <Text style={styles.classValue}>{reading.classCurrentlyRunning}</Text>
          </View>
        )}

        {renderLaneData(reading.leftLane, 'Left Lane')}
        {renderLaneData(reading.rightLane, 'Right Lane')}
      </ScrollView>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'android' ? 48 : 60,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backButtonText: {
      fontSize: 17,
      color: colors.primary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    editButton: {
      padding: 8,
    },
    deleteButton: {
      padding: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 120,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    headerInfo: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 12,
      color: colors.text,
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: 20,
    },
    dateTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dateTimeText: {
      fontSize: 16,
      color: colors.text,
    },
    classSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    classSectionTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    classValue: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    laneSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 2,
    },
    laneTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
      color: colors.primary,
    },
    dataGrid: {
      gap: 12,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dataLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    dataValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    notesRow: {
      marginTop: 8,
    },
    notesValue: {
      fontSize: 15,
      marginTop: 6,
      lineHeight: 22,
      color: colors.text,
    },
    laneImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginTop: 12,
      resizeMode: 'cover',
    },
  });
}
