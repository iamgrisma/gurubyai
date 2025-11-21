
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Guruba, GurubaService } from '../../../types';
import { useServices } from '../../../hooks/queries';
import { Button } from '../../../components/ui/Button';
import { XCircle, PlusCircle, Video, Check } from 'lucide-react';

interface ServicesProps {
  guruba: Guruba | null;
}

export const GurubaServices: React.FC<ServicesProps> = ({ guruba }) => {
  const queryClient = useQueryClient();
  const { data: allServices = [] } = useServices();
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');

  // Fetch My Selected Services
  const { data: myServices = [] } = useQuery({
      queryKey: ['myServices', guruba?.id],
      queryFn: async () => {
          if (!guruba?.id) return [];
          const { data } = await supabase.from('guruba_services').select('*').eq('guruba_id', guruba.id);
          return (data || []) as GurubaService[];
      },
      enabled: !!guruba?.id
  });

  const toggleService = async (serviceId: string, currentStatus: boolean) => {
      if (!guruba) return;
      if (currentStatus) {
          await supabase.from('guruba_services').delete().match({ guruba_id: guruba.id, service_id: serviceId });
      } else {
          await supabase.from('guruba_services').insert({ guruba_id: guruba.id, service_id: serviceId, is_online: false });
      }
      queryClient.invalidateQueries({ queryKey: ['myServices'] });
  };

  const toggleOnlineService = async (serviceId: string, currentOnline: boolean) => {
       if (!guruba) return;
       await supabase.from('guruba_services').update({ is_online: !currentOnline }).match({ guruba_id: guruba.id, service_id: serviceId });
       queryClient.invalidateQueries({ queryKey: ['myServices'] });
  };

  const myServiceIds = new Set(myServices.map(s => s.service_id));
  const serviceCategories = ['All', ...new Set(allServices.map(s => s.category).filter(Boolean) as string[])];
  const filteredServices = selectedServiceCategory === 'All'
      ? allServices
      : allServices.filter(s => s.category === selectedServiceCategory);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div>
            <h2 className="text-2xl font-bold text-stone-900">My Service Catalog</h2>
            <p className="text-sm text-stone-500 mt-1">Select the services you are qualified to perform. This will appear on your public profile.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {serviceCategories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedServiceCategory(cat!)}
                    className={`px-4 py-2 text-sm font-medium rounded-full border ${selectedServiceCategory === cat ? 'bg-saffron-600 text-white border-saffron-700' : 'bg-white text-stone-600 hover:bg-stone-50'}`}
                >
                    {cat}
                </button>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(s => {
                const isSelected = myServiceIds.has(s.id);
                const myService = myServices.find(ms => ms.service_id === s.id);
                return (
                    <div key={s.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-stone-200'}`}>
                        <h4 className="font-bold text-stone-900">{s.title}</h4>
                        <p className="text-xs text-stone-500 mt-1">{s.category}</p>
                        <div className="mt-4 flex flex-col gap-2">
                            <Button size="sm" variant={isSelected ? 'secondary' : 'primary'} onClick={() => toggleService(s.id, isSelected)}>
                                {isSelected ? <><XCircle className="h-4 w-4 mr-2" />Remove</> : <><PlusCircle className="h-4 w-4 mr-2"/>Add to my services</>}
                            </Button>
                            {isSelected && (
                                <button onClick={() => toggleOnlineService(s.id, myService!.is_online)} className={`text-xs p-2 rounded-lg flex items-center justify-center gap-2 w-full ${myService!.is_online ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>
                                    <Video className="h-4 w-4"/> Available for Online Ritual? {myService!.is_online ? <Check className="h-4 w-4" /> : ''}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};