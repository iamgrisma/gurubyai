
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Service } from '../../types';
import { Button } from '../../components/ui/Button';
import { Clock, ArrowRight, AlertTriangle, Tag } from 'lucide-react';

export const ServiceSelection: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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
          setFilteredServices(data);
          
          // Extract unique categories
          const uniqueCats = ['All', ...new Set(data.map(s => s.category || 'General'))];
          setCategories(uniqueCats as string[]);
        }
      } catch (err: any) {
        console.error("Error fetching services:", err);
        setError("Failed to load services.");
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredServices(services);
    } else {
      setFilteredServices(services.filter(s => (s.category || 'General') === selectedCategory));
    }
  }, [selectedCategory, services]);

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
            <div className="mb-6 mx-auto max-w-2xl bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-800">
                 <AlertTriangle className="h-4 w-4" />
                 <span>{error}</span>
            </div>
        )}

        {/* Category Filters */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                selectedCategory === category
                  ? 'bg-saffron-600 text-white border-saffron-600 shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-saffron-300 hover:text-saffron-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {filteredServices.length === 0 && !error ? (
            <div className="text-center text-stone-500 mt-12">
                <p>No services found for this category.</p>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
                <div 
                key={service.id} 
                className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md border border-stone-200"
                >
                <div className="aspect-video w-full overflow-hidden bg-stone-200 relative">
                    <img 
                    src={service.image_url || `https://via.placeholder.com/400x300?text=${service.title}`} 
                    alt={service.title} 
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {service.category && (
                      <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                        {service.category}
                      </span>
                    )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                    <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-stone-900">{service.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-saffron-50 px-2 py-1 text-xs font-medium text-saffron-700">
                        ${service.base_price}
                    </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-500 flex-1 line-clamp-2">{service.description}</p>
                    
                    <div className="mt-4 flex items-center text-xs text-stone-400 mb-6 gap-4">
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {service.duration_minutes} mins
                      </span>
                      {service.category && (
                        <span className="flex items-center">
                           <Tag className="mr-1 h-3 w-3" />
                           {service.category}
                        </span>
                      )}
                    </div>

                    <Button 
                    onClick={() => navigate(`/services/${service.id}`)}
                    className="w-full justify-between group-hover:bg-saffron-700"
                    >
                    Details & Book
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
