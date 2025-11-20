
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba } from '../../types';
import { Button } from '../../components/ui/Button';
import { BookingModal } from './BookingModal';
import { Star, MapPin, Award, User, ArrowLeft } from 'lucide-react';

export const GurubaSelection: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  
  const [service, setService] = useState<Service | null>(null);
  const [gurubas, setGurubas] = useState<Guruba[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuruba, setSelectedGuruba] = useState<Guruba | null>(null);

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

        // 3. Fetch Review Stats manually since we can't do complex aggregation SQL easily in this env
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
            const relevantGurubas = gurubasWithRatings.filter((g: any) => 
                g.specialties && Array.isArray(g.specialties) && g.specialties.includes(dbService.title)
            );
            setGurubas(relevantGurubas);
        }
      } catch (e) {
          console.error("Error fetching booking data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serviceId]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Gurubas...</div>;
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

        {gurubas.length === 0 ? (
          <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800 border border-yellow-200">
            No Gurubas currently listed for this specific service.
          </div>
        ) : (
          <div className="space-y-4">
            {gurubas.map((guruba) => (
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
                     {guruba.specialties.map(s => (
                       <span key={s} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-md">
                         {s}
                       </span>
                     ))}
                  </div>
                  
                  <p className="mt-3 text-sm text-stone-600 line-clamp-2">{guruba.bio}</p>
                </div>

                <Button onClick={() => setSelectedGuruba(guruba)}>
                  Select & Book
                </Button>
              </div>
            ))}
          </div>
        )}

        {selectedGuruba && (
          <BookingModal
            service={service}
            guruba={selectedGuruba}
            onClose={() => setSelectedGuruba(null)}
          />
        )}
      </div>
    </div>
  );
};
