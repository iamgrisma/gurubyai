"use client";

// features/booking/GurubaSelection.tsx

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams, redirect } from "next/navigation";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Guruba } from '../../types';
import { Button } from '../../components/ui/Button';
import { BookingModal } from './BookingModal';
import { useService, useGurubas } from '../../hooks/queries';
import { Star, MapPin, Award, User, ArrowLeft, Calendar, Filter, Info, RefreshCw, Search } from 'lucide-react';
import { GurubaVerificationBadge } from '../../components/shared/GurubaVerificationBadge';

export const GurubaSelection: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGurubaId = searchParams.get('gurubaId');

  // --- Queries ---
  const { data: service, isLoading: serviceLoading } = useService(serviceId);
  const { data: allGurubas = [], isLoading: gurubasLoading } = useGurubas();

  // Local State
  const [selectedGuruba, setSelectedGuruba] = useState<Guruba | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState<number>(0);

  // --- Auto-select logic ---
  useEffect(() => {
    if (preselectedGurubaId && allGurubas.length > 0 && !selectedGuruba) {
      const found = allGurubas.find(g => g.id === preselectedGurubaId);
      if (found) {
        setSelectedGuruba(found);
      }
    }
  }, [preselectedGurubaId, allGurubas]);

  // --- Availability Query ---
  const { data: availableGurubaIds = new Set<string>() } = useQuery({
    queryKey: ['availableGurubas', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return new Set<string>();
      const dayOfWeek = new Date(selectedDate).getDay();

      const { data } = await supabase
        .from('guruba_availability')
        .select('guruba_id')
        .eq('day_of_week', dayOfWeek);

      return new Set<string>(data?.map((d: any) => d.guruba_id));
    },
    enabled: !!selectedDate
  });

  // --- Robust Filter Logic ---
  const filteredGurubas = React.useMemo(() => {
    if (!service) return [];

    let matches = allGurubas.filter(g => {
      // 1. Service specialty match (if not generalist)
      if (g.specialties && g.specialties.length > 0) {
        const serviceTerms = [service.title, service.category].filter(Boolean).map(t => t!.toLowerCase());
        const hasSpecialtyMatch = g.specialties.some(s => {
          const sLower = s.toLowerCase();
          return serviceTerms.some(term => sLower.includes(term) || term.includes(sLower));
        });
        if (!hasSpecialtyMatch) return false;
      }
      
      // 2. Rating match
      if (g.rating < minRating) return false;

      // 3. Search Query match (bio, location, name, specialty)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchPool = [
            g.profiles?.full_name,
            g.bio,
            g.location,
            ...(g.specialties || [])
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchPool.includes(q)) return false;
      }

      return true;
    });

    // 4. Date Availability match
    if (selectedDate) {
      matches = matches.filter(g => availableGurubaIds.has(g.id));
    }

    // Sort by rating by default
    return matches.sort((a, b) => b.rating - a.rating);
  }, [allGurubas, service, selectedDate, availableGurubaIds, searchQuery, minRating]);


  if (serviceLoading || gurubasLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-saffron-600 bg-stone-50">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!service) return <div className="p-8 text-center bg-stone-50 min-h-screen">Service not found.</div>;

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/services/${service.id}`)} className="mb-6 -ml-4 text-stone-500 hover:text-stone-800">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to {service.title} Details
          </Button>
          <h1 className="text-4xl font-outfit font-bold text-stone-900 tracking-tight">Select a Guruba</h1>
          <p className="mt-3 text-lg text-stone-600 max-w-2xl">
            Choose the perfect spiritual guide for your <strong>{service.title}</strong> based on ratings, location, and availability.
          </p>
        </div>

        {/* Premium Filter Bar */}
        <div className="glass-panel p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-end gap-5">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
              <input
                type="text"
                placeholder="Name, location, specialty..."
                className="w-full pl-10 pr-4 py-2.5 border border-stone-200 bg-white/50 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 text-sm outline-none transition-shadow"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex justify-between">
                <span>Availability</span>
                {selectedDate && <button onClick={() => setSelectedDate('')} className="text-saffron-600 hover:underline">Clear</button>}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2.5 border border-stone-200 bg-white/50 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 text-sm outline-none transition-shadow"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-1/3">
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex justify-between">
                <span>Minimum Rating</span>
                <span className="text-saffron-600">{minRating > 0 ? `${minRating}+ Stars` : 'Any'}</span>
             </label>
             <input 
                type="range" 
                min="0" max="5" step="1" 
                value={minRating} 
                onChange={e => setMinRating(parseInt(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-saffron-500 my-3"
             />
          </div>
        </div>

        {filteredGurubas.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-stone-100 shadow-sm animate-in zoom-in-95">
            <div className="mx-auto h-16 w-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
              <Info className="h-8 w-8 text-stone-300" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 font-outfit">No Match Found</h3>
            <p className="text-stone-500 mt-2 max-w-md mx-auto">
              {selectedDate
                ? `No Gurubas available on ${new Date(selectedDate).toLocaleDateString()} matching your criteria.`
                : "No Gurubas match your current search and filter criteria."}
            </p>
            {(searchQuery || selectedDate || minRating > 0) && (
                <Button variant="outline" className="mt-6 border-stone-200" onClick={() => { setSearchQuery(''); setSelectedDate(''); setMinRating(0); }}>
                    Clear All Filters
                </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-5">
            {filteredGurubas.map((guruba) => (
              <div
                key={guruba.id}
                className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm border transition-all hover:shadow-lg hover:-translate-y-1 ${selectedGuruba?.id === guruba.id ? 'border-saffron-500 ring-2 ring-saffron-500/20' : 'border-stone-100'}`}
              >
                <div className="flex items-start gap-4 mb-4">
                    <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-br from-saffron-100 to-orange-50 flex items-center justify-center text-saffron-600 text-xl font-bold overflow-hidden shadow-inner">
                    {guruba.profiles?.avatar_url ? (
                        <img src={guruba.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <User className="h-8 w-8" />
                    )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-stone-900 truncate">{guruba.profiles?.full_name}</h3>
                            <GurubaVerificationBadge isVerified={guruba.is_verified} gurubaType={guruba.guruba_type} />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                                <Star className="h-3.5 w-3.5 mr-1 text-saffron-500 fill-saffron-500" />
                                {guruba.rating} <span className="text-stone-400 ml-1 font-normal">({guruba.review_count || 0})</span>
                            </div>
                            <span className="flex items-center text-xs text-stone-500 font-medium">
                                <Award className="mr-1 h-3.5 w-3.5" /> {guruba.years_experience} Yrs Exp.
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <span className="flex items-center text-sm text-stone-600 mb-3 bg-stone-50 w-fit px-3 py-1.5 rounded-lg border border-stone-100">
                        <MapPin className="mr-2 h-4 w-4 text-stone-400" /> {guruba.location}
                    </span>
                    <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed mb-4">{guruba.bio}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-stone-50 flex items-center justify-between">
                    <div className="flex gap-2 max-w-[50%] overflow-hidden">
                        {guruba.specialties?.slice(0, 2).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-saffron-50/50 text-saffron-800 text-[10px] font-bold uppercase tracking-wider rounded-md truncate">
                            {s}
                        </span>
                        ))}
                        {guruba.specialties && guruba.specialties.length > 2 && (
                            <span className="px-2 py-1 bg-stone-50 text-stone-500 text-[10px] font-bold rounded-md">+{guruba.specialties.length - 2}</span>
                        )}
                    </div>
                    <Button onClick={() => setSelectedGuruba(guruba)} className="bg-stone-900 hover:bg-stone-800 shadow-md">
                        Select Guruba
                    </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedGuruba && (
          <BookingModal
            service={service}
            guruba={selectedGuruba}
            initialDate={selectedDate}
            onClose={() => {
              setSelectedGuruba(null);
              if (preselectedGurubaId) {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('gurubaId');
                router.push(`?${newParams.toString()}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
