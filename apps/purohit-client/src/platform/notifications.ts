import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../data/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Purohit notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D97706',
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenRes.data;

  // Persist token in backend user_push_tokens table via RPC
  try {
    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS,
      p_device_id: Device.modelName || null,
    });
    if (error) {
      console.warn('Failed to register push token in backend:', error);
    }
  } catch (err) {
    console.warn('Network error saving push token:', err);
  }

  return token;
}

export async function unregisterPushToken(token: string): Promise<void> {
  if (!token) return;
  try {
    await supabase.rpc('unregister_push_token', { p_token: token });
  } catch (err) {
    console.warn('Failed to unregister push token:', err);
  }
}

function getActionUrl(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const value = data?.action_url ?? data?.url;
  return typeof value === 'string' && value.startsWith('/') ? value : null;
}

export async function getInitialNotificationUrl(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return response ? getActionUrl(response) : null;
}

export function subscribeToNotificationInteractions(onUrl: (url: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = getActionUrl(response);
    if (url) onUrl(url);
  });
  return () => sub.remove();
}
