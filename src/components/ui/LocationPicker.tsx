"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Search, MapPin, Locate, X, Check, Loader2 } from 'lucide-react';
import L from 'leaflet';

const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

interface LocationPickerProps {
  initialLocation?: Location;
  onLocationSelect: (loc: Location) => void;
  readonly?: boolean;
}

const reverseGeocode = async (lat: number, lng: number) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) throw new Error('Reverse geocoding failed');
  const data = await response.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const MapEvents = ({
  onPick,
  setPosition,
  setAddress,
  setBusy,
}: {
  onPick: (loc: Location) => void;
  setPosition: (pos: [number, number]) => void;
  setAddress: (addr: string) => void;
  setBusy: (busy: boolean) => void;
}) => {
  const map = useMap();

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setPosition([lat, lng]);
      setAddress('Finding address…');
      setBusy(true);
      onPick({ lat, lng, address: fallback });
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.25 });

      try {
        const address = await reverseGeocode(lat, lng);
        setAddress(address);
        onPick({ lat, lng, address });
      } catch {
        setAddress(fallback);
      } finally {
        setBusy(false);
      }
    },
  });

  return null;
};

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLocation,
  onLocationSelect,
  readonly = false,
}) => {
  const defaultCenter: [number, number] = [27.7172, 85.3240];
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialLocation && Number.isFinite(initialLocation.lat) && Number.isFinite(initialLocation.lng)) {
      setPosition([initialLocation.lat, initialLocation.lng]);
      setAddress(initialLocation.address || `${initialLocation.lat.toFixed(5)}, ${initialLocation.lng.toFixed(5)}`);
    }
  }, [initialLocation?.lat, initialLocation?.lng, initialLocation?.address]);

  const displayCenter = useMemo(() => position || defaultCenter, [position]);

  const selectResult = (result: SearchResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const loc = { lat, lng, address: result.display_name };
    setPosition([lat, lng]);
    setAddress(result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setError('');
    onLocationSelect(loc);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || searching) return;

    setSearching(true);
    setError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=np&q=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!response.ok) throw new Error('Search failed');
      const data = (await response.json()) as SearchResult[];
      setSearchResults(data);
      if (!data.length) setError('No matching place found. Try a landmark, street, ward, or area name.');
    } catch {
      setSearchResults([]);
      setError('Location search failed. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location access.');
      return;
    }

    setLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setPosition([latitude, longitude]);
        setAddress('Finding your address…');
        onLocationSelect({ lat: latitude, lng: longitude, address: fallback });

        try {
          const resolved = await reverseGeocode(latitude, longitude);
          setAddress(resolved);
          onLocationSelect({ lat: latitude, lng: longitude, address: resolved });
        } catch {
          setAddress(fallback);
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        setLocating(false);
        setError(
          geoError.code === 1
            ? 'Location permission was denied. You can search for your place or tap the map instead.'
            : 'Could not determine your current location. You can search or choose a point on the map.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-stone-100 bg-stone-50/70">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <p className="text-sm font-bold text-stone-900">Choose a precise location</p>
            <p className="text-xs text-stone-500">Search, use your current location, or tap the map.</p>
          </div>
          {busy && <Loader2 className="h-4 w-4 animate-spin text-saffron-600" />}
        </div>

        {!readonly && (
          <div className="relative">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-9 py-3 text-sm text-stone-800 outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/20"
                  placeholder="Search address, landmark, street or area…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchResults([]);
                    setError('');
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setError('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="rounded-xl bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1000] rounded-xl border border-stone-200 bg-white shadow-xl overflow-hidden">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.lat}-${result.lon}-${index}`}
                    type="button"
                    onClick={() => selectResult(result)}
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-saffron-50 border-b last:border-0 border-stone-100"
                  >
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-saffron-600" />
                    <span className="text-xs leading-5 text-stone-700">{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!readonly && (
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-50"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
            {locating ? 'Finding you…' : 'Use my current location'}
          </button>
        )}

        {error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="h-72 sm:h-80 w-full relative z-0">
        <MapContainer center={displayCenter} zoom={position ? 15 : 13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!readonly && (
            <MapEvents
              onPick={onLocationSelect}
              setPosition={setPosition}
              setAddress={setAddress}
              setBusy={setBusy}
            />
          )}
          {position && (
            <>
              <Marker position={position} />
              <ChangeView center={position} />
            </>
          )}
        </MapContainer>
      </div>

      <div className="p-3 border-t border-stone-100">
        {address ? (
          <div className="flex items-start gap-2 rounded-xl bg-saffron-50 border border-saffron-100 p-3">
            <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-saffron-700">Selected location</p>
              <p className="text-xs leading-5 text-stone-700 break-words">{address}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <MapPin className="h-4 w-4" /> No location selected yet.
          </div>
        )}
      </div>
    </div>
  );
};
