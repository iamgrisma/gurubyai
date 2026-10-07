import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { LocationMap } from '../src/ui/LocationMap';
import { api, type LocationSearchResult } from '../src/data/contracts';
import { getCurrentLocation } from '../src/platform/location';
import { useDeleteLocation, useSaveLocation, useSavedLocations } from '../src/hooks/useCoreData';
import { Page } from '../src/ui/layout';
import { theme } from '../src/ui/theme';

const isValidCoordinate = (value: number, min: number, max: number) =>
  Number.isFinite(value) && value >= min && value <= max;

async function openMap(latitude: number, longitude: number) {
  if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) return;
  await Linking.openURL('https://www.openstreetmap.org/?mlat=' + encodeURIComponent(String(latitude)) + '&mlon=' + encodeURIComponent(String(longitude)) + '#map=16/' + latitude + '/' + longitude);
}

export default function Locations() {
  const q = useSavedLocations();
  const save = useSaveLocation();
  const del = useDeleteLocation();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  async function searchAddress() {
    const query = search.trim();
    if (!query) {
      setResults([]);
      return;
    }

    setError('');
    setSearching(true);
    try {
      const next = await api.searchLocations(query);
      setResults(next);
      if (!next.length) setError('No Nepal address found. Try a landmark, locality, or full address.');
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : 'Address search failed.');
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(result: LocationSearchResult) {
    setAddress(result.display_name);
    setLat(result.lat);
    setLng(result.lon);
    setResults([]);
    setSearch(result.display_name);
    setError('');
  }

  async function useCurrentLocation() {
    setError('');
    setLocating(true);
    try {
      const current = await getCurrentLocation();
      setAddress(current.address ?? '');
      setLat(String(current.latitude));
      setLng(String(current.longitude));
      setSearch(current.address ?? 'Current location');
      setResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to get your current location.');
    } finally {
      setLocating(false);
    }
  }

  async function add() {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!name.trim()) {
      setError('Give this location a name, such as Home or Office.');
      return;
    }
    if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
      setError('Choose an address from search or enter valid latitude and longitude.');
      return;
    }

    setError('');
    try {
      await save.mutateAsync({
        name: name.trim(),
        lat: latitude,
        lng: longitude,
        address: address.trim() || undefined,
      });
      setName('');
      setAddress('');
      setLat('');
      setLng('');
      setSearch('');
      setResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save this location.');
    }
  }

  return (
    <Page>
      <View style={styles.wrap}>
        <Text style={styles.kicker}>BOOKING LOCATIONS</Text>
        <Text style={styles.title}>Saved locations</Text>
        <Text style={styles.subtitle}>
          Save common addresses once and reuse them for physical bookings.
        </Text>

        {q.isLoading ? <ActivityIndicator /> : null}
        {q.isError ? <Text style={styles.error}>Unable to load saved locations.</Text> : null}

        {(q.data ?? []).map((location) => (
          <View key={location.id} style={styles.card}>
            <View style={styles.cardCopy}>
              <Text style={styles.nameText}>{location.name}</Text>
              <Text style={styles.muted}>
                {location.address || String(location.latitude) + ', ' + String(location.longitude)}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'Open map for ' + location.name}
                onPress={() => openMap(Number(location.latitude), Number(location.longitude)).catch(() => undefined)}
                style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
              >
                <Text style={styles.mapText}>Map</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'Delete ' + location.name}
                disabled={del.isPending}
                onPress={() => del.mutate(location.id)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              >
                <Text style={styles.remove}>{del.isPending ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add a location</Text>
          <Text style={styles.muted}>
            Search the address first so the coordinates are filled for you.
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel="Search Nepal address"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={searchAddress}
              placeholder="Search address, locality or landmark"
              placeholderTextColor={theme.colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Pressable
              accessibilityRole="button"
              disabled={searching || !search.trim()}
              onPress={searchAddress}
              style={[styles.searchButton, (searching || !search.trim()) && styles.disabled]}
            >
              <Text style={styles.searchButtonText}>{searching ? '…' : 'Search'}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use current device location"
            disabled={locating}
            onPress={useCurrentLocation}
            style={[styles.currentLocationButton, locating && styles.disabled]}
          >
            <Text style={styles.currentLocationText}>
              {locating ? 'Finding current location…' : 'Use current location'}
            </Text>
          </Pressable>

          {results.length ? (
            <View style={styles.results}>
              {results.map((result) => (
                <Pressable
                  key={(result.place_id ?? '') + result.lat + result.lon}
                  accessibilityRole="button"
                  onPress={() => chooseResult(result)}
                  style={({ pressed }) => [styles.result, pressed && styles.pressed]}
                >
                  <Text style={styles.resultTitle}>{result.display_name}</Text>
                  <Text style={styles.resultMeta}>
                    {result.type || result.category || 'Location'} · {result.lat}, {result.lon}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open search result in map"
                    onPress={() => openMap(Number(result.lat), Number(result.lon)).catch(() => undefined)}
                    style={styles.inlineMap}
                  >
                    <Text style={styles.mapText}>Open map</Text>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          ) : null}

          <TextInput
            accessibilityLabel="Location name"
            value={name}
            onChangeText={setName}
            placeholder="Location name, e.g. Home"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Selected address"
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              accessibilityLabel="Latitude"
              value={lat}
              onChangeText={setLat}
              keyboardType="decimal-pad"
              placeholder="Latitude"
              placeholderTextColor={theme.colors.muted}
              style={styles.half}
            />
            <TextInput
              accessibilityLabel="Longitude"
              value={lng}
              onChangeText={setLng}
              keyboardType="decimal-pad"
              placeholder="Longitude"
              placeholderTextColor={theme.colors.muted}
              style={styles.half}
            />
          </View>

          {lat && lng ? (
            <LocationMap latitude={Number(lat)} longitude={Number(lng)} label={address.trim() || 'Selected service location'} />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={save.isPending}
            onPress={add}
            style={({ pressed }) => [
              styles.button,
              save.isPending && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>{save.isPending ? 'Saving…' : 'Save location'}</Text>
          </Pressable>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: theme.colors.accent },
  title: { fontSize: 32, fontWeight: '800', color: theme.colors.ink },
  subtitle: { color: theme.colors.muted, lineHeight: 22, maxWidth: 700 },
  section: { gap: 10, marginTop: 8 },
  sectionTitle: { fontSize: 21, fontWeight: '700', color: theme.colors.ink },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  cardCopy: { flex: 1, gap: 3 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.line },
  mapText: { color: theme.colors.accent, fontWeight: '800' },
  nameText: { fontSize: 17, fontWeight: '700', color: theme.colors.ink },
  muted: { color: theme.colors.muted, lineHeight: 21 },
  remove: { color: theme.colors.danger, fontWeight: '700' },
  deleteButton: { padding: 8 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    minHeight: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    color: theme.colors.ink,
  },
  searchButton: {
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
  },
  searchButtonText: { color: '#fff', fontWeight: '800' },
  currentLocationButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 2 },
  currentLocationText: { color: theme.colors.accent, fontWeight: '800' },
  results: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  result: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  resultTitle: { color: theme.colors.ink, fontWeight: '700', lineHeight: 21 },
  resultMeta: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
  inlineMap: { alignSelf: 'flex-start', marginTop: 7 },
  input: {
    minHeight: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    color: theme.colors.ink,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: {
    flex: 1,
    minHeight: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    color: theme.colors.ink,
  },
  error: { color: theme.colors.danger, lineHeight: 20 },
  button: {
    backgroundColor: theme.colors.ink,
    padding: 15,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});