import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { useSupabaseAuth } from './SupabaseAuthContext';
import {
  disablePushNotificationsForUser,
  enablePushNotificationsForUser,
  PushPermissionStatus,
  PushRegistrationSnapshot,
  syncPushRegistration,
} from '@/utils/pushNotifications';

interface PushNotificationsContextType {
  isSupported: boolean;
  isLoading: boolean;
  permissionStatus: PushPermissionStatus;
  isEnabled: boolean;
  expoPushToken: string | null;
  statusMessage: string | null;
  enablePushNotifications: () => Promise<void>;
  disablePushNotifications: () => Promise<void>;
  refreshPushNotifications: () => Promise<void>;
}

const PushNotificationsContext = createContext<PushNotificationsContextType | undefined>(undefined);

function getNotificationUrl(notification: Notifications.Notification): string | null {
  const url = notification.request.content.data?.url;
  return typeof url === 'string' ? url : null;
}

export function usePushNotifications() {
  const context = useContext(PushNotificationsContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within PushNotificationsProvider');
  }

  return context;
}

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useSupabaseAuth();

  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('undetermined');
  const [isEnabled, setIsEnabled] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const applySnapshot = (snapshot: PushRegistrationSnapshot) => {
    setIsSupported(snapshot.supported);
    setPermissionStatus(snapshot.permissionStatus);
    setIsEnabled(snapshot.notificationsEnabled);
    setExpoPushToken(snapshot.expoPushToken);
    setStatusMessage(snapshot.message ?? null);
  };

  useEffect(() => {
    const redirectFromNotification = (notification: Notifications.Notification) => {
      const url = getNotificationUrl(notification);
      if (url) {
        router.push(url as never);
      }
    };

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      redirectFromNotification(response.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((nextResponse) => {
      redirectFromNotification(nextResponse.notification);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    let isCancelled = false;

    const refresh = async () => {
      if (!user?.id) {
        if (!isCancelled) {
          setIsSupported(false);
          setPermissionStatus('undetermined');
          setIsEnabled(false);
          setExpoPushToken(null);
          setStatusMessage(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const snapshot = await syncPushRegistration({
          userId: user.id,
          requestPermissions: false,
        });

        if (!isCancelled) {
          applySnapshot(snapshot);
        }
      } catch (error) {
        console.error('Failed refreshing push notification status:', error);

        if (!isCancelled) {
          setStatusMessage('Unable to refresh push notification status right now.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    refresh();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const enablePushNotifications = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const snapshot = await enablePushNotificationsForUser(user.id);
      applySnapshot(snapshot);
    } catch (error) {
      console.error('Failed enabling push notifications:', error);
      setStatusMessage('Unable to enable push notifications right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const snapshot = await disablePushNotificationsForUser(user.id);
      applySnapshot(snapshot);
    } catch (error) {
      console.error('Failed disabling push notifications:', error);
      setStatusMessage('Unable to disable push notifications right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPushNotifications = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const snapshot = await syncPushRegistration({
        userId: user.id,
        requestPermissions: false,
      });
      applySnapshot(snapshot);
    } catch (error) {
      console.error('Failed refreshing push notifications:', error);
      setStatusMessage('Unable to refresh push notification status right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PushNotificationsContext.Provider
      value={{
        isSupported,
        isLoading,
        permissionStatus,
        isEnabled,
        expoPushToken,
        statusMessage,
        enablePushNotifications,
        disablePushNotifications,
        refreshPushNotifications,
      }}
    >
      {children}
    </PushNotificationsContext.Provider>
  );
}
