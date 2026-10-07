import { Marker } from 'react-native-maps';
import MapView from 'react-native-maps';
import { StyleSheet } from 'react-native';

export function LocationMap({ latitude, longitude, label }: { latitude: number; longitude: number; label?: string }) {
  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  };
  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      scrollEnabled
      zoomEnabled
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
    >
      <Marker coordinate={{ latitude, longitude }} title={label ?? 'Selected location'} />
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { width: '100%', height: 220 } });
