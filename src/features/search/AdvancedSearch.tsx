"use client";

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGurubas, useServices } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { Search, MapPin, Star, Filter, Calendar } from 'lucide-react';
import { GurubaVerificationBadge } from '../../components/shared/GurubaVerificationBadge';

export const AdvancedSearch: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialQuery = searchParams.get('q') || '';
    const initialLocation = searchParams.get('location') || '';

    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [locationTerm, setLocationTerm] = useState(initialLocation);
    const [minRating, setMinRating] = useState(0);

    const { data: gurubas = [], isLoading: gurubasLoading } = useGurubas();
    const { data: services = [] } = useServices();

    const filteredGurubas = useMemo(() => {
        return gurubas.filter(g => {
            const matchesSearch = !searchTerm || g.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || g.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesLocation = !locationTerm || g.location.toLowerCase().includes(locationTerm.toLowerCase());
            const matchesRating = !minRating || (g.rating || 0) >= minRating;

            return matchesSearch && matchesLocation && matchesRating;
        });
    }, [gurubas, searchTerm, locationTerm, minRating]);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        if (locationTerm) params.set('location', locationTerm);
        if (minRating) params.set('minRating', minRating.toString());
        router.push(`/search?${params.toString()}`);
    };

    const getGurubaServices = (specialties: string[]) => {
        if (!specialties || !services) return [];
        return services.filter(s => specialties.includes(s.title));
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="glass-panel p-6 rounded-3xl mb-8 border border-stone-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" />
                        <input
                            type="text"
                            placeholder="What service do you need?"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none bg-stone-50"
                        />
                    </div>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Location (e.g. Kathmandu)"
                            value={locationTerm}
                            onChange={(e) => setLocationTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none bg-stone-50"
                        />
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <select
                                value={minRating}
                                onChange={(e) => setMinRating(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-saffron-500 outline-none bg-stone-50"
                            >
                                <option value={0}>Any Rating</option>
                                <option value={4.5}>4.5+ Stars</option>
                                <option value={4.0}>4.0+ Stars</option>
                                <option value={3.5}>3.5+ Stars</option>
                            </select>
                        </div>
                        <Button onClick={handleSearch} className="h-full px-8 bg-saffron-500 hover:bg-saffron-600 text-white rounded-xl">
                            Search
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Filters Sidebar could go here in the future, for now full width results */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-outfit font-bold text-stone-800">
                            {filteredGurubas.length} Gurubas Found
                        </h2>
                    </div>

                    {gurubasLoading ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saffron-500"></div></div>
                    ) : filteredGurubas.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredGurubas.map(guruba => {
                                const matchingServices = getGurubaServices(guruba.specialties || []);
                                return (
                                    <div key={guruba.id} className="glass-panel p-6 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 rounded-full bg-saffron-100 flex items-center justify-center border-2 border-saffron-200 overflow-hidden shrink-0">
                                                    {guruba.profiles?.avatar_url ? (
                                                        <img src={guruba.profiles.avatar_url} alt={guruba.profiles.full_name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-2xl font-outfit font-bold text-saffron-600">
                                                            {guruba.profiles?.full_name?.[0] || 'G'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold font-outfit text-stone-900 flex items-center gap-2">
                                                        {guruba.profiles?.full_name}
                                                        {guruba.is_verified && <GurubaVerificationBadge verified />}
                                                    </h3>
                                                    <div className="flex items-center text-sm text-stone-500 mt-1 gap-1">
                                                        <MapPin className="h-4 w-4" /> {guruba.location}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full">
                                                <Star className="h-4 w-4 text-saffron-500 fill-saffron-500" />
                                                <span className="font-bold text-stone-700 text-sm">{guruba.rating?.toFixed(1) || 'New'}</span>
                                            </div>
                                        </div>

                                        <p className="text-stone-600 text-sm line-clamp-2 mb-4 leading-relaxed">
                                            {guruba.bio || 'Experienced spiritual guide ready to assist with your religious ceremonies.'}
                                        </p>

                                        {matchingServices.length > 0 && (
                                            <div className="mb-6">
                                                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Services</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {matchingServices.slice(0, 3).map(service => (
                                                        <span key={service.id} className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-xs font-medium border border-stone-200">
                                                            {service.title}
                                                        </span>
                                                    ))}
                                                    {matchingServices.length > 3 && (
                                                        <span className="px-3 py-1.5 bg-stone-50 text-stone-500 rounded-lg text-xs font-medium border border-stone-200">
                                                            +{matchingServices.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-stone-100">
                                            <Button 
                                                className="w-full"
                                                onClick={() => {
                                                    const path = matchingServices.length > 0 
                                                        ? `/book/${matchingServices[0].id}?gurubaId=${guruba.id}`
                                                        : `/book/custom?gurubaId=${guruba.id}`;
                                                    router.push(path);
                                                }}
                                            >
                                                Book Now
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
                            <Search className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-stone-800 mb-2">No Gurubas Found</h3>
                            <p className="text-stone-500">Try adjusting your search filters to find more results.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
