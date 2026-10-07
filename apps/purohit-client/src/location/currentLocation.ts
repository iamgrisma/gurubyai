import * as Location from 'expo-location';
import { Platform, Linking } from 'react-native';

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
};

function formatAddress(value: Location.LocationGeocodedAddress) {
  const parts = [
    value.name,
    value.street,
    value.streetNumber,
    value.district,
    value.subregion,
    value.city,
    value.region,
    value.postalCode,
    value.country,
  ].filter((part): part is string => Boolean(part?.trim()));
  return Array.from(new Set(parts)).join(', ') || null;
}

export async function getCurrentDeviceLocation(): Promise<DeviceLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error(permission.canAskAgain
      ? 'Location permission was not granted. Allow location access and try again.'
      : 'Location permission is blocked. Open app location settings and allow access.');
  }

  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    throw new Error('Device location services are turned off. Enable them and try again.');
  }

  const cached = await Location.getLastKnownPositionAsync({});
  const position = cached ?? await Location.getCurrentPositionAsync({});

  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  let address: string | null = null;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    address = results[0] ? formatAddress(results[0]) : null;
  } catch {
    // Coordinates are still usable when reverse geocoding is unavailable.
  }

  return {
    latitude,
    longitude,
    accuracy: position.coords.accuracy ?? null,
    address,
  };
}

export async function openLocationSettings() {
  if (Platform.OS === 'web') return;
  await Linking.openSettings();
}
