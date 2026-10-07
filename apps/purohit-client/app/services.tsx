import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useServices } from '../src/hooks/useCoreData';
import type { Service } from '../src/data/contracts';
import { theme } from '../src/ui/theme';
import { EmptyState, ErrorState } from '../src/ui/components';

const categoryLabel = (value?: string | null) => {
  const normalized = (value ?? 'General').replace(/\s+/g, ' ').trim();
  return normalized || 'General';
};

const priceLabel = (value?: number | null) => {
  if (value == null || value <= 0) return 'Price on request';
  return value.toLocaleString() + ' credits';
};

function ServiceCard({ service, onPress }: { service: Service; onPress: () => void }) {
  const category = categoryLabel(service.category);
  const hasImage = Boolean(service.image_url?.trim());
  const duration = service.duration_minutes > 0
    ? service.duration_minutes + ' min'
    : 'Duration varies';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'View ' + service.title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {hasImage ? (
          <Image
            source={{ uri: service.image_url! }}
            accessibilityLabel={service.title + ' image'}
            resizeMode="cover"
            style={styles.image}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderMark}>{service.title.charAt(0).toUpperCase()}</Text>
            <Text style={styles.placeholderText}>{category}</Text>
          </View>
        )}
        {service.is_featured ? (
          <View style={styles.featured}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        ) : null}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{category}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={styles.name}>{service.title}</Text>
          <Text style={styles.price}>{priceLabel(service.base_price)}</Text>
        </View>

        <Text numberOfLines={3} style={styles.description}>
          {service.description?.trim() || 'Explore the details, choose a verified Guruba, and request a suitable time.'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{duration}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>
            {service.is_online_enabled ? 'Online available' : 'Physical service'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Text style={styles.action}>View details & book</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function Services() {
  const router = useRouter();
  const q = useServices();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const service of q.data ?? []) seen.add(categoryLabel(service.category));
    return ['All', ...Array.from(seen).sort((a, b) => a.localeCompare(b))];
  }, [q.data]);

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (q.data ?? [])
      .filter((service) => {
        const category = categoryLabel(service.category);
        const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
        if (!matchesCategory) return false;
        if (!needle) return true;

        return [
          service.title,
          service.description ?? '',
          category,
        ].some((value) => value.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        if (Boolean(a.is_featured) !== Boolean(b.is_featured)) {
          return a.is_featured ? -1 : 1;
        }
        return a.title.localeCompare(b.title);
      });
  }, [q.data, query, selectedCategory]);

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading services…</Text>
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={styles.center}>
        <ErrorState title="Unable to load services" onRetry={q.refetch} />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={filteredServices}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <ServiceCard
          service={item}
          onPress={() => router.push({ pathname: '/service/[id]', params: { id: item.id } })}
        />
      )}
      ListHeaderComponent={
        <View>
          <Text style={styles.kicker}>PUROHIT SERVICES</Text>
          <Text style={styles.title}>Choose a ritual or service</Text>
          <Text style={styles.subtitle}>
            Browse verified services, compare the details, and continue to Guruba selection.
          </Text>

          <TextInput
            accessibilityLabel="Search services"
            autoCapitalize="none"
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search puja, sanskar, astrology…"
            placeholderTextColor={theme.colors.muted}
            style={styles.search}
            value={query}
          />

          <ScrollView
            contentContainerStyle={styles.categories}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {categories.map((category) => {
              const active = category === selectedCategory;
              return (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedCategory(category)}
                  style={[styles.category, active && styles.categoryActive]}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.resultsRow}>
            <Text style={styles.resultCount}>
              {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}
            </Text>
            {query.trim() || selectedCategory !== 'All' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setQuery('');
                  setSelectedCategory('All');
                }}
              >
                <Text style={styles.clear}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="No services match your search"
          body="Try another keyword or clear the category filter."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 24,
    paddingBottom: 48,
    gap: 16,
    backgroundColor: theme.colors.canvas,
    minHeight: '100%',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: theme.colors.accent,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  subtitle: {
    color: theme.colors.muted,
    lineHeight: 23,
    marginTop: 8,
    maxWidth: 720,
  },
  search: {
    marginTop: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    minHeight: 50,
    paddingHorizontal: 16,
    color: theme.colors.ink,
    fontSize: 16,
  },
  categories: {
    gap: 8,
    paddingVertical: 14,
  },
  category: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
  },
  categoryActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  categoryText: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#fff',
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  resultCount: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  clear: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.88,
  },
  imageWrap: {
    height: 190,
    backgroundColor: theme.colors.accentSoft,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderMark: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  placeholderText: {
    color: theme.colors.muted,
    fontWeight: '700',
    marginTop: 4,
  },
  featured: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: theme.colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  categoryPill: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(23,21,19,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    padding: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  price: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  description: {
    color: theme.colors.muted,
    lineHeight: 22,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 14,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  dot: {
    color: theme.colors.line,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  action: {
    color: theme.colors.ink,
    fontWeight: '800',
  },
  arrow: {
    color: theme.colors.accent,
    fontSize: 20,
    fontWeight: '900',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
    padding: 24,
  },
  loadingText: {
    color: theme.colors.muted,
    marginTop: 8,
  },
});
