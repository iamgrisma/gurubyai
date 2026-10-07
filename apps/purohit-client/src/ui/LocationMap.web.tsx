import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export function LocationMap({ latitude, longitude, label }: { latitude: number; longitude: number; label?: string }) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const url = 'https://www.openstreetmap.org/?mlat=' + encodeURIComponent(String(latitude)) + '&mlon=' + encodeURIComponent(String(longitude)) + '#map=16/' + latitude + '/' + longitude;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{label ?? 'Selected location'}</Text>
      <Text style={styles.meta}>{latitude.toFixed(6)}, {longitude.toFixed(6)}</Text>
      <Pressable accessibilityRole="button" onPress={() => Linking.openURL(url).catch(() => undefined)} style={styles.button}>
        <Text style={styles.buttonText}>Open map</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { padding: 14, gap: 5 },
  title: { fontWeight: '800' },
  meta: { color: '#666', fontSize: 12 },
  button: { alignSelf: 'flex-start', marginTop: 3, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#bbb', borderRadius: 9 },
  buttonText: { fontWeight: '800' },
});
