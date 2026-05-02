import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';

const PUSH_INSTALLATION_ID_KEY = '@push_installation_id';
const DEFAULT_NOTIFICATION_CHANNEL_ID = 'default';

export type PushPermissionStatus = 'undetermined' | 'denied' | 'granted' | 'unsupported';

export interface PushRegistrationSnapshot {
  supported: boolean;
  permissionStatus: PushPermissionStatus;
  notificationsEnabled: boolean;
  expoPushToken: string | null;
  message?: string;
}

function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  return '';
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function createInstallationId(): string {
  return `push-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getProjectId(): string | null {
  const expoProjectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  return expoProjectId ?? null;
}

function normalizePermissionStatus(status?: string | null): PushPermissionStatus {
  if (status === 'granted' || status === 'denied' || status === 'undetermined') {
    return status;
  }

  return 'undetermined';
}

function getUnsupportedSnapshot(message: string): PushRegistrationSnapshot {
  return {
    supported: false,
    permissionStatus: 'unsupported',
    notificationsEnabled: false,
    expoPushToken: null,
    message,
  };
}

export function getPushRegistrationErrorSnapshot(error: unknown): PushRegistrationSnapshot {
  const rawMessage = getRawErrorMessage(error).trim();
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes('push_tokens') &&
    (normalizedMessage.includes('does not exist') || normalizedMessage.includes('schema cache'))
  ) {
    return {
      supported: true,
      permissionStatus: 'undetermined',
      notificationsEnabled: false,
      expoPushToken: null,
      message: 'Push notifications need the latest Supabase migration before this device can register.',
    };
  }

  if (
    normalizedMessage.includes('native module') ||
    normalizedMessage.includes('expo-notifications') ||
    normalizedMessage.includes('unimodules')
  ) {
    return getUnsupportedSnapshot(
      'This app build does not include native notification support yet. Install the latest build and try again.'
    );
  }

  if (
    normalizedMessage.includes('apns') ||
    normalizedMessage.includes('aps-environment') ||
    normalizedMessage.includes('no valid aps-environment entitlement string')
  ) {
    return getUnsupportedSnapshot(
      'iPhone push credentials are not fully configured for this build yet. Finish the Apple/EAS push setup and rebuild.'
    );
  }

  if (normalizedMessage.includes('projectid') || normalizedMessage.includes('experienceid')) {
    return getUnsupportedSnapshot(
      'This build is missing the Expo project ID needed to register for push notifications.'
    );
  }

  if (normalizedMessage.includes('network') || normalizedMessage.includes('connection')) {
    return {
      supported: true,
      permissionStatus: 'undetermined',
      notificationsEnabled: false,
      expoPushToken: null,
      message: 'Push notifications could not be checked because the network request failed. Try again in a moment.',
    };
  }

  return {
    supported: true,
    permissionStatus: 'undetermined',
    notificationsEnabled: false,
    expoPushToken: null,
    message: rawMessage || 'Push notifications could not be initialized right now.',
  };
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

async function updateCurrentInstallationEnabledState(userId: string, notificationsEnabled: boolean) {
  if (!isSupabaseConfigured()) return;

  const installationId = await getPushInstallationId();
  const { error } = await supabase
    .from('push_tokens')
    .update({
      notifications_enabled: notificationsEnabled,
      last_seen_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('installation_id', installationId);

  if (error) {
    console.error('Failed updating push notification enabled state:', error);
  }
}

export async function getPushInstallationId(): Promise<string> {
  const existingId = await AsyncStorage.getItem(PUSH_INSTALLATION_ID_KEY);
  if (existingId) return existingId;

  const nextId = createInstallationId();
  await AsyncStorage.setItem(PUSH_INSTALLATION_ID_KEY, nextId);
  return nextId;
}

export async function syncPushRegistration(params: {
  userId: string;
  requestPermissions?: boolean;
}): Promise<PushRegistrationSnapshot> {
  const { userId, requestPermissions = false } = params;

  try {
    if (!isSupabaseConfigured()) {
      return getUnsupportedSnapshot('Push notifications are unavailable until Supabase is configured.');
    }

    if (Platform.OS === 'web') {
      return getUnsupportedSnapshot('Push notifications are only available in iOS and Android app builds.');
    }

    if (!Device.isDevice) {
      return getUnsupportedSnapshot('Push notifications require a physical device.');
    }

    await ensureAndroidNotificationChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = normalizePermissionStatus(existingStatus);

    if (requestPermissions && finalStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      finalStatus = normalizePermissionStatus(status);
    }

    if (finalStatus !== 'granted') {
      await updateCurrentInstallationEnabledState(userId, false);

      return {
        supported: true,
        permissionStatus: finalStatus,
        notificationsEnabled: false,
        expoPushToken: null,
        message:
          finalStatus === 'denied'
            ? 'Notifications are turned off for this device. Enable them in system settings to receive updates.'
            : 'Notifications have not been enabled on this device yet.',
      };
    }

    const projectId = getProjectId();
    if (!projectId) {
      return getUnsupportedSnapshot('Missing EAS project ID in Expo config.');
    }

    const expoPushToken = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    const installationId = await getPushInstallationId();
    const deviceName = Device.deviceName ?? Device.modelName ?? `${Platform.OS} device`;

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        installation_id: installationId,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        device_name: deviceName,
        notifications_enabled: true,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'installation_id',
      }
    );

    if (error) {
      console.error('Failed saving Expo push token:', error);
      return getPushRegistrationErrorSnapshot(error);
    }

    return {
      supported: true,
      permissionStatus: 'granted',
      notificationsEnabled: true,
      expoPushToken,
      message: 'This device is ready to receive push notifications.',
    };
  } catch (error) {
    console.error('Push notification sync failed:', error);
    return getPushRegistrationErrorSnapshot(error);
  }
}

export async function enablePushNotificationsForUser(userId: string) {
  return syncPushRegistration({ userId, requestPermissions: true });
}

export async function disablePushNotificationsForUser(userId: string): Promise<PushRegistrationSnapshot> {
  const unsupported =
    Platform.OS === 'web'
      ? getUnsupportedSnapshot('Push notifications are only available in iOS and Android app builds.')
      : null;

  if (unsupported) {
    return unsupported;
  }

  const { status } = await Notifications.getPermissionsAsync();
  const permissionStatus = normalizePermissionStatus(status);

  await updateCurrentInstallationEnabledState(userId, false);

  return {
    supported: Device.isDevice,
    permissionStatus,
    notificationsEnabled: false,
    expoPushToken: null,
    message: 'Push notifications are disabled for this device inside the app.',
  };
}

export async function unregisterCurrentPushTokenForUser(userId: string) {
  if (!isSupabaseConfigured()) return;

  const installationId = await getPushInstallationId();
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('installation_id', installationId);

  if (error) {
    console.error('Failed removing push token during sign out:', error);
  }
}

export async function notifyReadingCreated(readingId: string) {
  if (!isSupabaseConfigured()) return;

  const actorInstallationId = await getPushInstallationId();
  const { error } = await supabase.functions.invoke('notify-reading-created', {
    body: {
      readingId,
      actorInstallationId,
    },
  });

  if (error) {
    throw error;
  }
}
