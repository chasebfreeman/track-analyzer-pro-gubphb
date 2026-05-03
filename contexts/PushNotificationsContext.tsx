import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Href, useRootNavigationState, useRouter } from 'expo-router';

import { useSupabaseAuth } from './SupabaseAuthContext';
import {
  disablePushNotificationsForUser,
  enablePushNotificationsForUser,
  getPushRegistrationErrorSnapshot,
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

function getNotificationHref(notification: Notifications.Notification): Href | null {
  const trackId = notification.request.content.data?.trackId;
  const readingId = notification.request.content.data?.readingId;

  if (typeof trackId === 'string' && typeof readingId === 'string') {
    return {
      pathname: '/(tabs)/browse/reading-detail',
      params: { trackId, readingId },
    };
  }

  const url = notification.request.content.data?.url;
  if (typeof url === 'string' && url.length > 0) {
    return url as Href;
  }

  return null;
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
  const rootNavigationState = useRootNavigationState();
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();

  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('undetermined');
  const [isEnabled, setIsEnabled] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingNotificationHref, setPendingNotificationHref] = useState<Href | null>(null);

  const applySnapshot = (snapshot: PushRegistrationSnapshot) => {
    setIsSupported(snapshot.supported);
    setPermissionStatus(snapshot.permissionStatus);
    setIsEnabled(snapshot.notificationsEnabled);
    setExpoPushToken(snapshot.expoPushToken);
    setStatusMessage(snapshot.message ?? null);
  };

  useEffect(() => {
    const queueNotificationNavigation = (notification: Notifications.Notification) => {
      const href = getNotificationHref(notification);
      if (href) {
        setPendingNotificationHref(href);
      }
    };

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      queueNotificationNavigation(response.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((nextResponse) => {
      queueNotificationNavigation(nextResponse.notification);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!pendingNotificationHref) return;
    if (!rootNavigationState?.key) return;
    if (isAuthLoading) return;
    if (!user) return;

    const timer = setTimeout(() => {
      router.push(pendingNotificationHref);
      setPendingNotificationHref(null);
    }, 0);

    return () => clearTimeout(timer);
  }, [pendingNotificationHref, rootNavigationState?.key, isAuthLoading, user, router]);

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
          applySnapshot(getPushRegistrationErrorSnapshot(error));
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
      applySnapshot(getPushRegistrationErrorSnapshot(error));
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
      applySnapshot(getPushRegistrationErrorSnapshot(error));
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
      applySnapshot(getPushRegistrationErrorSnapshot(error));
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
