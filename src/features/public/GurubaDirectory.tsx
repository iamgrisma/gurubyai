"use client";

// features/public/GurubaDirectory.tsx

import React, { useState, useMemo } from 'react';

import { useRouter, redirect } from "next/navigation";
import { useGurubas, useServices } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { Search, MapPin, Star, Award, User, Filter, ArrowRight, X, Calendar } from 'lucide-react';
import { GurubaVerificationBadge } from '../../components/shared/GurubaVerificationBadge';
import { Service } from '../../types';

const GurubaCardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 animate-pulse">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-stone-200"></div>
                <div>
                    <div className="h-5 w-32 bg-stone-200 rounded-md mb-2"></div>
                    <div className="h-4 w-24 bg-stone-200 rounded-md"></div>
                </div>
            </div>
            <div className="h-6 w-12 bg-stone-200 rounded-lg"></div>
        </div>
        <div className="space-y-2 mb-4">
            <div className="h-4 w-full bg-stone-200 rounded-md"></div>
            <div className="h-4 w-3/4 bg-stone-200 rounded-md"></div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
            <div className="h-5 w-16 bg-stone-200 rounded-md"></div>
            <div className="h-5 w-20 bg-stone-200 rounded-md"></div>
            <div className="h-5 w-14 bg-stone-200 rounded-md"></div>
        </div>
        <div className="h-10 w-full bg-stone-200 rounded-lg mt-4"></div>
    </div>
);


export const GurubaDirectory: React.FC = () => {
  const router = useRouter();
  
  // Data Fetching
  const { data: gurubas = [], isLoading: gurubasLoading } = useGurubas();
  const { data: services = [] } = useServices();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGurubaForBooking, setSelectedGurubaForBooking] = useState<{id: string, name: string, specialties: string[]} | null>(null);

  // Filter Logic
  const filteredGurubas = useMemo(() => {
    if (!searchTerm) return gurubas;
    const lowerTerm = searchTerm.toLowerCase();
    return gurubas.filter(g => 
      g.profiles?.full_name?.toLowerCase().includes(lowerTerm) ||
      g.location.toLowerCase().includes(lowerTerm) ||
      g.specialties?.some(s => s.toLowerCase().includes(lowerTerm))
    );
  }, [gurubas, searchTerm]);

  // Helper to match specialty names to service IDs
  const getGurubaServices = (specialties: string[]) => {
      if (!specialties || !services) return [];
      // Find services where the title matches the specialty string
      // This relies on the exact match enforced by the system
      return services.filter(s => specialties.includes(s.title));
  };

  const handleServiceSelect = (serviceId: string, gurubaId: string) => {
      router.push(`/book/${serviceId}?gurubaId=${gurubaId}`);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero / Header */}
      <div className="bg-stone-900 text-white py-16 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-saffron-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="container mx-auto max-w-6xl relative z-10">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Your Spiritual Guide</h1>
              <p className="text-stone-400 text-lg max-w-2xl mb-8">
                  Browse verified Gurubas, Pandits, and Lamas based on their expertise, location, and community ratings.
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-2xl">
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
                  }}>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Search className="h-6 w-6 text-stone-400" />
                      </div>
                      <input 
                          type="text"
                          className="w-full pl-12 pr-32 py-4 rounded-2xl border-none text-stone-900 focus:ring-4 focus:ring-saffron-500/50 shadow-lg text-lg outline-none"
                          placeholder="Search by name, location, or puja type..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="absolute right-2 top-2">
                          <Button type="submit" className="h-10 px-6 bg-saffron-500 hover:bg-saffron-600 rounded-xl font-bold">Search</Button>
                      </div>
                  </form>
              </div>
          </div>
      </div>

      {/* Content Grid */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
          {gurubasLoading ? (
               <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => <GurubaCardSkeleton key={i} />)}
               </div>
          ) : filteredGurubas.length === 0 ? (
              <div className="text-center py-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 mb-4">
                      <Filter className="h-8 w-8 text-stone-400" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">No Gurubas Found</h3>
                  <p className="text-stone-500 mt-2">Try adjusting your search terms to find what you're looking for.</p>
                  <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Filters
                  </Button>
              </div>
          ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredGurubas.map((guruba, index) => (
                      <div 
                        key={guruba.id} 
                        className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1 animate-in fade-in"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                      >
                          <div className="p-6 flex-1">
                              <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                      <div className="h-14 w-14 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                          {guruba.profiles?.avatar_url ? (
                                              <img src={guruba.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                              <User className="h-6 w-6 text-stone-400" />
                                          )}
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-stone-900 text-lg leading-tight flex items-center gap-1.5">
                                            {guruba.profiles?.full_name}
                                            <GurubaVerificationBadge isVerified={guruba.is_verified} gurubaType={guruba.guruba_type} />
                                          </h3>
                                          <div className="flex items-center text-sm text-stone-500 mt-1">
                                              <MapPin className="h-3 w-3 mr-1" /> {guruba.location}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                      <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                                      <span className="text-xs font-bold text-yellow-700">{guruba.rating}</span>
                                  </div>
                              </div>

                              <div className="mb-4">
                                  <div className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-2">
                                      <Award className="h-3 w-3" /> Experience: {guruba.years_experience} Years
                                  </div>
                                  <p className="text-sm text-stone-600 line-clamp-2">
                                      {guruba.bio || "Experienced spiritual guide dedicated to performing vedic rituals with authenticity."}
                                  </p>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-4">
                                  {guruba.specialties?.slice(0, 4).map((spec, i) => (
                                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-saffron-50 text-saffron-700 border border-saffron-100">
                                          {spec}
                                      </span>
                                  ))}
                                  {(guruba.specialties?.length || 0) > 4 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-500">
                                          +{(guruba.specialties?.length || 0) - 4} more
                                      </span>
                                  )}
                              </div>
                          </div>

                          <div className="p-4 bg-stone-50 border-t border-stone-100">
                              <Button 
                                className="w-full justify-center" 
                                onClick={() => setSelectedGurubaForBooking({
                                    id: guruba.id, 
                                    name: guruba.profiles?.full_name || 'Guruba', 
                                    specialties: guruba.specialties || []
                                })}
                              >
                                  Book Appointment
                              </Button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Service Selection Modal */}
      {selectedGurubaForBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                      <div>
                          <h3 className="font-bold text-stone-900 text-lg">Book {selectedGurubaForBooking.name}</h3>
                          <p className="text-xs text-stone-500">Select a service to continue</p>
                      </div>
                      <button 
                        onClick={() => setSelectedGurubaForBooking(null)}
                        className="p-1 rounded-full hover:bg-stone-200 text-stone-500 transition-colors"
                      >
                          <X className="h-5 w-5" />
                      </button>
                  </div>
                  
                  <div className="p-2 max-h-[60vh] overflow-y-auto">
                      {getGurubaServices(selectedGurubaForBooking.specialties).length === 0 ? (
                          <div className="p-8 text-center text-stone-500">
                              <p>No specific services listed matching our catalog.</p>
                              <p className="text-xs mt-2">Try contacting support or choosing another Guruba.</p>
                          </div>
                      ) : (
                          <div className="grid gap-2 p-2">
                              {getGurubaServices(selectedGurubaForBooking.specialties).map(service => (
                                  <button 
                                      key={service.id}
                                      onClick={() => handleServiceSelect(service.id, selectedGurubaForBooking.id)}
                                      className="flex items-center justify-between p-4 rounded-xl border border-stone-200 hover:border-saffron-500 hover:bg-saffron-50 transition-all group text-left"
                                  >
                                      <div>
                                          <p className="font-bold text-stone-900 group-hover:text-saffron-900">{service.title}</p>
                                          <p className="text-xs text-stone-500 group-hover:text-saffron-700 mt-0.5">
                                              {service.duration_minutes} mins • Rs. {service.base_price}
                                          </p>
                                      </div>
                                      <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-saffron-500" />
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};