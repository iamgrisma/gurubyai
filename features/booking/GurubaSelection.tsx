// features/booking/GurubaSelection.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Guruba } from '../../types';
import { Button } from '../../components/ui/Button';
import { BookingModal } from './BookingModal';
import { useService, useGurubas } from '../../hooks/queries';
import { Star, MapPin, Award, User, ArrowLeft, Calendar, Filter, Info, RefreshCw } from 'lucide-react';
import { GurubaVerificationBadge } from '../../components/shared/GurubaVerificationBadge';

export const GurubaSelection: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGurubaId = searchParams.get('gurubaId');

  // --- Queries ---
  const { data: service, isLoading: serviceLoading } = useService(serviceId);
  const { data: allGurubas = [], isLoading: gurubasLoading } = useGurubas();

  // Local State
  const [selectedGuruba, setSelectedGuruba] = useState<Guruba | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

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
  // Only runs when a date is selected
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

  // --- Filter Logic ---
  const filteredGurubas = React.useMemo(() => {
    if (!service) return [];

    // 1. Filter by Service Specialty
    // Relaxed matching: Checks against service Title OR Category
    let matches = allGurubas.filter(g => {
      if (!g.specialties || g.specialties.length === 0) return true; // Generalists
      const serviceTerms = [service.title, service.category].filter(Boolean).map(t => t!.toLowerCase());
      return g.specialties.some(s => {
        const sLower = s.toLowerCase();
        return serviceTerms.some(term => sLower.includes(term) || term.includes(sLower));
      });
    });

    // 2. Filter by Date Availability
    if (selectedDate) {
      matches = matches.filter(g => availableGurubaIds.has(g.id));
    }

    return matches;
  }, [allGurubas, service, selectedDate, availableGurubaIds]);


  if (serviceLoading || gurubasLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-saffron-600">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!service) return <div className="p-8 text-center">Service not found.</div>;

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/services/${service.id}`)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
          </Button>
          <h1 className="text-3xl font-bold text-stone-900">Select a Guruba</h1>
          <p className="mt-2 text-stone-600">
            Who should perform <strong>{service.title}</strong> for you?
          </p>
        </div>

        {/* Availability Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 mb-8 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-stone-700 font-medium">
            <Filter className="h-5 w-5 text-saffron-600" />
            <span>Check Availability:</span>
          </div>
          <div className="relative flex-1 w-full">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="date"
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-saffron-500 focus:border-saffron-500 text-sm"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-sm text-stone-500 hover:text-stone-800 underline"
            >
              Clear Date
            </button>
          )}
        </div>

        {filteredGurubas.length === 0 ? (
          <div className="rounded-lg bg-stone-100 p-8 text-center border border-stone-200">
            <div className="mx-auto h-12 w-12 bg-stone-200 rounded-full flex items-center justify-center mb-3">
              <Info className="h-6 w-6 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900">No Gurubas Available</h3>
            <p className="text-stone-500 mt-1">
              {selectedDate
                ? `We couldn't find any Gurubas available on ${new Date(selectedDate).toLocaleDateString()}. Try a different date.`
                : "No Gurubas currently match this service specialization."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGurubas.map((guruba) => (
              <div
                key={guruba.id}
                className={`flex flex-col md:flex-row rounded-xl bg-white p-6 shadow-sm border transition-all hover:shadow-md items-start md:items-center gap-6 ${selectedGuruba?.id === guruba.id ? 'border-saffron-500 ring-1 ring-saffron-500' : 'border-stone-200'
                  }`}
              >
                <div className="h-16 w-16 flex-shrink-0 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-600 text-xl font-bold overflow-hidden">
                  {guruba.profiles?.avatar_url ? (
                    <img src={guruba.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-stone-900">{guruba.profiles?.full_name}</h3>
                    <GurubaVerificationBadge isVerified={guruba.is_verified} gurubaType={guruba.guruba_type} />
                    <div className="flex items-center text-sm text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      <span className="font-bold">{guruba.rating}</span>
                      <span className="text-stone-400 ml-1 font-normal">({guruba.review_count || 0})</span>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-stone-500">
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" /> {guruba.location}
                    </span>
                    <span className="flex items-center">
                      <Award className="mr-1 h-3 w-3" /> {guruba.years_experience} Years Exp.
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {guruba.specialties?.slice(0, 4).map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3 text-sm text-stone-600 line-clamp-2">{guruba.bio}</p>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <Button onClick={() => setSelectedGuruba(guruba)} className="w-full whitespace-nowrap">
                    Select & Book
                  </Button>
                  {selectedDate && (
                    <p className="text-xs text-green-600 text-center bg-green-50 rounded py-1">
                      Available {new Date(selectedDate).toLocaleDateString()}
                    </p>
                  )}
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
              // Clear URL param to prevent auto-reopening
              if (preselectedGurubaId) {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('gurubaId');
                navigate({ search: newParams.toString() }, { replace: true });
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
