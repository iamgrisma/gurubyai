import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBookingOptions, useService } from '../../src/hooks/useCoreData';
import type { PublicBookingOption } from '../../src/data/contracts';
import { Button, Card, EmptyState, ErrorState } from '../../src/ui/components';
import { theme } from '../../src/ui/theme';

export async function generateStaticParams(): Promise<Record<string, string>[]> {
  const { getStaticPublicServices } = await import('../../src/data/staticPublic');
  const rows = await getStaticPublicServices();
  return rows.map((x) => ({ id: x.id }));
}

const priceLabel = (value?: number | null) => {
  if (value == null || value <= 0) return 'Price on request';
  return value.toLocaleString() + ' credits';
};

const providerPrice = (option: PublicBookingOption, servicePrice: number) =>
  option.custom_price != null ? Number(option.custom_price) : servicePrice;

function ProviderCard({
  option,
  servicePrice,
  onBook,
}: {
  option: PublicBookingOption;
  servicePrice: number;
  onBook: () => void;
}) {
  const guruba = option.guruba;
  const rating = guruba.rating != null ? Number(guruba.rating).toFixed(1) : null;
  const experience = guruba.years_experience != null ? guruba.years_experience + ' yrs experience' : null;
  const price = providerPrice(option, servicePrice);
  const specialties = (guruba.specialties ?? []).slice(0, 3);
  const languages = (guruba.languages ?? []).slice(0, 3);

  return (
    <Card>
      <View style={styles.providerHeader}>
        {guruba.avatar_url ? (
          <Image source={{ uri: guruba.avatar_url }} accessibilityLabel={(guruba.full_name ?? 'Guruba') + ' photo'} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{(guruba.full_name ?? 'G').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.providerIdentity}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{guruba.full_name ?? 'Verified Guruba'}</Text>
            {guruba.is_verified ? <Text accessibilityLabel="Verified" style={styles.verified}>✓</Text> : null}
          </View>
          <Text style={styles.providerLocation}>{guruba.location || guruba.guruba_type || 'Guruba'}</Text>
          <View style={styles.statsRow}>
            {rating ? <Text style={styles.stat}>★ {rating} ({guruba.review_count ?? 0})</Text> : <Text style={styles.stat}>New Guruba</Text>}
            {experience ? <Text style={styles.stat}>{experience}</Text> : null}
          </View>
        </View>
      </View>

      {guruba.bio ? <Text numberOfLines={3} style={styles.bio}>{guruba.bio}</Text> : null}

      {specialties.length || languages.length ? (
        <View style={styles.tags}>
          {specialties.map((item) => <Text key={'s-' + item} style={styles.tag}>{item}</Text>)}
          {languages.map((item) => <Text key={'l-' + item} style={styles.tag}>{item}</Text>)}
        </View>
      ) : null}

      <View style={styles.providerFooter}>
        <View>
          <Text style={styles.price}>{priceLabel(price)}</Text>
          <Text style={styles.muted}>{option.is_online ? 'Online available' : 'Physical service'}</Text>
        </View>
        <Button label="Book with Guruba" onPress={onBook} />
      </View>
    </Card>
  );
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const serviceQuery = useService(id);
  const providersQuery = useBookingOptions(id);

  if (serviceQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading service…</Text>
      </View>
    );
  }

  if (serviceQuery.isError) {
    return <ErrorState title="Unable to load this service" onRetry={serviceQuery.refetch} />;
  }

  if (!serviceQuery.data) return <ErrorState title="Service not found" />;

  const service = serviceQuery.data;
  const providers = providersQuery.data ?? [];
  const featuredOptions = providers.slice(0, 8);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {service.image_url ? (
        <Image source={{ uri: service.image_url }} accessibilityLabel={service.title + ' image'} resizeMode="cover" style={styles.heroImage} />
      ) : null}

      <View style={styles.heading}>
        <Text style={styles.kicker}>SERVICE DETAILS</Text>
        <Text style={styles.title}>{service.title}</Text>
        {service.category ? <Text style={styles.category}>{service.category}</Text> : null}
        <Text style={styles.description}>
          {service.description?.trim() || 'Explore this service, compare verified Gurubas, and request a suitable time.'}
        </Text>
      </View>

      <Card>
        <View style={styles.factRow}>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Starting price</Text>
            <Text style={styles.factValue}>{priceLabel(service.base_price)}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Duration</Text>
            <Text style={styles.factValue}>
              {service.duration_minutes > 0 ? service.duration_minutes + ' min' : 'Flexible'}
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>Format</Text>
            <Text style={styles.factValue}>{service.is_online_enabled ? 'Online or physical' : 'Physical'}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Choose a verified Guruba</Text>
          <Text style={styles.muted}>
            {providersQuery.isLoading
              ? 'Finding available providers…'
              : providers.length
                ? providers.length + (providers.length === 1 ? ' provider available' : ' providers available')
                : 'No verified provider is currently offering this service.'}
          </Text>
        </View>
      </View>

      {providersQuery.isError ? (
        <ErrorState title="Unable to load Gurubas for this service" onRetry={providersQuery.refetch} />
      ) : providersQuery.isLoading ? (
        <View style={styles.loadingCard}><ActivityIndicator /><Text style={styles.muted}>Loading Gurubas…</Text></View>
      ) : featuredOptions.length ? (
        featuredOptions.map((option) => (
          <ProviderCard
            key={option.guruba_id}
            option={option}
            servicePrice={service.base_price}
            onBook={() => router.push({
              pathname: '/book/[serviceId]',
              params: { serviceId: service.id, gurubaId: option.guruba_id },
            })}
          />
        ))
      ) : (
        <EmptyState
          title="No verified Guruba available yet"
          body="You can check back later as verified Gurubas add this service."
        />
      )}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Booking & payment</Text>
        <Text style={styles.muted}>
          The final booking amount, availability, and booking state are determined by the Supabase backend. This screen does not invent fees or promise a slot before the booking request succeeds.
        </Text>
      </View>

      <Button
        secondary={providers.length > 0}
        label={providers.length ? 'Choose date & time instead' : 'View services'}
        onPress={() => {
          if (providers.length) {
            router.push({ pathname: '/book/[serviceId]', params: { serviceId: service.id } });
          } else {
            router.push('/services');
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, gap: 16, backgroundColor: theme.colors.canvas },
  heroImage: { width: '100%', height: 240, borderRadius: theme.radius.lg, backgroundColor: theme.colors.accentSoft },
  heading: { gap: 8 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: theme.colors.accent },
  title: { fontSize: 36, lineHeight: 42, fontWeight: '800', color: theme.colors.ink },
  category: { fontSize: 14, fontWeight: '800', color: theme.colors.accent },
  description: { fontSize: 16, lineHeight: 26, color: theme.colors.ink },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  fact: { minWidth: 120, flex: 1 },
  factLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  factValue: { color: theme.colors.ink, fontSize: 18, fontWeight: '800', marginTop: 4 },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.ink },
  providerHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.accentSoft },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '900', color: theme.colors.accent },
  providerIdentity: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerName: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.colors.ink },
  verified: { fontSize: 16, fontWeight: '900', color: theme.colors.accent },
  providerLocation: { color: theme.colors.muted, fontSize: 13 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  bio: { color: theme.colors.ink, lineHeight: 22, marginTop: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  tag: { backgroundColor: theme.colors.accentSoft, color: theme.colors.ink, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontSize: 12, fontWeight: '700' },
  providerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.colors.line },
  price: { color: theme.colors.ink, fontSize: 19, fontWeight: '800' },
  muted: { color: theme.colors.muted, lineHeight: 22 },
  loadingCard: { padding: 22, gap: 10, alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.line },
  notice: { padding: 16, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft, gap: 6 },
  noticeTitle: { color: theme.colors.ink, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: theme.colors.canvas, padding: 24 },
});