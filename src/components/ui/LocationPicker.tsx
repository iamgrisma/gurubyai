"use client";


import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Search, MapPin, Locate } from 'lucide-react';
import L from 'leaflet';

// Fix for default Leaflet marker icon issues in React
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
    lat: number;
    lng: number;
    address: string;
}

interface LocationPickerProps {
    initialLocation?: Location;
    onLocationSelect: (loc: Location) => void;
    readonly?: boolean;
}

const MapEvents = ({ onLocationSelect, setPosition, setAddress }: { 
    onLocationSelect: (loc: Location) => void;
    setPosition: (pos: [number, number]) => void;
    setAddress: (addr: string) => void;
}) => {
    const map = useMap();
    useMapEvents({
        click: async (e) => {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            map.flyTo([lat, lng], map.getZoom());
            
            setAddress("Fetching address...");
            
            // Optimistic update for coordinates immediately
            onLocationSelect({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                if (!response.ok) throw new Error("Failed");
                const data = await response.json();
                const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                setAddress(address);
                onLocationSelect({ lat, lng, address });
            } catch (err) {
                console.warn("Geocoding failed", err);
                // Fallback already set
            }
        },
    });
    return null;
};

const ChangeView = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13);
    }, [center, map]);
    return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ initialLocation, onLocationSelect, readonly = false }) => {
    const defaultCenter: [number, number] = [27.7172, 85.3240]; // Kathmandu
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [address, setAddress] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (initialLocation && initialLocation.lat && initialLocation.lng) {
            setPosition([initialLocation.lat, initialLocation.lng]);
            setAddress(initialLocation.address || '');
        }
    }, [initialLocation]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        setSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Nepal')}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                const newLoc = { lat: newLat, lng: newLng, address: display_name };
                
                setPosition([newLat, newLng]);
                setAddress(display_name);
                onLocationSelect(newLoc);
            } else {
                alert("Location not found");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        setSearching(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setPosition([latitude, longitude]);
                
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                    const data = await response.json();
                    const newAddress = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                    setAddress(newAddress);
                    onLocationSelect({ lat: latitude, lng: longitude, address: newAddress });
                } catch (e) {
                    const fallbackAddr = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                    setAddress(fallbackAddr);
                    onLocationSelect({ lat: latitude, lng: longitude, address: fallbackAddr });
                }
                setSearching(false);
            },
            (err) => {
                console.error(err);
                alert("Unable to retrieve your location.");
                setSearching(false);
            }
        );
    };

    const displayCenter = position || defaultCenter;

    return (
        <div className="w-full border-2 border-dashed border-blue-200 rounded-xl p-2 relative group">
            <div className="h-72 w-full rounded-lg overflow-hidden relative z-0">
                <MapContainer center={displayCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {!readonly && (
                        <MapEvents 
                            onLocationSelect={onLocationSelect} 
                            setPosition={setPosition} 
                            setAddress={setAddress} 
                        />
                    )}
                    {position && (
                        <>
                            <Marker position={position} />
                            <ChangeView center={position} />
                        </>
                    )}
                </MapContainer>

                {!readonly && (
                    <>
                        {/* Floating Search Bar */}
                        <div className="absolute top-3 left-3 right-14 z-[400]">
                            <form onSubmit={handleSearch} className="flex shadow-lg">
                                <div className="relative flex-1">
                                    <input 
                                        type="text"
                                        className="w-full pl-3 pr-10 py-2 rounded-l-lg text-sm focus:outline-none border-0 bg-white/90 backdrop-blur-sm text-stone-800 placeholder:text-stone-500"
                                        placeholder="Search city or area..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button type="submit" disabled={searching} className="absolute right-0 top-0 h-full px-3 text-stone-500 hover:text-saffron-600">
                                        <Search className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Locate Me Button */}
                        <button 
                            onClick={handleLocateMe}
                            disabled={searching}
                            className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg text-stone-600 hover:text-saffron-600 transition-colors"
                            title="Use Current Location"
                        >
                            <Locate className={`h-5 w-5 ${searching ? 'animate-spin' : ''}`} />
                        </button>
                    </>
                )}
            </div>
            
            {address && (
                <div className="mt-2 flex items-start gap-2 text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-100">
                    <MapPin className="h-4 w-4 text-saffron-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{address}</span>
                </div>
            )}
        </div>
    );
};
