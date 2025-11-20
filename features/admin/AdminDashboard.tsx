
import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Service, Gotra, UserProfile, Guruba } from '../../types';
import { 
    Users, BookOpen, Settings, Activity, RefreshCw, AlertCircle, Search, Key, Mail, CheckCircle,
    LayoutDashboard, Layers, DollarSign, X, Plus, Edit, Trash, Star, ScrollText, Check, XCircle,
    Briefcase, Calendar, Clock, UserPlus, Menu
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
  const [activeTab, setActiveTab] = useState<'overview' | 'concierge' | 'users' | 'services' | 'gotras' | 'financials'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data State
  const [stats, setStats] = useState({ users: 0, gurubas: 0, bookings: 0, revenue: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [gotras, setGotras] = useState<Gotra[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Service Form State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({ 
    title: '', 
    description: '', 
    base_price: 0, 
    duration_minutes: 0, 
    image_url: '',
    category: '',
    is_featured: false,
    is_online_enabled: false
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
  const [gotraConflict, setGotraConflict] = useState(false);
  const [forceBook, setForceBook] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        // Stats
        const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: gCount } = await supabase.from('gurubas').select('*', { count: 'exact', head: true });
        const { count: bCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
        
        // Simple Mock Revenue Calc
        const { data: allBookings } = await supabase.from('bookings').select('services(base_price)').eq('status', 'completed');
        const revenue = allBookings?.reduce((acc, curr: any) => acc + (curr.services?.base_price || 0), 0) || 0;

        setStats({ users: uCount || 0, gurubas: gCount || 0, bookings: bCount || 0, revenue });

        // Users
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
        const { data: gurubas } = await supabase.from('gurubas').select('user_id, is_verified');
        
        const mergedUsers = profiles?.map(p => ({
            ...p,
            gurubas: gurubas?.filter(g => g.user_id === p.id) || []
        }));
        
        setUsers(mergedUsers || []);

        // Services
        const { data: serviceData } = await supabase.from('services').select('*').order('title');
        setServices(serviceData || []);

        // Gotras
        const { data: gotraData } = await supabase.from('gotras').select('*').order('name');
        setGotras(gotraData || []);

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyGuruba = async (gurubaId: string, status: boolean) => {
      try {
          const { error } = await supabase
            .from('gurubas')
            .update({ is_verified: status })
            .eq('user_id', gurubaId);
          
          if (error) throw error;
          fetchData();
      } catch (e) {
          alert("Failed to update verification status");
      }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const payload = {
              title: serviceForm.title,
              description: serviceForm.description,
              base_price: serviceForm.base_price || 0, // Safety check
              duration_minutes: serviceForm.duration_minutes || 0, // Safety check
              image_url: serviceForm.image_url,
              category: serviceForm.category,
              is_featured: serviceForm.is_featured,
              is_online_enabled: serviceForm.is_online_enabled
          };

          let error;
          if (editingService) {
              const res = await supabase.from('services').update(payload).eq('id', editingService.id);
              error = res.error;
          } else {
              const res = await supabase.from('services').insert(payload);
              error = res.error;
          }

          if (error) throw error;

          setIsServiceModalOpen(false);
          setEditingService(null);
          fetchData();
      } catch (e: any) {
          alert("Failed to save service: " + e.message);
      }
  };

  const handleDeleteService = async (id: string) => {
      if (!confirm("Are you sure?")) return;
      try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (e: any) {
        alert("Failed to delete service: " + e.message);
      }
  };

  const openServiceModal = (service?: Service) => {
      if (service) {
          setEditingService(service);
          setServiceForm({ 
              title: service.title, 
              description: service.description, 
              base_price: service.base_price, 
              duration_minutes: service.duration_minutes,
              image_url: service.image_url,
              category: service.category || '',
              is_featured: service.is_featured || false,
              is_online_enabled: service.is_online_enabled || false
          });
      } else {
          setEditingService(null);
          setServiceForm({ 
              title: '', 
              description: '', 
              base_price: 0, 
              duration_minutes: 0, 
              image_url: '', 
              category: '',
              is_featured: false,
              is_online_enabled: false
          });
      }
      setIsServiceModalOpen(true);
  };

  // --- Concierge Booking Logic ---
  const searchClients = async (term: string) => {
      setClientSearch(term);
      if(term.length < 2) return;
      const { data } = await supabase.from('profiles').select('*').eq('role', 'client').ilike('email', `%${term}%`).limit(5);
      setFilteredClients(data as UserProfile[] || []);
  };

  const fetchAvailableGurubas = async () => {
      if(!selectedService) return;
      // Fetch gurubas who have this service in guruba_services or legacy specialties
      // For robustness, we fetch all and filter in JS for this complex logic or use smart query
      // Let's stick to legacy string match for now to avoid huge refactor, or check both.
      const { data } = await supabase.from('gurubas').select('*, profiles:user_id(full_name, gotra_id)');
      
      // Filter: does guruba have service in specialties array?
      // (This works because our Trigger keeps specialties updated)
      const filtered = data?.filter((g: any) => g.specialties?.includes(selectedService.title)) as Guruba[];
      setFilteredGurubas(filtered || []);
  };

  const checkAvailability = async () => {
      if(!selectedGuruba || !bookingDate || !selectedService) return;
      
      const dayOfWeek = new Date(bookingDate).getDay();
      
      // 1. Get Schedule
      const { data: schedule } = await supabase.from('guruba_availability').select('*').eq('guruba_id', selectedGuruba.id).eq('day_of_week', dayOfWeek).single();
      if(!schedule) { setAvailableSlots([]); return; }

      // 2. Get Bookings
      const startOfDay = new Date(bookingDate); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(bookingDate); endOfDay.setHours(23,59,59,999);
      
      const { data: existing } = await supabase.from('bookings').select('scheduled_at, services(duration_minutes)').eq('guruba_id', selectedGuruba.id).gte('scheduled_at', startOfDay.toISOString()).lte('scheduled_at', endOfDay.toISOString()).neq('status', 'cancelled');
      
      // 3. Calculate Slots
      const toMins = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
      const start = toMins(schedule.start_time);
      const end = toMins(schedule.end_time);
      const duration = selectedService.duration_minutes;
      const slots: string[] = [];

      const blocked = existing?.map((b: any) => {
          const d = new Date(b.scheduled_at);
          const s = d.getHours()*60 + d.getMinutes();
          return { start: s, end: s + (b.services?.duration_minutes || 60) };
      }) || [];

      for(let t=start; t+duration<=end; t+=30) {
          const sEnd = t+duration;
          const isBlocked = blocked.some(b => (t < b.end && sEnd > b.start));
          if(!isBlocked) {
              const h = Math.floor(t/60);
              const m = t%60;
              slots.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
          }
      }
      setAvailableSlots(slots);
  };

  const handleConciergeBooking = async () => {
      if(!selectedClient || !selectedService || !selectedGuruba || !bookingDate || !bookingTime) return;
      
      const isNA = (g?: string) => !g || g.toLowerCase() === 'not applicable' || g.toLowerCase() === 'n/a';
      const cGotra = selectedClient.gotra_id;
      const gGotra = selectedGuruba.profiles?.gotra_id;
      const conflict = !isNA(cGotra) && !isNA(gGotra) && cGotra === gGotra;

      if(conflict && !forceBook) {
          setGotraConflict(true);
          return;
      }

      try {
          const scheduledAt = new Date(`${bookingDate}T${bookingTime}`).toISOString();
          const { error } = await supabase.from('bookings').insert({
              user_id: selectedClient.id,
              guruba_id: selectedGuruba.id,
              service_id: selectedService.id,
              scheduled_at: scheduledAt,
              status: 'confirmed' // Admin bookings are auto-confirmed
          });
          
          if(error) throw error;
          
          // Reset
          setBookingStep(1);
          setSelectedClient(null);
          setSelectedService(null);
          setSelectedGuruba(null);
          setBookingDate('');
          setBookingTime('');
          setForceBook(false);
          setGotraConflict(false);
          alert("Booking Created Successfully!");
          fetchData(); // Refresh stats
      } catch(e) {
          alert("Booking Failed.");
      }
  };

  const handleTabChange = (tab: typeof activeTab) => {
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'overview':
              return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium">Total Revenue</h3>
                              <div className="text-3xl font-bold text-stone-900">Rs. {stats.revenue.toLocaleString()}</div>
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
                              <span className="ml-auto text-sm text-green-700">Latency: 24ms</span>
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
                      
                      {/* Step Indicator */}
                      <div className="flex items-center mb-8">
                          {[1, 2, 3, 4].map(step => (
                              <div key={step} className={`h-2 flex-1 rounded-full mx-1 transition-colors ${step <= bookingStep ? 'bg-saffron-500' : 'bg-stone-200'}`} />
                          ))}
                      </div>

                      {bookingStep === 1 && (
                          <div className="space-y-4 max-w-xl">
                              <h3 className="text-lg font-semibold">Step 1: Select Client</h3>
                              <div className="relative">
                                  <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                                  <input 
                                      className="w-full pl-10 p-3 border rounded-lg" 
                                      placeholder="Search client by email..."
                                      value={clientSearch}
                                      onChange={e => searchClients(e.target.value)}
                                  />
                              </div>
                              <div className="space-y-2">
                                  {filteredClients.map(c => (
                                      <div key={c.id} onClick={() => { setSelectedClient(c); setBookingStep(2); }} className="p-3 border rounded-lg hover:bg-stone-50 cursor-pointer flex justify-between">
                                          <span>{c.email}</span>
                                          <span className="text-stone-500 text-sm">{c.full_name}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {bookingStep === 2 && (
                          <div className="space-y-4">
                              <div className="flex justify-between">
                                  <h3 className="text-lg font-semibold">Step 2: Select Service</h3>
                                  <button onClick={() => setBookingStep(1)} className="text-sm text-stone-500">Change Client: {selectedClient?.email}</button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {services.map(s => (
                                      <div key={s.id} onClick={() => { setSelectedService(s); setBookingStep(3); fetchAvailableGurubas(); }} className="p-4 border rounded-lg hover:border-saffron-500 cursor-pointer transition-all">
                                          <p className="font-bold">{s.title}</p>
                                          <p className="text-sm text-stone-500">Rs. {s.base_price}</p>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {bookingStep === 3 && (
                          <div className="space-y-4">
                              <div className="flex justify-between">
                                   <h3 className="text-lg font-semibold">Step 3: Select Guruba</h3>
                                   <button onClick={() => setBookingStep(2)} className="text-sm text-stone-500">Change Service: {selectedService?.title}</button>
                              </div>
                              {filteredGurubas.length === 0 ? <p>No Gurubas found for this service.</p> : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {filteredGurubas.map(g => (
                                          <div key={g.id} onClick={() => { setSelectedGuruba(g); setBookingStep(4); }} className="p-4 border rounded-lg hover:border-saffron-500 cursor-pointer flex gap-4">
                                              <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center font-bold">{g.profiles?.full_name?.[0]}</div>
                                              <div>
                                                  <p className="font-bold">{g.profiles?.full_name}</p>
                                                  <p className="text-xs text-stone-500">{g.location} • Gotra: {g.profiles?.gotra_id}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}

                      {bookingStep === 4 && (
                          <div className="space-y-6 max-w-xl">
                               <div className="flex justify-between">
                                   <h3 className="text-lg font-semibold">Step 4: Schedule & Confirm</h3>
                                   <button onClick={() => setBookingStep(3)} className="text-sm text-stone-500">Change Guruba</button>
                              </div>
                              
                              <div className="flex gap-4">
                                  <input type="date" className="border p-2 rounded flex-1" value={bookingDate} onChange={e => setBookingDate(e.target.value)} onBlur={checkAvailability} />
                              </div>

                              {availableSlots.length > 0 ? (
                                  <div className="grid grid-cols-4 gap-2">
                                      {availableSlots.map(slot => (
                                          <button key={slot} onClick={() => setBookingTime(slot)} className={`p-2 text-sm border rounded ${bookingTime === slot ? 'bg-saffron-600 text-white' : 'hover:bg-stone-50'}`}>
                                              {slot}
                                          </button>
                                      ))}
                                  </div>
                              ) : bookingDate && <p className="text-red-500 text-sm">No slots available.</p>}

                              {gotraConflict && (
                                  <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700 text-sm">
                                      <p className="font-bold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Gotra Conflict!</p>
                                      <p>Client and Guruba share Gotra ({selectedClient?.gotra_id}).</p>
                                      <div className="mt-2">
                                          <label className="flex items-center gap-2">
                                              <input type="checkbox" checked={forceBook} onChange={e => setForceBook(e.target.checked)} />
                                              Override and Force Book
                                          </label>
                                      </div>
                                  </div>
                              )}

                              <Button onClick={handleConciergeBooking} disabled={!bookingTime || (gotraConflict && !forceBook)} className="w-full">
                                  Confirm Booking
                              </Button>
                          </div>
                      )}
                  </div>
              );

          case 'users':
              return (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                      <div className="p-4 border-b border-stone-200 flex justify-between items-center">
                          <h3 className="font-bold text-stone-900">User Management</h3>
                          <input type="text" placeholder="Search users..." className="border rounded-md px-3 py-1 text-sm" />
                      </div>
                      <table className="w-full text-sm text-left">
                          <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                              <tr>
                                  <th className="px-6 py-3">User</th>
                                  <th className="px-6 py-3">Role</th>
                                  <th className="px-6 py-3">Verification</th>
                                  <th className="px-6 py-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {users.map(u => (
                                  <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50">
                                      <td className="px-6 py-4">
                                          <p className="font-medium text-stone-900">{u.full_name}</p>
                                          <p className="text-xs text-stone-500">{u.email}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                              u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                              u.role === 'guruba' ? 'bg-saffron-100 text-saffron-800' : 'bg-gray-100 text-gray-800'
                                          }`}>
                                              {u.role}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          {u.role === 'guruba' ? (
                                              u.gurubas?.[0]?.is_verified ? (
                                                  <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircle className="h-3 w-3" /> Verified</span>
                                              ) : (
                                                  <button onClick={() => handleVerifyGuruba(u.id, true)} className="text-blue-600 hover:underline text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">Approve Verification</button>
                                              )
                                          ) : (
                                              <span className="text-stone-300 text-xs">N/A</span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <Button size="sm" variant="ghost"><Key className="h-4 w-4" /></Button>
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
                              <div key={service.id} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden group">
                                  <div className="h-32 bg-stone-200 relative">
                                      <img src={service.image_url} className="h-full w-full object-cover" />
                                      <div className="absolute top-2 left-2 bg-white/90 text-stone-800 text-xs px-2 py-1 rounded font-bold">
                                          {service.category || 'General'}
                                      </div>
                                      {service.is_featured && (
                                          <div className="absolute top-2 right-2 bg-saffron-500 text-white text-xs px-2 py-1 rounded font-bold flex items-center gap-1">
                                              <Star className="h-3 w-3 fill-current" /> Featured
                                          </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <button onClick={() => openServiceModal(service)} className="p-2 bg-white rounded-full hover:scale-110 transition-transform"><Edit className="h-4 w-4" /></button>
                                          <button onClick={() => handleDeleteService(service.id)} className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform"><Trash className="h-4 w-4" /></button>
                                      </div>
                                  </div>
                                  <div className="p-4">
                                      <h3 className="font-bold text-stone-900 line-clamp-1">{service.title}</h3>
                                      <div className="flex justify-between mt-2 text-sm">
                                          <span className="text-stone-500">{service.duration_minutes} mins</span>
                                          <span className="font-bold text-saffron-600">Rs. {service.base_price}</span>
                                      </div>
                                      {service.is_online_enabled && (
                                          <span className="inline-block mt-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Online Supported</span>
                                      )}
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
                              <input 
                                  placeholder="Add new Gotra..." 
                                  className="border rounded-md px-3 py-1.5 text-sm focus:ring-saffron-500 focus:border-saffron-500 outline-none"
                                  value={newGotraName}
                                  onChange={e => setNewGotraName(e.target.value)}
                              />
                              <Button size="sm" type="submit">Add</Button>
                          </form>
                      </div>

                      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                                  <tr>
                                      <th className="px-6 py-3">Gotra Name</th>
                                      <th className="px-6 py-3">Status</th>
                                      <th className="px-6 py-3 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                  {gotras.map(g => (
                                      <tr key={g.id} className="hover:bg-stone-50">
                                          <td className="px-6 py-4 font-medium text-stone-900">{g.name}</td>
                                          <td className="px-6 py-4">
                                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                  g.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                              }`}>
                                                  {g.status}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {g.status === 'pending' ? (
                                                  <div className="flex justify-end gap-2">
                                                      <button onClick={() => handleApproveGotra(g.id)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Approve">
                                                          <Check className="h-4 w-4" />
                                                      </button>
                                                      <button onClick={() => handleRejectGotra(g.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Reject">
                                                          <X className="h-4 w-4" />
                                                      </button>
                                                  </div>
                                              ) : (
                                                  <button onClick={() => handleRejectGotra(g.id)} className="text-stone-400 hover:text-red-600">
                                                      <Trash className="h-4 w-4" />
                                                  </button>
                                              )}
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
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-12 text-center animate-in fade-in duration-300">
                      <DollarSign className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-stone-900">Financial Reporting</h3>
                      <p className="text-stone-500">Transaction logs and export features would go here.</p>
                  </div>
              );
      }
  };

  // Helper functions for Gotras
  const handleApproveGotra = async (id: string) => { try { await supabase.from('gotras').update({ status: 'approved' }).eq('id', id); fetchData(); } catch(e) { alert("Failed"); } };
  const handleRejectGotra = async (id: string) => { if(!confirm("Reject?")) return; try { await supabase.from('gotras').delete().eq('id', id); fetchData(); } catch(e) { alert("Failed"); } };
  const handleAddGotra = async (e: React.FormEvent) => { e.preventDefault(); if (!newGotraName.trim()) return; try { await supabase.from('gotras').insert({ name: newGotraName.trim(), status: 'approved' }); setNewGotraName(''); fetchData(); } catch(e) { alert("Failed"); } };

  return (
    <div className="min-h-screen bg-stone-100 flex font-sans">
        {/* Mobile Menu Backdrop */}
        <div 
            className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Admin Sidebar */}
        <aside className={`
            fixed top-0 left-0 z-50 h-full w-64 bg-stone-900 text-stone-300 flex flex-col transition-transform duration-300 ease-in-out
            lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16
            ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
            <div className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white font-bold text-xl">
                    <div className="h-8 w-8 bg-saffron-600 rounded flex items-center justify-center">A</div>
                    Admin
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-stone-400 hover:text-white">
                    <X className="h-6 w-6" />
                </button>
            </div>
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} />
                <SidebarItem icon={UserPlus} label="Concierge Booking" active={activeTab === 'concierge'} onClick={() => handleTabChange('concierge')} />
                <SidebarItem icon={Users} label="Users & Gurubas" active={activeTab === 'users'} onClick={() => handleTabChange('users')} />
                <SidebarItem icon={Layers} label="Services" active={activeTab === 'services'} onClick={() => handleTabChange('services')} />
                <SidebarItem icon={ScrollText} label="Gotras" active={activeTab === 'gotras'} onClick={() => handleTabChange('gotras')} />
                <SidebarItem icon={DollarSign} label="Financials" active={activeTab === 'financials'} onClick={() => handleTabChange('financials')} />
            </nav>
            <div className="p-4 border-t border-stone-800">
                <div className="text-xs text-stone-500">v1.0.0 Admin Console</div>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto h-[calc(100vh-4rem)]">
            <div className="lg:hidden mb-6 flex items-center gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg shadow-sm border border-stone-200 text-stone-600">
                    <Menu className="h-6 w-6" />
                </button>
                <span className="font-bold text-stone-900 text-lg">Admin Panel</span>
            </div>

            {renderContent()}
        </main>

        {/* Service Modal */}
        {isServiceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold">{editingService ? 'Edit Service' : 'New Service'}</h3>
                         <button onClick={() => setIsServiceModalOpen(false)}><X className="h-5 w-5 text-stone-400" /></button>
                    </div>
                    <form onSubmit={handleServiceSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Service Title</label>
                            <input 
                                placeholder="e.g. Satyanarayan Puja" 
                                className="w-full border border-stone-300 p-2 rounded focus:ring-2 focus:ring-saffron-500 outline-none" 
                                value={serviceForm.title} 
                                onChange={e => setServiceForm({...serviceForm, title: e.target.value})} 
                                required 
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Category</label>
                             <input 
                                placeholder="e.g. Pujas, Sanskaras, Astrology" 
                                className="w-full border border-stone-300 p-2 rounded focus:ring-2 focus:ring-saffron-500 outline-none" 
                                value={serviceForm.category} 
                                onChange={e => setServiceForm({...serviceForm, category: e.target.value})} 
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                             <textarea 
                                placeholder="Describe the ritual..." 
                                className="w-full border border-stone-300 p-2 rounded focus:ring-2 focus:ring-saffron-500 outline-none" 
                                value={serviceForm.description} 
                                onChange={e => setServiceForm({...serviceForm, description: e.target.value})} 
                                required 
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Price (Rs.)</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-stone-300 p-2 rounded focus:ring-2 focus:ring-saffron-500 outline-none" 
                                    value={serviceForm.base_price} 
                                    onChange={e => setServiceForm({...serviceForm, base_price: parseInt(e.target.value) || 0})} 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Duration (min)</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-stone-300 p-2 rounded focus:ring-2 focus:ring-saffron-500 outline-none" 
                                    value={serviceForm.duration_minutes} 
                                    onChange={e => setServiceForm({...serviceForm, duration_minutes: parseInt(e.target.value) || 0})} 
                                    required 
                                />
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Image URL</label>
                             <input 
                                placeholder="https://..." 
                                className="w-full border border-stone-300 p-2 rounded focus:ring-2 focus:ring-saffron-500 outline-none" 
                                value={serviceForm.image_url} 
                                onChange={e => setServiceForm({...serviceForm, image_url: e.target.value})} 
                            />
                        </div>
                        
                        <div className="space-y-2 pt-2 bg-stone-50 p-3 rounded">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="is_featured"
                                    className="h-4 w-4 rounded border-stone-300 text-saffron-600 focus:ring-saffron-500"
                                    checked={serviceForm.is_featured}
                                    onChange={e => setServiceForm({...serviceForm, is_featured: e.target.checked})}
                                />
                                <label htmlFor="is_featured" className="text-sm font-medium text-stone-700 cursor-pointer select-none">Feature on Homepage</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="is_online_enabled"
                                    className="h-4 w-4 rounded border-stone-300 text-saffron-600 focus:ring-saffron-500"
                                    checked={serviceForm.is_online_enabled}
                                    onChange={e => setServiceForm({...serviceForm, is_online_enabled: e.target.checked})}
                                />
                                <label htmlFor="is_online_enabled" className="text-sm font-medium text-stone-700 cursor-pointer select-none">Online Service Enabled</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-stone-100">
                            <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Service</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
