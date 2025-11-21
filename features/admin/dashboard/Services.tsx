
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Service } from '../../../types';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useServices } from '../../../hooks/queries';

export const AdminServices: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: services = [] } = useServices();
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({ 
    title: '', description: '', base_price: 0, duration_minutes: 0, 
    image_url: '', category: '', is_featured: false, is_online_enabled: false
  });

  const serviceMutation = useMutation({
      mutationFn: async ({ id, ...data }: any) => {
          if (id) {
             const { error } = await supabase.from('services').update(data).eq('id', id);
             if (error) throw error;
          } else {
             const { error } = await supabase.from('services').insert(data);
             if (error) throw error;
          }
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['services'] });
          setIsServiceModalOpen(false);
      }
  });

  const deleteServiceMutation = useMutation({
      mutationFn: async (id: string) => {
          const { error } = await supabase.from('services').delete().eq('id', id);
          if (error) throw error;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  });

  const handleServiceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      serviceMutation.mutate({ id: editingService?.id, ...serviceForm });
  };

  const openServiceModal = (service?: Service) => {
      if (service) {
          setEditingService(service);
          setServiceForm({ 
              title: service.title, description: service.description, base_price: service.base_price, 
              duration_minutes: service.duration_minutes, image_url: service.image_url, 
              category: service.category || '', is_featured: service.is_featured || false, 
              is_online_enabled: service.is_online_enabled || false
          });
      } else {
          setEditingService(null);
          setServiceForm({ 
              title: '', description: '', base_price: 0, duration_minutes: 0, image_url: '', 
              category: '', is_featured: false, is_online_enabled: false
          });
      }
      setIsServiceModalOpen(true);
  };

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-stone-900">Service Catalog</h2>
                  <p className="text-stone-500">Manage services offered on the platform.</p>
              </div>
              <Button onClick={() => openServiceModal()} className="bg-stone-900 text-white hover:bg-stone-800"><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
          </div>
          
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-stone-50 text-stone-600 font-semibold uppercase text-xs tracking-wider">
                      <tr>
                          <th className="px-6 py-4">Service</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Price</th>
                          <th className="px-6 py-4">Features</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                      {services.map(service => (
                          <tr key={service.id} className="hover:bg-stone-50 transition-colors group">
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                      <div className="h-10 w-10 rounded bg-stone-200 overflow-hidden shrink-0">
                                          <img src={service.image_url} className="h-full w-full object-cover" />
                                      </div>
                                      <div>
                                          <p className="font-bold text-stone-900">{service.title}</p>
                                          <p className="text-xs text-stone-500">{service.duration_minutes} mins</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-stone-100 text-stone-600">{service.category}</span>
                              </td>
                              <td className="px-6 py-4 font-bold text-stone-900">
                                  Rs. {service.base_price.toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                      {service.is_featured && <span className="text-[10px] bg-saffron-100 text-saffron-700 px-1.5 py-0.5 rounded border border-saffron-200 font-bold">Featured</span>}
                                      {service.is_online_enabled && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">Online</span>}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openServiceModal(service)} className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded"><Edit className="h-4 w-4" /></button>
                                      <button onClick={() => deleteServiceMutation.mutate(service.id)} className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          {/* Service Modal */}
          {isServiceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-stone-200">
                    <div className="flex justify-between items-center p-6 border-b border-stone-100 bg-stone-50">
                        <h3 className="text-xl font-bold text-stone-900">{editingService ? 'Edit Service' : 'New Service'}</h3>
                        <button onClick={() => setIsServiceModalOpen(false)} className="p-1 rounded-full hover:bg-stone-200 transition-colors"><X className="h-5 w-5 text-stone-500" /></button>
                    </div>
                    <form onSubmit={handleServiceSubmit} className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Title</label>
                            <input className="w-full border border-stone-300 p-2.5 rounded-lg text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required placeholder="e.g. Rudri Puja" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Description</label>
                            <textarea className="w-full border border-stone-300 p-2.5 rounded-lg text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none" rows={3} value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} required placeholder="Short description of the ritual..." />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Price (Rs.)</label>
                                <input type="number" className="w-full border border-stone-300 p-2.5 rounded-lg text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none" value={serviceForm.base_price} onChange={e => setServiceForm({...serviceForm, base_price: +e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Duration (mins)</label>
                                <input type="number" className="w-full border border-stone-300 p-2.5 rounded-lg text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none" value={serviceForm.duration_minutes} onChange={e => setServiceForm({...serviceForm, duration_minutes: +e.target.value})} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Category</label>
                                <input className="w-full border border-stone-300 p-2.5 rounded-lg text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})} placeholder="e.g. Pujas" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Image URL</label>
                                <input className="w-full border border-stone-300 p-2.5 rounded-lg text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none" value={serviceForm.image_url} onChange={e => setServiceForm({...serviceForm, image_url: e.target.value})} placeholder="https://..." />
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                             <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-200">
                                 <input type="checkbox" className="w-4 h-4 text-saffron-600 rounded focus:ring-saffron-500" checked={serviceForm.is_featured} onChange={e => setServiceForm({...serviceForm, is_featured: e.target.checked})} /> 
                                 <span className="text-sm font-medium text-stone-700">Featured Service</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-200">
                                 <input type="checkbox" className="w-4 h-4 text-saffron-600 rounded focus:ring-saffron-500" checked={serviceForm.is_online_enabled} onChange={e => setServiceForm({...serviceForm, is_online_enabled: e.target.checked})} /> 
                                 <span className="text-sm font-medium text-stone-700">Online Available</span>
                             </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                            <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-stone-900 text-white hover:bg-stone-800">Save Changes</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
  );
};
