import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>PUROHIT</Text>
      <Text style={styles.title}>A new cross-platform client starts here.</Text>
      <Text style={styles.body}>B10 Web and B11 iOS/Android share the same verified GurubyAI backend contracts.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, maxWidth: 760, width: '100%', alignSelf: 'center' },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  title: { marginTop: 12, fontSize: 36, fontWeight: '700', lineHeight: 44 },
  body: { marginTop: 16, fontSize: 17, lineHeight: 26 }
});
