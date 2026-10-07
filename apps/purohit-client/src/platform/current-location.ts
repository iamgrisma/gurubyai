import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type CurrentLocation = {
  latitude: number;
  longitude: number;
};

export async function getCurrentLocation(): Promise<CurrentLocation> {
  if (Platform.OS === 'web') {
    throw new Error('Use current location is available in the Purohit iOS and Android apps.');
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('Location services are turned off. Enable device location services and try again.');
  }

  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status !== 'granted') {
    throw new Error('Location permission was denied. You can still enter or search the service address manually.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = position.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('The device returned an invalid location. Try again or enter the address manually.');
  }

  return { latitude, longitude };
}
