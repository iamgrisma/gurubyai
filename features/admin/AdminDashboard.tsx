// features/admin/AdminDashboard.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Service, Gotra, UserProfile, Guruba, Transaction } from '../../types';
import { useServices } from '../../hooks/queries';
import { 
    Users, BookOpen, Settings, Activity, RefreshCw, AlertCircle, Search, Key, Mail, CheckCircle,
    LayoutDashboard, Layers, DollarSign, X, Plus, Edit, Trash, Star, ScrollText, Check,
    Briefcase, Calendar, UserPlus, Menu, CreditCard, PlusCircle
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${
        active ? 'bg-stone-800 text-white' : 'text-stone-400 hover:bg-stone-800 hover:text-white'
      }`}
    >
      <Icon className={`h-5 w-5`} />
      {label}
    </button>
);

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'concierge' | 'users' | 'services' | 'gotras' | 'financials'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- Queries ---

  const { data: stats = { users: 0, gurubas: 0, bookings: 0, revenue: 0 }, isLoading: statsLoading } = useQuery({
      queryKey: ['adminStats'],
      queryFn: async () => {
        const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: gCount } = await supabase.from('gurubas').select('*', { count: 'exact', head: true });
        const { count: bCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
        
        // Revenue is sum of platform_fee from bookings (using the new field)
        const { data: feeData } = await supabase.from('bookings').select('platform_fee').eq('status', 'completed');
        const revenue = feeData?.reduce((acc, curr) => acc + (curr.platform_fee || 0), 0) || 0;
        
        return { users: uCount || 0, gurubas: gCount || 0, bookings: bCount || 0, revenue };
      }
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
      queryKey: ['adminUsers'],
      queryFn: async () => {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
        const { data: gurubas } = await supabase.from('gurubas').select('user_id, is_verified');
        
        // Join guruba status manually
        return profiles?.map(p => ({
            ...p,
            gurubas: gurubas?.filter(g => g.user_id === p.id) || []
        })) || [];
      }
  });

  const { data: services = [] } = useServices();

  const { data: gotras = [] } = useQuery({
      queryKey: ['adminGotras'],
      queryFn: async () => {
          const { data } = await supabase.from('gotras').select('*').order('name');
          return data as Gotra[];
      }
  });

  const { data: transactions = [] } = useQuery({
      queryKey: ['adminTransactions'],
      queryFn: async () => {
          const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
          return data as Transaction[];
      }
  });

  // --- Mutations ---

  const verifyGurubaMutation = useMutation({
      mutationFn: async (gurubaId: string) => {
          const { error } = await supabase.from('gurubas').update({ is_verified: true }).eq('user_id', gurubaId);
          if (error) throw error;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
  });

  const addCreditsMutation = useMutation({
      mutationFn: async ({ userId, amount }: { userId: string, amount: number }) => {
          // Get current credits first (could also use RPC increment if strict)
          const { data: current } = await supabase.from('profiles').select('credits').eq('id', userId).single();
          const newBalance = (current?.credits || 0) + amount;
          
          const { error } = await supabase.from('profiles').update({ credits: newBalance }).eq('id', userId);
          if (error) throw error;
          
          // Log transaction
          await supabase.from('transactions').insert({
              user_id: userId,
              amount: amount,
              type: 'credit',
              description: 'Admin Top-up',
              status: 'completed'
          });
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
          queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
          alert("Credits added successfully.");
      }
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

  const gotraMutation = useMutation({
      mutationFn: async ({ id, action, name }: { id?: string, action: 'approve' | 'reject' | 'add', name?: string }) => {
          if (action === 'add' && name) {
              await supabase.from('gotras').insert({ name, status: 'approved' });
          } else if (action === 'approve' && id) {
              await supabase.from('gotras').update({ status: 'approved' }).eq('id', id);
          } else if (action === 'reject' && id) {
              await supabase.from('gotras').delete().eq('id', id);
          }
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminGotras'] });
          setNewGotraName('');
      }
  });

  // Service Form State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({ 
    title: '', description: '', base_price: 0, duration_minutes: 0, 
    image_url: '', category: '', is_featured: false, is_online_enabled: false
  });

  // Gotra Form State
  const [newGotraName, setNewGotraName] = useState('');

  // Concierge Booking State
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

  // --- Handlers ---

  const handleVerifyGuruba = (gurubaId: string) => verifyGurubaMutation.mutate(gurubaId);
  
  const handleAddCredits = (userId: string) => {
      const amount = prompt("Enter amount of credits to add:");
      if (amount && !isNaN(Number(amount))) {
          addCreditsMutation.mutate({ userId, amount: Number(amount) });
      }
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      serviceMutation.mutate({ id: editingService?.id, ...serviceForm });
  };

  const handleDeleteService = (id: string) => {
      if (confirm("Are you sure?")) deleteServiceMutation.mutate(id);
  };

  const handleAddGotra = (e: React.FormEvent) => {
      e.preventDefault();
      if (newGotraName.trim()) gotraMutation.mutate({ action: 'add', name: newGotraName.trim() });
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

  // Concierge Helpers
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

      // Simple slot generation (simplified for admin override)
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
          // Admin booking bypasses payment
          const scheduledAt = new Date(`${bookingDate}T${bookingTime}`).toISOString();
          await supabase.from('bookings').insert({
              user_id: selectedClient.id,
              guruba_id: selectedGuruba.id,
              service_id: selectedService.id,
              scheduled_at: scheduledAt,
              status: 'confirmed', // Auto-confirm
              platform_fee: 0 // No fee for concierge
          });
          alert("Booking Created!");
          setBookingStep(1); setSelectedClient(null); setSelectedService(null); setSelectedGuruba(null);
          queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      } catch(e) { alert("Failed to book."); }
  };

  const handleTabChange = (tab: typeof activeTab) => {
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
  };

  if (statsLoading || usersLoading) return <div className="flex h-screen items-center justify-center"><RefreshCw className="animate-spin h-8 w-8 text-stone-400"/></div>;

  const renderContent = () => {
      switch(activeTab) {
          case 'overview':
              return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium">Total Revenue (Credits)</h3>
                              <div className="text-3xl font-bold text-stone-900">{stats.revenue.toLocaleString()}</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium">Total Users</h3>
                              <div className="text-3xl font-bold text-stone-900">{stats.users}</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium">Active Gurubas</h3>
                              <div className="text-3xl font-bold text-stone-900">{stats.gurubas}</div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium">Bookings</h3>
                              <div className="text-3xl font-bold text-stone-900">{stats.bookings}</div>
                          </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                          <h3 className="font-bold text-stone-900 mb-4">System Health</h3>
                          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-100">
                              <Activity className="h-5 w-5" />
                              <span className="font-medium">All Systems Operational</span>
                          </div>
                      </div>
                  </div>
              );

          case 'concierge':
              return (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8 animate-in fade-in duration-300">
                      <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                          <UserPlus className="h-6 w-6 text-saffron-600" /> Concierge Booking
                      </h2>
                      {/* Simplified Wizard UI */}
                      <div className="flex items-center mb-8 space-x-2">
                          {[1, 2, 3, 4].map(step => (
                              <div key={step} className={`h-2 flex-1 rounded-full transition-colors ${step <= bookingStep ? 'bg-saffron-500' : 'bg-stone-200'}`} />
                          ))}
                      </div>

                      {bookingStep === 1 && (
                          <div className="space-y-4 max-w-xl">
                              <h3 className="text-lg font-semibold">Step 1: Select Client</h3>
                              <div className="relative">
                                  <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                                  <input className="w-full pl-10 p-3 border rounded-lg" placeholder="Search by email..." value={clientSearch} onChange={e => searchClients(e.target.value)} />
                              </div>
                              {filteredClients.map(c => (
                                  <div key={c.id} onClick={() => { setSelectedClient(c); setBookingStep(2); }} className="p-3 border rounded-lg hover:bg-stone-50 cursor-pointer flex justify-between">
                                      <span>{c.email}</span><span className="text-stone-500 text-sm">{c.full_name}</span>
                                  </div>
                              ))}
                          </div>
                      )}

                      {bookingStep === 2 && (
                          <div className="space-y-4">
                              <h3 className="text-lg font-semibold">Step 2: Select Service</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {services.map(s => (
                                      <div key={s.id} onClick={() => { setSelectedService(s); setBookingStep(3); fetchAvailableGurubas(); }} className="p-4 border rounded-lg hover:border-saffron-500 cursor-pointer">
                                          <p className="font-bold">{s.title}</p>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {bookingStep === 3 && (
                          <div className="space-y-4">
                              <h3 className="text-lg font-semibold">Step 3: Select Guruba</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {filteredGurubas.map(g => (
                                      <div key={g.id} onClick={() => { setSelectedGuruba(g); setBookingStep(4); }} className="p-4 border rounded-lg hover:border-saffron-500 cursor-pointer flex gap-4">
                                          <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center font-bold">{g.profiles?.full_name?.[0]}</div>
                                          <div><p className="font-bold">{g.profiles?.full_name}</p><p className="text-xs text-stone-500">{g.location}</p></div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {bookingStep === 4 && (
                          <div className="space-y-6 max-w-xl">
                              <h3 className="text-lg font-semibold">Step 4: Schedule</h3>
                              <div className="flex gap-4">
                                  <input type="date" className="border p-2 rounded flex-1" value={bookingDate} onChange={e => setBookingDate(e.target.value)} onBlur={checkAvailability} />
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                  {availableSlots.map(slot => (
                                      <button key={slot} onClick={() => setBookingTime(slot)} className={`p-2 text-sm border rounded ${bookingTime === slot ? 'bg-saffron-600 text-white' : 'hover:bg-stone-50'}`}>{slot}</button>
                                  ))}
                              </div>
                              <Button onClick={handleConciergeBooking} disabled={!bookingTime} className="w-full">Confirm Booking</Button>
                          </div>
                      )}
                  </div>
              );

          case 'users':
              return (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                      <div className="p-4 border-b border-stone-200 flex justify-between items-center">
                          <h3 className="font-bold text-stone-900">User Management</h3>
                      </div>
                      <table className="w-full text-sm text-left">
                          <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                              <tr>
                                  <th className="px-6 py-3">User</th>
                                  <th className="px-6 py-3">Role</th>
                                  <th className="px-6 py-3">Credits</th>
                                  <th className="px-6 py-3">Status</th>
                                  <th className="px-6 py-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {users.map((u: any) => (
                                  <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50">
                                      <td className="px-6 py-4">
                                          <p className="font-medium text-stone-900">{u.full_name}</p>
                                          <p className="text-xs text-stone-500">{u.email}</p>
                                      </td>
                                      <td className="px-6 py-4"><span className="uppercase text-xs font-bold bg-gray-100 px-2 py-1 rounded">{u.role}</span></td>
                                      <td className="px-6 py-4 font-mono font-bold text-green-700">{u.credits}</td>
                                      <td className="px-6 py-4">
                                          {u.role === 'guruba' && (
                                              u.gurubas?.[0]?.is_verified 
                                              ? <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Verified</span>
                                              : <button onClick={() => handleVerifyGuruba(u.id)} className="text-blue-600 hover:underline text-xs bg-blue-50 px-2 py-1 rounded">Verify Now</button>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                              <Button size="sm" variant="outline" onClick={() => handleAddCredits(u.id)} title="Add Credits">
                                                  <PlusCircle className="h-4 w-4" />
                                              </Button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              );

          case 'services':
              return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-stone-900">Service Catalog</h2>
                          <Button onClick={() => openServiceModal()}><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {services.map(service => (
                              <div key={service.id} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden group relative">
                                  <div className="h-32 bg-stone-200 relative">
                                      <img src={service.image_url} className="h-full w-full object-cover" />
                                      {service.is_featured && <div className="absolute top-2 right-2 bg-saffron-500 text-white text-xs px-2 py-1 rounded font-bold">Featured</div>}
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <button onClick={() => openServiceModal(service)} className="p-2 bg-white rounded-full hover:scale-110"><Edit className="h-4 w-4" /></button>
                                          <button onClick={() => handleDeleteService(service.id)} className="p-2 bg-white rounded-full text-red-600 hover:scale-110"><Trash className="h-4 w-4" /></button>
                                      </div>
                                  </div>
                                  <div className="p-4">
                                      <h3 className="font-bold text-stone-900 line-clamp-1">{service.title}</h3>
                                      <div className="flex justify-between mt-2 text-sm">
                                          <span className="text-stone-500">{service.duration_minutes} mins</span>
                                          <span className="font-bold text-saffron-600">Rs. {service.base_price}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          
          case 'gotras':
              return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-stone-900">Gotra Management</h2>
                          <form onSubmit={handleAddGotra} className="flex gap-2">
                              <input placeholder="Add new Gotra..." className="border rounded-md px-3 py-1.5 text-sm" value={newGotraName} onChange={e => setNewGotraName(e.target.value)} />
                              <Button size="sm" type="submit">Add</Button>
                          </form>
                      </div>
                      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-stone-50 text-stone-500 uppercase text-xs"><tr><th className="px-6 py-3">Gotra Name</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                              <tbody>
                                  {gotras.map(g => (
                                      <tr key={g.id} className="hover:bg-stone-50">
                                          <td className="px-6 py-4 font-medium">{g.name}</td>
                                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${g.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{g.status}</span></td>
                                          <td className="px-6 py-4 text-right">
                                              {g.status === 'pending' ? (
                                                  <div className="flex justify-end gap-2">
                                                      <button onClick={() => gotraMutation.mutate({id: g.id, action: 'approve'})} className="p-1 text-green-600"><Check className="h-4 w-4"/></button>
                                                      <button onClick={() => gotraMutation.mutate({id: g.id, action: 'reject'})} className="p-1 text-red-600"><X className="h-4 w-4"/></button>
                                                  </div>
                                              ) : <button onClick={() => gotraMutation.mutate({id: g.id, action: 'reject'})} className="text-stone-400 hover:text-red-600"><Trash className="h-4 w-4"/></button>}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              );

          case 'financials':
              return (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-in fade-in duration-300">
                      <h3 className="text-lg font-bold text-stone-900 mb-4">Recent Transactions</h3>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                                  <tr>
                                      <th className="px-6 py-3">Date</th>
                                      <th className="px-6 py-3">User</th>
                                      <th className="px-6 py-3">Description</th>
                                      <th className="px-6 py-3 text-right">Amount</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {transactions.map(t => (
                                      <tr key={t.id} className="border-b border-stone-100">
                                          <td className="px-6 py-4">{new Date(t.created_at).toLocaleDateString()}</td>
                                          <td className="px-6 py-4 text-xs text-stone-400">{t.user_id}</td>
                                          <td className="px-6 py-4">{t.description}</td>
                                          <td className={`px-6 py-4 text-right font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                              {t.type === 'credit' ? '+' : '-'}{t.amount}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex font-sans">
        <div className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}/>
        <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-stone-900 text-stone-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
            <div className="p-6 flex justify-between items-center"><div className="flex items-center gap-2 text-white font-bold text-xl"><div className="h-8 w-8 bg-saffron-600 rounded flex items-center justify-center">A</div>Admin</div><button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-stone-400 hover:text-white"><X className="h-6 w-6" /></button></div>
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} />
                <SidebarItem icon={UserPlus} label="Concierge Booking" active={activeTab === 'concierge'} onClick={() => handleTabChange('concierge')} />
                <SidebarItem icon={Users} label="Users & Credits" active={activeTab === 'users'} onClick={() => handleTabChange('users')} />
                <SidebarItem icon={Layers} label="Services" active={activeTab === 'services'} onClick={() => handleTabChange('services')} />
                <SidebarItem icon={ScrollText} label="Gotras" active={activeTab === 'gotras'} onClick={() => handleTabChange('gotras')} />
                <SidebarItem icon={DollarSign} label="Financials" active={activeTab === 'financials'} onClick={() => handleTabChange('financials')} />
            </nav>
        </aside>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto h-[calc(100vh-4rem)]">
            <div className="lg:hidden mb-6 flex items-center gap-4"><button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-stone-200 text-stone-600"><Menu className="h-6 w-6" /></button><span className="font-bold text-stone-900 text-lg">Admin Panel</span></div>
            {renderContent()}
        </main>
        {/* Service Modal Omitted for Brevity - Logic handled above */}
        {isServiceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">{editingService ? 'Edit Service' : 'New Service'}</h3><button onClick={() => setIsServiceModalOpen(false)}><X className="h-5 w-5 text-stone-400" /></button></div>
                    <form onSubmit={handleServiceSubmit} className="space-y-4">
                        {/* Form fields mapped to serviceForm state */}
                        <input placeholder="Title" className="w-full border p-2 rounded" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                        <textarea placeholder="Description" className="w-full border p-2 rounded" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" placeholder="Price" className="w-full border p-2 rounded" value={serviceForm.base_price} onChange={e => setServiceForm({...serviceForm, base_price: +e.target.value})} required />
                            <input type="number" placeholder="Duration (min)" className="w-full border p-2 rounded" value={serviceForm.duration_minutes} onChange={e => setServiceForm({...serviceForm, duration_minutes: +e.target.value})} required />
                        </div>
                        <input placeholder="Image URL" className="w-full border p-2 rounded" value={serviceForm.image_url} onChange={e => setServiceForm({...serviceForm, image_url: e.target.value})} />
                        <input placeholder="Category" className="w-full border p-2 rounded" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})} />
                        <div className="flex items-center gap-4 mt-2">
                             <label className="flex items-center gap-2"><input type="checkbox" checked={serviceForm.is_featured} onChange={e => setServiceForm({...serviceForm, is_featured: e.target.checked})} /> Featured</label>
                             <label className="flex items-center gap-2"><input type="checkbox" checked={serviceForm.is_online_enabled} onChange={e => setServiceForm({...serviceForm, is_online_enabled: e.target.checked})} /> Online</label>
                        </div>
                        <div className="flex justify-end gap-2 mt-4"><Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button><Button type="submit">Save</Button></div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};