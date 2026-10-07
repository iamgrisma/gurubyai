import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useMarkNotificationRead, useNotificationDevices, useNotifications } from '../src/hooks/useCoreData';
import { api } from '../src/data/contracts';
import { registerForPushNotifications } from '../src/platform/notifications';
import { Page } from '../src/ui/layout';
import { Button, ErrorState, LoadingState } from '../src/ui/components';
import { theme } from '../src/ui/theme';

export default function Notifications() {
  const q = useNotifications();
  const devices = useNotificationDevices();
  const mark = useMarkNotificationRead();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const activeDeviceCount = devices.data?.filter((device) => device.is_active).length ?? 0;

  async function enablePush() {
    setPushMessage(null);

    if (Platform.OS === 'web') {
      setPushMessage('Push registration is currently native-only; Web uses in-app notifications.');
      return;
    }

    setPushBusy(true);
    try {
      const registration = await registerForPushNotifications({ requestPermission: true });
      if (!registration) {
        setPushMessage('Push could not be enabled. Check notification permission and confirm this build is linked to an Expo/EAS project.');
        return;
      }

      await api.registerNotificationDevice({
        token: registration.token,
        projectId: registration.projectId,
        platform: Platform.OS,
      });
      await devices.refetch();
      setPushMessage('Push notifications are enabled on this device.');
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : 'Push registration failed.');
    } finally {
      setPushBusy(false);
    }
  }

  async function open(n:{id:string;is_read:boolean;action_url?:string|null}) {
    if (!n.is_read) await mark.mutateAsync(n.id);
    if (n.action_url && n.action_url.startsWith('/')) router.push(n.action_url as never);
  }

  return (
    <Page>
      <View style={s.wrap}>
        <View style={s.header}>
          <View style={s.headerCopy}>
            <Text style={s.kicker}>ALERTS</Text>
            <Text style={s.title}>Notifications</Text>
            <Text style={s.muted}>Booking, payment and account updates appear here.</Text>
          </View>
          <Button label={pushBusy ? 'Enabling…' : activeDeviceCount ? 'Refresh push' : 'Enable push'} onPress={enablePush} />
        </View>

        <View style={s.pushCard}>
          <Text style={s.pushTitle}>
            {activeDeviceCount
              ? 'Push enabled on ' + activeDeviceCount + ' device' + (activeDeviceCount === 1 ? '.' : 's.')
              : 'Push notifications are not registered on this device.'}
          </Text>
          {pushMessage ? (
            <Text style={s.pushMessage}>{pushMessage}</Text>
          ) : (
            <Text style={s.muted}>
              Native devices can register an Expo push token here. The app never sends privileged credentials to the device.
            </Text>
          )}
        </View>

        {q.isLoading ? (
          <LoadingState label="Loading notifications…" />
        ) : q.isError ? (
          <ErrorState title="Unable to load notifications" onRetry={q.refetch} />
        ) : q.data?.length ? (
          q.data.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityState={{ selected: n.is_read }}
              onPress={() => open(n)}
              style={[s.card, !n.is_read && s.unread]}
            >
              <Text style={s.name}>{n.title}</Text>
              <Text style={s.message}>{n.message}</Text>
              <Text style={s.time}>{new Date(n.created_at).toLocaleString()}</Text>
              {n.is_read ? <Text style={s.read}>Read</Text> : <Text style={s.unreadText}>Tap to open</Text>}
            </Pressable>
          ))
        ) : (
          <Text style={s.muted}>You’re all caught up.</Text>
        )}
      </View>
    </Page>
  );
}

const s = StyleSheet.create({
  wrap:{gap:14},
  header:{gap:12},
  headerCopy:{gap:5},
  kicker:{fontSize:12,fontWeight:'800',letterSpacing:2,color:theme.colors.accent},
  title:{fontSize:32,fontWeight:'800',color:theme.colors.ink},
  pushCard:{backgroundColor:theme.colors.accentSoft,padding:16,borderRadius:16,borderWidth:1,borderColor:theme.colors.line,gap:6},
  pushTitle:{fontSize:15,fontWeight:'800',color:theme.colors.ink},
  pushMessage:{color:theme.colors.ink,lineHeight:21},
  card:{backgroundColor:'#fff',padding:17,borderRadius:16,borderWidth:1,borderColor:theme.colors.line},
  unread:{borderColor:theme.colors.accent,backgroundColor:theme.colors.accentSoft},
  name:{fontSize:17,fontWeight:'700',color:theme.colors.ink},
  message:{marginTop:5,color:theme.colors.ink,lineHeight:21},
  time:{marginTop:7,fontSize:11,color:theme.colors.muted},
  muted:{color:theme.colors.muted,lineHeight:21},
  read:{marginTop:7,fontSize:11,color:theme.colors.muted},
  unreadText:{marginTop:7,fontSize:11,fontWeight:'700',color:theme.colors.accent}
});
