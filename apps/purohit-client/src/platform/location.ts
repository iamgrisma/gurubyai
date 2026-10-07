import * as Location from 'expo-location';

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  address: string | null;
};

export type LocationAccessCode =
  | 'permission_denied'
  | 'services_disabled'
  | 'position_unavailable';

export class LocationAccessError extends Error {
  code: LocationAccessCode;

  constructor(code: LocationAccessCode, message: string) {
    super(message);
    this.name = 'LocationAccessError';
    this.code = code;
  }
}

function formatAddress(address: Location.LocationGeocodedAddress) {
  const parts = [
    address.name,
    address.street,
    address.district,
    address.subregion,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ].filter((part): part is string => Boolean(part?.trim()));
  return [...new Set(parts)].join(', ') || null;
}

export async function getCurrentLocation(): Promise<CurrentLocation> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationAccessError(
      'services_disabled',
      'Turn on location services and try again.'
    );
  }

  const permission = await Location.getForegroundPermissionsAsync();
  const status =
    permission.status === 'granted'
      ? permission.status
      : (await Location.requestForegroundPermissionsAsync()).status;

  if (status !== 'granted') {
    throw new LocationAccessError(
      'permission_denied',
      'Location permission was denied. You can still search for or enter an address manually.'
    );
  }

  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 500,
    });
    const position =
      lastKnown ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      }));

    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new LocationAccessError(
        'position_unavailable',
        'Your current location could not be determined. Search for the address instead.'
      );
    }

    let address: string | null = null;
    try {
      const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverse[0]) address = formatAddress(reverse[0]);
    } catch {
      // Coordinates are still useful even if reverse geocoding is temporarily unavailable.
    }

    return { latitude, longitude, address };
  } catch (error) {
    if (error instanceof LocationAccessError) throw error;
    throw new LocationAccessError(
      'position_unavailable',
      'Your current location could not be determined. Check your device settings or search for the address instead.'
    );
  }
}
