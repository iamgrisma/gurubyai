import { useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  useBookings,
  useCancelBooking,
  useCompleteBooking,
  useConfirmBooking,
  useProposeBookingTime,
  useProfile,
  useRespondBookingTime,
  useRescheduleBooking,
  useSetBookingMeetingLink,
  useTransactions,
} from '../../src/hooks/useCoreData';
import { Card, ErrorState, PriceBreakdown, StatusBadge } from '../../src/ui/components';
import { Page } from '../../src/ui/layout';
import { theme } from '../../src/ui/theme';

const parseNepalTime = (value: string) => {
  const match = value.trim().match(/^(\\d{4})-(\\d{2})-(\\d{2})[T ](\\d{2}):(\\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min] = match.map(Number);
  if (![y, m, d, h, min].every(Number.isFinite)) return null;
  const iso = new Date(Date.UTC(y, m - 1, d, h, min) - 20700 * 1000).toISOString();
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date <= new Date()) return null;
  if (![0, 30].includes(min)) return null;
  return iso;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'To be scheduled';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
};

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const role = profile.data?.role === 'guruba' ? 'guruba' : 'client';
  const q = useBookings(role);
  const tx = useTransactions();
  const cancel = useCancelBooking();
  const confirm = useConfirmBooking();
  const respond = useRespondBookingTime();
  const propose = useProposeBookingTime();
  const reschedule = useRescheduleBooking();
  const complete = useCompleteBooking();
  const meeting = useSetBookingMeetingLink();

  const [newTime, setNewTime] = useState('');
  const [proposalTime, setProposalTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [success, setSuccess] = useState(false);

  const booking = useMemo(() => q.data?.find((item) => item.id === id), [q.data, id]);

  if (q.isLoading || profile.isLoading) {
    return <View style={s.center}><ActivityIndicator /></View>;
  }

  if (q.isError) {
    return <Page><ErrorState title="Unable to load booking" onRetry={q.refetch} /></Page>;
  }

  if (!booking) {
    return <Page><Text style={s.title}>Booking not found</Text></Page>;
  }

  const canCancel = ['pending', 'confirmed', 'awaiting_client_confirmation'].includes(booking.status);
  const canReschedule = ['pending', 'confirmed'].includes(booking.status);
  const isAwaitingClient = role === 'client' && booking.status === 'awaiting_client_confirmation';
  const isPendingGuruba = role === 'guruba' && booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed';
  const otherUserId = role === 'guruba' ? booking.user_id : booking.gurubas?.user_id;

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    await Promise.all([q.refetch(), profile.refetch(), tx.refetch()]);
  }

  async function confirmCancellation() {
    setConfirmingCancel(false);
    try {
      await refreshAfter(cancel.mutateAsync(id));
      setSuccess(true);
    } catch {
      // Mutation error is rendered below.
    }
  }

  async function acceptProposal() {
    try {
      await refreshAfter(respond.mutateAsync({ id, accept: true }));
    } catch {
      // Mutation error is rendered below.
    }
  }

  async function saveReschedule() {
    const iso = parseNepalTime(newTime);
    if (!iso) {
      Alert.alert('Invalid time', 'Use future Nepal time in YYYY-MM-DD HH:mm format, on a 00 or 30 minute boundary.');
      return;
    }
    try {
      await reschedule.mutateAsync({ id, at: iso });
      setNewTime('');
      setShowReschedule(false);
      await q.refetch();
    } catch {
      // Mutation error is rendered below.
    }
  }

  async function sendProposal() {
    const iso = parseNepalTime(proposalTime);
    if (!iso) {
      Alert.alert('Invalid time', 'Use future Nepal time in YYYY-MM-DD HH:mm format, on a 00 or 30 minute boundary.');
      return;
    }
    try {
      await propose.mutateAsync({ id, at: iso, deadline: new Date(Date.now() + 3600000).toISOString() });
      setProposalTime('');
      setShowProposal(false);
      await q.refetch();
    } catch {
      // Mutation error is rendered below.
    }
  }

  async function saveMeetingLink() {
    const value = meetingLink.trim();
    if (!/^https?:\\/\\/\\S+$/i.test(value)) {
      Alert.alert('Invalid meeting link', 'Enter a complete http:// or https:// meeting URL.');
      return;
    }
    try {
      await meeting.mutateAsync({ id, link: value });
      setMeetingLink('');
      setShowMeeting(false);
      await q.refetch();
    } catch {
      // Mutation error is rendered below.
    }
  }

  async function acceptPendingBooking() {
    try {
      await confirm.mutateAsync(id);
      await q.refetch();
    } catch {
      // Mutation error is rendered below.
    }
  }

  async function markCompleted() {
    if (booking.scheduled_at && new Date(booking.scheduled_at) > new Date()) {
      Alert.alert('Too early', 'This booking cannot be completed before its scheduled time.');
      return;
    }
    try {
      await complete.mutateAsync(id);
      await q.refetch();
    } catch {
      // Mutation error is rendered below.
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.header}>
          <View style={s.headerCopy}>
            <Text style={s.kicker}>BOOKING</Text>
            <Text style={s.title}>{booking.services?.title ?? 'Booking'}</Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>

        {success ? (
          <Card>
            <Text style={s.successTitle}>Booking cancelled</Text>
            <Text style={s.successBody}>
              The server accepted the cancellation. The booking fee refund, when applicable, is recorded in your authoritative wallet ledger.
            </Text>
          </Card>
        ) : null}

        {isAwaitingClient ? (
          <Card>
            <Text style={s.actionTitle}>Action required</Text>
            <Text style={s.muted}>
              Guruba proposed {formatDateTime(booking.proposed_time)}. Confirm it before the server-side deadline expires.
            </Text>
            <View style={s.actionRow}>
              <Pressable
                disabled={respond.isPending}
                onPress={acceptProposal}
                style={[s.primaryAction, respond.isPending && s.disabled]}
              >
                <Text style={s.primaryActionText}>{respond.isPending ? 'Confirming…' : 'Confirm proposed time'}</Text>
              </Pressable>
              <Pressable
                disabled={cancel.isPending}
                onPress={() => Alert.alert(
                  'Cancel booking',
                  'Reject this proposed time and cancel the booking?',
                  [
                    { text: 'Keep', style: 'cancel' },
                    { text: 'Cancel booking', style: 'destructive', onPress: confirmCancellation },
                  ],
                )}
                style={s.secondaryAction}
              >
                <Text style={s.secondaryActionText}>Reject & cancel</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {isPendingGuruba ? (
          <Card>
            <Text style={s.actionTitle}>New booking request</Text>
            <Text style={s.muted}>Accept the requested booking or propose a different future time.</Text>
            <View style={s.actionRow}>
              <Pressable
                disabled={confirm.isPending}
                onPress={acceptPendingBooking}
                style={[s.primaryAction, confirm.isPending && s.disabled]}
              >
                <Text style={s.primaryActionText}>{confirm.isPending ? 'Accepting…' : 'Accept booking'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowProposal(true)} style={s.secondaryAction}>
                <Text style={s.secondaryActionText}>Propose a time</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={s.label}>Guruba</Text>
          <Text style={s.value}>{booking.gurubas?.full_name ?? 'Guruba'}</Text>

          <Text style={s.label}>Scheduled</Text>
          <Text style={s.value}>{formatDateTime(booking.scheduled_at ?? booking.proposed_time)}</Text>

          <Text style={s.label}>Booking type</Text>
          <Text style={s.value}>{booking.is_online ? 'Online video' : 'Physical visit'}</Text>

          {booking.location_address ? (
            <>
              <Text style={s.label}>Location</Text>
              <Text style={s.value}>{booking.location_address}</Text>
            </>
          ) : null}

          {booking.booking_note ? (
            <>
              <Text style={s.label}>Note</Text>
              <Text style={s.value}>{booking.booking_note}</Text>
            </>
          ) : null}

          {booking.meeting_link ? (
            <View style={s.meetingBox}>
              <Text style={s.label}>Meeting</Text>
              <Text numberOfLines={2} style={s.link}>{booking.meeting_link}</Text>
              {isConfirmed ? (
                <Pressable onPress={() => Linking.openURL(booking.meeting_link!)} style={s.primaryAction}>
                  <Text style={s.primaryActionText}>Open meeting</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {booking.services ? (
            <PriceBreakdown
              basePrice={booking.services.base_price}
              platformFee={booking.platform_fee ?? 0}
            />
          ) : null}
        </Card>

        {otherUserId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/message/[id]', params: { id: otherUserId } })}
            style={s.secondaryAction}
          >
            <Text style={s.secondaryActionText}>Open conversation</Text>
          </Pressable>
        ) : null}

        {canReschedule && !success ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Reschedule</Text>
            <Text style={s.muted}>
              Nepal time: YYYY-MM-DD HH:mm. The server checks the future time, 30-minute boundary, Guruba availability, and booking conflicts.
            </Text>
            {!showReschedule ? (
              <Pressable onPress={() => setShowReschedule(true)} style={s.secondaryAction}>
                <Text style={s.secondaryActionText}>Choose a new time</Text>
              </Pressable>
            ) : (
              <View style={s.editor}>
                <TextInput
                  accessibilityLabel="New booking time"
                  placeholder="2026-10-08 10:30"
                  value={newTime}
                  onChangeText={setNewTime}
                  style={s.input}
                />
                <View style={s.actionRow}>
                  <Pressable
                    disabled={!newTime || reschedule.isPending}
                    onPress={saveReschedule}
                    style={[s.primaryAction, (!newTime || reschedule.isPending) && s.disabled]}
                  >
                    <Text style={s.primaryActionText}>{reschedule.isPending ? 'Saving…' : 'Save new time'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowReschedule(false)} style={s.secondaryAction}>
                    <Text style={s.secondaryActionText}>Close</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {showProposal ? (
          <View style={s.editor}>
            <Text style={s.sectionTitle}>Propose a new time</Text>
            <Text style={s.muted}>Nepal time: YYYY-MM-DD HH:mm</Text>
            <TextInput
              accessibilityLabel="Proposed booking time"
              placeholder="2026-10-08 10:30"
              value={proposalTime}
              onChangeText={setProposalTime}
              style={s.input}
            />
            <View style={s.actionRow}>
              <Pressable
                disabled={!proposalTime || propose.isPending}
                onPress={sendProposal}
                style={[s.primaryAction, (!proposalTime || propose.isPending) && s.disabled]}
              >
                <Text style={s.primaryActionText}>{propose.isPending ? 'Sending…' : 'Send proposal'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowProposal(false)} style={s.secondaryAction}>
                <Text style={s.secondaryActionText}>Close</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {role === 'guruba' && isConfirmed && !success ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Provider actions</Text>
            <View style={s.actionRow}>
              <Pressable
                onPress={() => {
                  setMeetingLink(booking.meeting_link ?? '');
                  setShowMeeting(true);
                }}
                style={s.secondaryAction}
              >
                <Text style={s.secondaryActionText}>{booking.meeting_link ? 'Edit meeting link' : 'Add meeting link'}</Text>
              </Pressable>
              <Pressable onPress={markCompleted} style={s.primaryAction}>
                <Text style={s.primaryActionText}>Mark completed</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showMeeting ? (
          <View style={s.editor}>
            <Text style={s.sectionTitle}>Meeting link</Text>
            <TextInput
              accessibilityLabel="Meeting link"
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChangeText={setMeetingLink}
              style={s.input}
            />
            <View style={s.actionRow}>
              <Pressable
                disabled={!meetingLink.trim() || meeting.isPending}
                onPress={saveMeetingLink}
                style={[s.primaryAction, (!meetingLink.trim() || meeting.isPending) && s.disabled]}
              >
                <Text style={s.primaryActionText}>{meeting.isPending ? 'Saving…' : 'Save link'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowMeeting(false)} style={s.secondaryAction}>
                <Text style={s.secondaryActionText}>Close</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {canCancel && !success ? (
          !confirmingCancel ? (
            <Pressable
              disabled={cancel.isPending}
              onPress={() => setConfirmingCancel(true)}
              style={s.danger}
            >
              <Text style={s.dangerText}>Cancel booking</Text>
            </Pressable>
          ) : (
            <Card>
              <Text style={s.confirmTitle}>Cancel this booking?</Text>
              <Text style={s.muted}>
                The cancellation is performed by the server and cannot be undone from this screen. Any eligible refund is reconciled in the wallet ledger.
              </Text>
              <View style={s.actionRow}>
                <Pressable onPress={() => setConfirmingCancel(false)} style={s.secondaryAction}>
                  <Text style={s.secondaryActionText}>Keep booking</Text>
                </Pressable>
                <Pressable
                  disabled={cancel.isPending}
                  onPress={confirmCancellation}
                  style={[s.dangerFilled, cancel.isPending && s.disabled]}
                >
                  <Text style={s.dangerFilledText}>{cancel.isPending ? 'Cancelling…' : 'Yes, cancel'}</Text>
                </Pressable>
              </View>
            </Card>
          )
        ) : null}

        {cancel.isError || reschedule.isError || respond.isError || confirm.isError || propose.isError || meeting.isError ? (
          <Text style={s.error}>The server rejected this change. No local success state was assumed.</Text>
        ) : null}
      </ScrollView>
    </Page>
  );
}

const s = StyleSheet.create({
  container: { gap: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: theme.colors.accent, marginBottom: 6 },
  title: { fontSize: 32, fontWeight: '800', color: theme.colors.ink },
  label: { fontSize: 12, color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  value: { fontSize: 17, fontWeight: '600', color: theme.colors.ink, lineHeight: 23 },
  muted: { color: theme.colors.muted, lineHeight: 22 },
  actionTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.ink },
  successTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.ink },
  successBody: { marginTop: 7, color: theme.colors.muted, lineHeight: 22 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  primaryAction: { backgroundColor: theme.colors.ink, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontWeight: '800' },
  secondaryAction: { borderWidth: 1, borderColor: theme.colors.line, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  secondaryActionText: { color: theme.colors.ink, fontWeight: '800' },
  danger: { borderWidth: 1, borderColor: theme.colors.danger, padding: 16, borderRadius: 14, alignItems: 'center' },
  dangerText: { color: theme.colors.danger, fontWeight: '800' },
  dangerFilled: { flex: 1, backgroundColor: theme.colors.danger, padding: 14, borderRadius: 12, alignItems: 'center' },
  dangerFilledText: { color: '#fff', fontWeight: '800' },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.ink },
  section: { gap: 10 },
  sectionTitle: { fontSize: 21, fontWeight: '700', color: theme.colors.ink },
  editor: { backgroundColor: theme.colors.canvas, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: theme.colors.line },
  input: { flex: 1, minHeight: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, padding: 12, color: theme.colors.ink },
  meetingBox: { marginTop: 8, gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.line },
  link: { color: theme.colors.accent, fontWeight: '700', lineHeight: 21 },
  error: { color: theme.colors.danger, lineHeight: 20 },
  disabled: { opacity: 0.45 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.canvas },
});