import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useGuruba, useGurubaServices } from '../../src/hooks/useCoreData';
import { Button, Card, EmptyState, ErrorState, StatusBadge } from '../../src/ui/components';
import { Page } from '../../src/ui/layout';
import { theme } from '../../src/ui/theme';

export async function generateStaticParams(): Promise<Record<string, string>[]> {
  const { getStaticPublicGurubas } = await import('../../src/data/staticPublic');
  const rows = await getStaticPublicGurubas();
  return rows.map((x) => ({ id: x.guruba_id }));
}

const priceLabel = (value?: number | null) => {
  if (value == null || value <= 0) return 'Price on request';
  return value.toLocaleString() + ' credits';
};

export default function Guruba() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const g = useGuruba(id);
  const services = useGurubaServices(id);

  if (g.isLoading) {
    return <View style={s.center}><ActivityIndicator /></View>;
  }

  if (g.isError) {
    return <Page><ErrorState title="Unable to load this Guruba" onRetry={g.refetch} /></Page>;
  }

  if (!g.data) {
    return <Page><ErrorState title="Guruba not found" /></Page>;
  }

  const guruba = g.data;

  return (
    <Page>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.hero}>
          {guruba.avatar_url ? (
            <Image
              source={{ uri: guruba.avatar_url }}
              accessibilityLabel={(guruba.full_name ?? 'Guruba') + ' profile photo'}
              resizeMode="cover"
              style={s.avatar}
            />
          ) : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarLetter}>{(guruba.full_name ?? 'G').charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={s.identity}>
            <View style={s.kickerRow}>
              <Text style={s.kicker}>VERIFIED GURUBA</Text>
              {guruba.is_verified ? <StatusBadge status="verified" /> : null}
            </View>
            <Text style={s.title}>{guruba.full_name ?? 'Guruba'}</Text>
            <Text style={s.location}>
              {guruba.location ?? 'Location not provided'}
              {guruba.guruba_type ? ' · ' + guruba.guruba_type : ''}
            </Text>

            <View style={s.stats}>
              <Text style={s.stat}>
                {guruba.rating != null ? '★ ' + Number(guruba.rating).toFixed(1) : 'New'}
              </Text>
              <Text style={s.stat}>{guruba.review_count ?? 0} reviews</Text>
              {guruba.years_experience != null ? <Text style={s.stat}>{guruba.years_experience} yrs experience</Text> : null}
            </View>
          </View>
        </View>

        {guruba.bio ? (
          <Card>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bio}>{guruba.bio}</Text>
          </Card>
        ) : null}

        {guruba.languages?.length ? (
          <View>
            <Text style={s.sectionTitle}>Languages</Text>
            <View style={s.tags}>
              {guruba.languages.map((language) => <Text key={language} style={s.tag}>{language}</Text>)}
            </View>
          </View>
        ) : null}

        {guruba.specialties?.length ? (
          <View>
            <Text style={s.sectionTitle}>Specialties</Text>
            <View style={s.tags}>
              {guruba.specialties.map((specialty) => <Text key={specialty} style={s.tag}>{specialty}</Text>)}
            </View>
          </View>
        ) : null}

        <View style={s.sectionHeader}>
          <View style={s.sectionCopy}>
            <Text style={s.sectionTitle}>Book with {guruba.full_name ?? 'this Guruba'}</Text>
            <Text style={s.muted}>
              Choose one of this provider's currently bookable services. Your provider choice will stay selected in the booking flow.
            </Text>
          </View>
        </View>

        {services.isLoading ? (
          <View style={s.loading}><ActivityIndicator /><Text style={s.muted}>Loading services…</Text></View>
        ) : services.isError ? (
          <ErrorState title="Unable to load services" onRetry={services.refetch} />
        ) : !services.data?.length ? (
          <EmptyState
            title="No bookable services right now"
            body="This Guruba has no currently active service offerings."
          />
        ) : (
          services.data.map(({ service, option }) => (
            <Card key={service.id}>
              <View style={s.serviceHeader}>
                <View style={s.serviceCopy}>
                  <Text style={s.serviceName}>{service.title}</Text>
                  <Text style={s.muted}>
                    {service.duration_minutes > 0 ? service.duration_minutes + ' min' : 'Duration varies'}
                    {option.is_online ? ' · Online available' : ' · Physical service'}
                  </Text>
                </View>
                <Text style={s.price}>{priceLabel(option.custom_price != null ? option.custom_price : service.base_price)}</Text>
              </View>

              <Text numberOfLines={3} style={s.description}>
                {service.description?.trim() || 'View service details and choose a suitable time.'}
              </Text>

              <View style={s.buttonRow}>
                <Button
                  label="Book with this Guruba"
                  onPress={() => router.push({
                    pathname: '/book/[serviceId]',
                    params: { serviceId: service.id, gurubaId: guruba.guruba_id },
                  })}
                />
                <Link
                  href={{ pathname: '/service/[id]', params: { id: service.id } }}
                  style={s.detailsLink}
                >
                  View service details
                </Link>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Page>
  );
}

const s = StyleSheet.create({
  container: { paddingBottom: 48, gap: 16 },
  hero: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: theme.colors.accentSoft },
  avatarFallback: { width: 92, height: 92, borderRadius: 46, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 36, fontWeight: '900', color: theme.colors.accent },
  identity: { flex: 1, gap: 5 },
  kickerRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: theme.colors.accent },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: theme.colors.ink },
  location: { color: theme.colors.muted, lineHeight: 21 },
  stats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 3 },
  stat: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  sectionHeader: { marginTop: 3 },
  sectionCopy: { gap: 5 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.ink },
  bio: { color: theme.colors.ink, lineHeight: 25, marginTop: 8 },
  muted: { color: theme.colors.muted, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  tag: { backgroundColor: theme.colors.accentSoft, color: theme.colors.ink, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', fontSize: 12, fontWeight: '700' },
  loading: { padding: 22, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  serviceCopy: { flex: 1, gap: 3 },
  serviceName: { fontSize: 19, fontWeight: '800', color: theme.colors.ink },
  price: { fontSize: 16, fontWeight: '800', color: theme.colors.accent, textAlign: 'right' },
  description: { color: theme.colors.ink, lineHeight: 22, marginTop: 10 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.colors.line },
  detailsLink: { color: theme.colors.accent, fontWeight: '800', paddingVertical: 12, paddingHorizontal: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.canvas, padding: 24 },
});