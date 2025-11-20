import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Service } from '../../types';
import { Button } from '../../components/ui/Button';
import { Clock, ArrowRight, AlertTriangle } from 'lucide-react';

export const ServiceSelection: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      setError(null);
      try {
        const { data, error: dbError } = await supabase.from('services').select('*');
        
        if (dbError) throw dbError;

        if (data) {
          setServices(data);
        }
      } catch (err: any) {
        console.error("Error fetching services:", err);
        let msg = err.message;
        if (msg?.includes('querying schema')) {
            msg = 'Database Schema Error: Please run the fix_database_error.sql script in Supabase.';
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-saffron-600">Loading services...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-stone-900">Select a Service</h1>
          <p className="mt-2 text-stone-600">Choose the ritual you wish to perform.</p>
        </div>

        {error && (
            <div className="mb-8 mx-auto max-w-2xl bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-medium text-red-900">Failed to load services</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
            </div>
        )}

        {!error && services.length === 0 ? (
            <div className="text-center text-stone-500 mt-12">
                <p>No services found. Please ensure database is seeded and RLS policies allow read access.</p>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
                <div 
                key={service.id} 
                className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md border border-stone-200"
                >
                <div className="aspect-video w-full overflow-hidden bg-stone-200">
                    <img 
                    src={service.image_url || `https://via.placeholder.com/400x300?text=${service.title}`} 
                    alt={service.title} 
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
                <div className="flex flex-1 flex-col p-6">
                    <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-stone-900">{service.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-saffron-50 px-2 py-1 text-xs font-medium text-saffron-700">
                        ${service.base_price}
                    </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-500 flex-1">{service.description}</p>
                    
                    <div className="mt-4 flex items-center text-xs text-stone-400 mb-6">
                    <Clock className="mr-1 h-3 w-3" />
                    {service.duration_minutes} mins
                    </div>

                    <Button 
                    onClick={() => navigate(`/book/${service.id}`)}
                    className="w-full justify-between group-hover:bg-saffron-700"
                    >
                    Select
                    <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};