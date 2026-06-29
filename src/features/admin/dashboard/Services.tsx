"use client";

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Service } from '../../../types';
import { Plus, Edit, Trash2, X, Clock, IndianRupee, Star, Globe } from 'lucide-react';
import { useServices } from '../../../hooks/queries';

export const AdminServices: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: services = [], isLoading } = useServices();
  
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-stone-900">Service Catalog</h2>
                  <p className="text-stone-500">Manage services offered on the platform.</p>
              </div>
              <Button onClick={() => openServiceModal()} className="bg-stone-900 text-white hover:bg-stone-800 rounded-xl px-6 w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {isLoading ? (
                  Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-64 bg-white border border-stone-100 rounded-3xl animate-pulse"></div>
                  ))
              ) : services.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-stone-500 bg-white/50 rounded-3xl border border-stone-200/50 backdrop-blur-sm">No services found. Click "Add Service" to create one.</div>
              ) : (
                  services.map(service => (
                      <div key={service.id} className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col group">
                          <div className="h-40 w-full bg-stone-100 relative overflow-hidden">
                              {service.image_url ? (
                                  <img src={service.image_url} alt={service.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-100">
                                      <Globe className="h-12 w-12" />
                                  </div>
                              )}
                              
                              <div className="absolute top-4 left-4 flex gap-2">
                                  {service.is_featured && <span className="text-[10px] bg-saffron-500 text-white px-2 py-1 rounded-full font-bold shadow-md flex items-center gap-1"><Star className="h-3 w-3" /> Featured</span>}
                                  {service.is_online_enabled && <span className="text-[10px] bg-blue-500 text-white px-2 py-1 rounded-full font-bold shadow-md flex items-center gap-1"><Globe className="h-3 w-3" /> Online</span>}
                              </div>
                              <div className="absolute top-4 right-4">
                                  <span className="text-[10px] bg-white/90 backdrop-blur text-stone-700 px-2 py-1 rounded-full font-black uppercase shadow-sm">
                                      {service.category}
                                  </span>
                              </div>
                              
                              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                  <h3 className="font-bold text-white text-lg">{service.title}</h3>
                              </div>
                          </div>
                          
                          <div className="p-5 flex-1 flex flex-col">
                              <p className="text-sm text-stone-500 line-clamp-2 mb-4 flex-1">
                                  {service.description || "No description provided."}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-4 mb-6 p-3 bg-stone-50 rounded-2xl">
                                  <div className="flex flex-col">
                                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Price</span>
                                      <span className="font-bold text-stone-900 flex items-center"><IndianRupee className="h-3 w-3 mr-0.5" /> {(service.base_price || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex flex-col border-l border-stone-200 pl-4">
                                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Duration</span>
                                      <span className="font-bold text-stone-900 flex items-center"><Clock className="h-3 w-3 mr-1 text-stone-400" /> {service.duration_minutes}m</span>
                                  </div>
                              </div>
                              
                              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
                                  <button onClick={() => openServiceModal(service)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"><Edit className="h-4 w-4" /> Edit</button>
                                  <button onClick={() => deleteServiceMutation.mutate(service.id)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /> Delete</button>
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>

          {/* Service Modal */}
          {isServiceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 border border-stone-200/50">
                    <div className="flex justify-between items-center p-6 border-b border-stone-100">
                        <h3 className="text-xl font-bold text-stone-900">{editingService ? 'Edit Service' : 'New Service'}</h3>
                        <button onClick={() => setIsServiceModalOpen(false)} className="p-2 rounded-full hover:bg-stone-100 transition-colors bg-stone-50"><X className="h-5 w-5 text-stone-500" /></button>
                    </div>
                    <form onSubmit={handleServiceSubmit} className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Title</label>
                            <input className="w-full border border-stone-200 p-3 rounded-xl text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none bg-stone-50/50 transition-all" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required placeholder="e.g. Rudri Puja" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Description</label>
                            <textarea className="w-full border border-stone-200 p-3 rounded-xl text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none bg-stone-50/50 transition-all resize-none" rows={3} value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} required placeholder="Short description of the ritual..." />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Price (Rs.)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                                    <input type="number" className="w-full border border-stone-200 p-3 pl-9 rounded-xl text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none bg-stone-50/50 transition-all" value={serviceForm.base_price} onChange={e => setServiceForm({...serviceForm, base_price: +e.target.value})} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Duration (mins)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                                    <input type="number" className="w-full border border-stone-200 p-3 pl-9 rounded-xl text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none bg-stone-50/50 transition-all" value={serviceForm.duration_minutes} onChange={e => setServiceForm({...serviceForm, duration_minutes: +e.target.value})} required />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Category</label>
                                <input className="w-full border border-stone-200 p-3 rounded-xl text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none bg-stone-50/50 transition-all" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})} placeholder="e.g. Pujas" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Image URL</label>
                                <input className="w-full border border-stone-200 p-3 rounded-xl text-stone-900 focus:ring-2 focus:ring-saffron-500 outline-none bg-stone-50/50 transition-all" value={serviceForm.image_url} onChange={e => setServiceForm({...serviceForm, image_url: e.target.value})} placeholder="https://..." />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                             <label className="flex items-center gap-3 cursor-pointer p-3 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200 w-full sm:w-auto flex-1">
                                 <input type="checkbox" className="w-5 h-5 text-saffron-500 rounded border-stone-300 focus:ring-saffron-500" checked={serviceForm.is_featured} onChange={e => setServiceForm({...serviceForm, is_featured: e.target.checked})} /> 
                                 <div className="flex flex-col">
                                     <span className="text-sm font-bold text-stone-900">Featured</span>
                                     <span className="text-xs text-stone-500">Show on homepage</span>
                                 </div>
                             </label>
                             <label className="flex items-center gap-3 cursor-pointer p-3 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200 w-full sm:w-auto flex-1">
                                 <input type="checkbox" className="w-5 h-5 text-blue-500 rounded border-stone-300 focus:ring-blue-500" checked={serviceForm.is_online_enabled} onChange={e => setServiceForm({...serviceForm, is_online_enabled: e.target.checked})} /> 
                                 <div className="flex flex-col">
                                     <span className="text-sm font-bold text-stone-900">Online</span>
                                     <span className="text-xs text-stone-500">Available remotely</span>
                                 </div>
                             </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-stone-100 mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                            <Button type="submit" className="bg-stone-900 text-white hover:bg-stone-800 rounded-xl font-bold px-8">Save Changes</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
  );
};
