"use client";


import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { UserProfile, Service, Guruba } from '../../../types';
import { Search, ArrowRight, MapPin } from 'lucide-react';
import { useServices } from '../../../hooks/queries';

export const AdminConcierge: React.FC = () => {
  const queryClient = useQueryClient();
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedGuruba, setSelectedGuruba] = useState<Guruba | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [filteredClients, setFilteredClients] = useState<UserProfile[]>([]);
  const [filteredGurubas, setFilteredGurubas] = useState<Guruba[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const { data: services = [] } = useServices();

  const searchClients = async (term: string) => {
      setClientSearch(term);
      if(term.length < 2) return;
      const { data } = await supabase.from('profiles').select('*').eq('role', 'client').ilike('email', `%${term}%`).limit(5);
      setFilteredClients(data as UserProfile[] || []);
  };

  const fetchAvailableGurubas = async () => {
      if(!selectedService) return;
      const { data } = await supabase.from('gurubas').select('*, profiles:user_id(full_name, gotra_id)');
      const filtered = data?.filter((g: any) => 
          !g.specialties?.length || g.specialties.includes(selectedService.title)
      ) as Guruba[];
      setFilteredGurubas(filtered || []);
  };

  const checkAvailability = async () => {
      if(!selectedGuruba || !bookingDate) return;
      const dayOfWeek = new Date(bookingDate).getDay();
      const { data: schedule } = await supabase.from('guruba_availability').select('*').eq('guruba_id', selectedGuruba.id).eq('day_of_week', dayOfWeek).single();
      
      if(!schedule) { setAvailableSlots([]); return; }
      const slots = [];
      let h = parseInt(schedule.start_time.split(':')[0]);
      const endH = parseInt(schedule.end_time.split(':')[0]);
      for(let i=h; i<endH; i++) {
          slots.push(`${i.toString().padStart(2,'0')}:00`);
          slots.push(`${i.toString().padStart(2,'0')}:30`);
      }
      setAvailableSlots(slots);
  };

  const handleConciergeBooking = async () => {
      if(!selectedClient || !selectedService || !selectedGuruba || !bookingDate || !bookingTime) return;
      try {
          const scheduledAt = new Date(`${bookingDate}T${bookingTime}`).toISOString();
          await supabase.from('bookings').insert({
              user_id: selectedClient.id,
              guruba_id: selectedGuruba.id,
              service_id: selectedService.id,
              scheduled_at: scheduledAt,
              status: 'confirmed', 
              platform_fee: 0 
          });
          alert("Booking Created!");
          setBookingStep(1); setSelectedClient(null); setSelectedService(null); setSelectedGuruba(null);
          queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      } catch(e) { alert("Failed to book."); }
  };

  return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
          <div>
              <h2 className="text-2xl font-bold text-stone-900">Concierge Booking</h2>
              <p className="text-stone-500">Manually create bookings for clients.</p>
          </div>
          
          <div className="bg-white rounded-xl border border-stone-200 shadow-lg overflow-hidden">
              {/* Stepper Header */}
              <div className="bg-stone-50 border-b border-stone-200 p-6">
                  <div className="flex items-center justify-between relative">
                      <div className="absolute left-0 top-1/2 w-full h-0.5 bg-stone-200 -z-10"></div>
                      {[1, 2, 3, 4].map(step => (
                          <div key={step} className={`flex flex-col items-center gap-2 bg-stone-50 px-2`}>
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                                  step <= bookingStep ? 'bg-saffron-600 text-white' : 'bg-stone-200 text-stone-500'
                              }`}>
                                  {step}
                              </div>
                              <span className={`text-xs font-bold ${step <= bookingStep ? 'text-saffron-700' : 'text-stone-400'}`}>
                                  {step === 1 ? 'Client' : step === 2 ? 'Service' : step === 3 ? 'Guruba' : 'Confirm'}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="p-8 min-h-[400px]">
                  {bookingStep === 1 && (
                      <div className="space-y-4 max-w-lg mx-auto">
                          <h3 className="text-xl font-bold text-stone-900 text-center mb-6">Select Client</h3>
                          <div className="relative">
                              <Search className="absolute left-3 top-3.5 h-5 w-5 text-stone-400" />
                              <input 
                                  className="w-full pl-10 p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none text-stone-900" 
                                  placeholder="Search client email..." 
                                  value={clientSearch} 
                                  onChange={e => searchClients(e.target.value)} 
                                  autoFocus
                              />
                          </div>
                          <div className="space-y-2 mt-4">
                              {filteredClients.map(c => (
                                  <div key={c.id} onClick={() => { setSelectedClient(c); setBookingStep(2); }} className="p-4 border border-stone-200 rounded-xl hover:border-saffron-500 hover:bg-saffron-50 cursor-pointer flex justify-between items-center transition-all group">
                                      <div>
                                          <p className="font-bold text-stone-900 group-hover:text-saffron-800">{c.full_name}</p>
                                          <p className="text-sm text-stone-500">{c.email}</p>
                                      </div>
                                      <ArrowRight className="h-5 w-5 text-stone-300 group-hover:text-saffron-500" />
                                  </div>
                              ))}
                              {clientSearch && filteredClients.length === 0 && <p className="text-center text-stone-500 text-sm mt-4">No clients found.</p>}
                          </div>
                      </div>
                  )}

                  {bookingStep === 2 && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between mb-6">
                              <h3 className="text-xl font-bold text-stone-900">Select Service</h3>
                              <Button variant="ghost" size="sm" onClick={() => setBookingStep(1)}>Back</Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {services.map(s => (
                                  <div key={s.id} onClick={() => { setSelectedService(s); setBookingStep(3); fetchAvailableGurubas(); }} className="p-4 border border-stone-200 rounded-xl hover:border-saffron-500 hover:shadow-md cursor-pointer transition-all">
                                      <p className="font-bold text-stone-900 text-lg">{s.title}</p>
                                      <p className="text-sm text-stone-500 mt-1 flex justify-between">
                                          <span>{s.category}</span>
                                          <span className="font-semibold text-saffron-600">Rs. {s.base_price}</span>
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {bookingStep === 3 && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between mb-6">
                              <h3 className="text-xl font-bold text-stone-900">Assign Guruba</h3>
                              <Button variant="ghost" size="sm" onClick={() => setBookingStep(2)}>Back</Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {filteredGurubas.map(g => (
                                  <div key={g.id} onClick={() => { setSelectedGuruba(g); setBookingStep(4); }} className="p-4 border border-stone-200 rounded-xl hover:border-saffron-500 hover:bg-saffron-50 cursor-pointer flex items-center gap-4 transition-all">
                                      <div className="h-12 w-12 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-600 text-lg shrink-0">
                                          {g.profiles?.full_name?.[0]}
                                      </div>
                                      <div>
                                          <p className="font-bold text-stone-900">{g.profiles?.full_name}</p>
                                          <p className="text-xs text-stone-500 flex items-center gap-1">
                                              <MapPin className="h-3 w-3" /> {g.location}
                                          </p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {bookingStep === 4 && (
                      <div className="space-y-6 max-w-md mx-auto">
                          <div className="text-center">
                              <h3 className="text-xl font-bold text-stone-900 mb-2">Finalize Booking</h3>
                              <p className="text-stone-500 text-sm">Set the date and time for the ritual.</p>
                          </div>
                          
                          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2 text-sm">
                              <div className="flex justify-between">
                                  <span className="text-stone-500">Client:</span>
                                  <span className="font-bold text-stone-900">{selectedClient?.full_name}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-stone-500">Service:</span>
                                  <span className="font-bold text-stone-900">{selectedService?.title}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-stone-500">Guruba:</span>
                                  <span className="font-bold text-stone-900">{selectedGuruba?.profiles?.full_name}</span>
                              </div>
                          </div>

                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date</label>
                                  <input type="date" className="w-full border border-stone-300 rounded-lg p-2.5 text-stone-900 focus:ring-2 focus:ring-saffron-500" value={bookingDate} onChange={e => setBookingDate(e.target.value)} onBlur={checkAvailability} />
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Time Slot</label>
                                  <div className="grid grid-cols-3 gap-2">
                                      {availableSlots.length > 0 ? availableSlots.map(slot => (
                                          <button key={slot} onClick={() => setBookingTime(slot)} className={`p-2 text-sm border rounded-lg transition-all ${bookingTime === slot ? 'bg-saffron-600 text-white border-saffron-600' : 'bg-white text-stone-900 border-stone-300 hover:border-saffron-400'}`}>
                                              {slot}
                                          </button>
                                      )) : <div className="col-span-3 text-center text-xs text-stone-400 py-2 border border-dashed rounded-lg">Select a date to see slots</div>}
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-3 pt-4">
                              <Button variant="outline" onClick={() => setBookingStep(3)} className="flex-1">Back</Button>
                              <Button onClick={handleConciergeBooking} disabled={!bookingTime} className="flex-1">Confirm Booking</Button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};
