
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba } from '../../types';
import { Button } from '../../components/ui/Button';
import { BookingModal } from './BookingModal';
import { Star, MapPin, Award, User, ArrowLeft, Calendar, Filter, Info } from 'lucide-react';

// Removed unused DAYS_MAP

export const GurubaSelection: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [gurubas, setGurubas] = useState<Guruba[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuruba, setSelectedGuruba] = useState<Guruba | null>(null);
  
  // Availability Filtering
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableGurubaIds, setAvailableGurubaIds] = useState<Set<string>>(new Set());
  const [filteringByDate, setFilteringByDate] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!serviceId) return;
      setLoading(true);

      try {
        // 1. Fetch Service Details
        const { data: dbService, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', serviceId)
            .single();
        
        if (serviceError) throw serviceError;
        setService(dbService);

        // 2. Fetch Gurubas
        const { data: gurubaData, error: gurubaError } = await supabase
            .from('gurubas')
            .select(`
            *,
            profiles:user_id (
                full_name,
                gotra_id,
                avatar_url
            )
            `);

        if (gurubaError) throw gurubaError;

        // 3. Fetch Review Stats manually
        const { data: reviewData } = await supabase
            .from('reviews')
            .select('guruba_id, rating');

        if (gurubaData && dbService) {
            // Map reviews to gurubas
            const gurubasWithRatings = gurubaData.map((g: any) => {
                const gReviews = reviewData?.filter((r: any) => r.guruba_id === g.id) || [];
                const avgRating = gReviews.length > 0 
                    ? gReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / gReviews.length 
                    : g.rating || 5.0;
                
                return {
                    ...g,
                    rating: parseFloat(avgRating.toFixed(1)),
                    review_count: gReviews.length
                };
            });

            // Filter: Does the Guruba specialize in this service?
            // Relaxed matching: Checks against service Title OR Category
            const relevantGurubas = gurubasWithRatings.filter((g: any) => {
                if (!g.specialties || !Array.isArray(g.specialties)) return true; // Show all if no specialties listed (generalists)
                if (g.specialties.length === 0) return true;

                const serviceTerms = [dbService.title, dbService.category].filter(Boolean).map(t => t!.toLowerCase());
                return g.specialties.some((s: string) => {
                    const sLower = s.toLowerCase();
                    return serviceTerms.some(term => sLower.includes(term) || term.includes(sLower));
                });
            });
            
            // Fallback if no one matches specifics, show all but maybe warn? For now, just showing matched or all if filtering is too strict.
            // If strict filter returned 0, let's show all gurubas to prevent empty screen, but maybe sorted.
            setGurubas(relevantGurubas.length > 0 ? relevantGurubas : gurubasWithRatings);
        }
      } catch (e) {
          console.error("Error fetching booking data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serviceId]);

  // Handle Date Filtering
  useEffect(() => {
      if (!selectedDate) {
          setAvailableGurubaIds(new Set());
          setFilteringByDate(false);
          return;
      }

      const checkAvailability = async () => {
          setFilteringByDate(true);
          const dayOfWeek = new Date(selectedDate).getDay();
          
          const { data, error } = await supabase
            .from('guruba_availability')
            .select('guruba_id')
            .eq('day_of_week', dayOfWeek);
          
          if (data) {
              // Explicitly cast mapped array to strings for Set<string>
              const availableIds = new Set<string>(data.map((d: any) => d.guruba_id));
              setAvailableGurubaIds(availableIds);
          }
      };
      
      checkAvailability();
  }, [selectedDate]);

  const getFilteredGurubas = () => {
      if (!selectedDate) return gurubas;
      return gurubas.filter(g => availableGurubaIds.has(g.id));
  };

  const displayedGurubas = getFilteredGurubas();

  if (loading) return <div className="flex h-screen items-center justify-center text-saffron-600">Loading Gurubas...</div>;
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

        {displayedGurubas.length === 0 ? (
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
            {displayedGurubas.map((guruba) => (
              <div 
                key={guruba.id} 
                className="flex flex-col md:flex-row rounded-xl bg-white p-6 shadow-sm border border-stone-200 transition-all hover:shadow-md items-start md:items-center gap-6"
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
                    <div className="flex items-center text-sm text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      <span className="font-bold">{guruba.rating}</span>
                      <span className="text-stone-400 ml-1 font-normal">({guruba.review_count || 0})</span>
                    </div>
                    {guruba.is_verified && (
                         <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">Verified</span>
                    )}
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
                     {guruba.specialties?.slice(0, 4).map(s => (
                       <span key={s} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-md">
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
            onClose={() => setSelectedGuruba(null)}
          />
        )}
      </div>
    </div>
  );
};
