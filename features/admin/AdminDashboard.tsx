
import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Service } from '../../types';
import { 
    Users, BookOpen, Settings, Activity, RefreshCw, AlertCircle, Search, Key, Mail, CheckCircle,
    LayoutDashboard, Layers, DollarSign, X, Plus, Edit, Trash
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'services' | 'financials'>('overview');
  
  // Data State
  const [stats, setStats] = useState({ users: 0, gurubas: 0, bookings: 0, revenue: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
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
    category: '' 
  });

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
        
        // Simple Mock Revenue Calc (real app would sum transactions)
        const { data: allBookings } = await supabase.from('bookings').select('services(base_price)').eq('status', 'completed');
        const revenue = allBookings?.reduce((acc, curr: any) => acc + (curr.services?.base_price || 0), 0) || 0;

        setStats({ users: uCount || 0, gurubas: gCount || 0, bookings: bCount || 0, revenue });

        // Users (Fetch profiles joined with gurubas to see verify status)
        const { data: userData } = await supabase
            .from('profiles')
            .select(`
                *,
                gurubas:id (is_verified)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        setUsers(userData || []);

        // Services
        const { data: serviceData } = await supabase.from('services').select('*').order('title');
        setServices(serviceData || []);

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyGuruba = async (gurubaId: string, status: boolean) => {
      try {
          // gurubaId is actually user_id in this context because of how I fetched
          const { error } = await supabase
            .from('gurubas')
            .update({ is_verified: status })
            .eq('user_id', gurubaId);
          
          if (error) throw error;
          fetchData(); // Refresh
      } catch (e) {
          alert("Failed to update verification status");
      }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (editingService) {
              await supabase.from('services').update(serviceForm).eq('id', editingService.id);
          } else {
              await supabase.from('services').insert(serviceForm);
          }
          setIsServiceModalOpen(false);
          setEditingService(null);
          fetchData();
      } catch (e) {
          alert("Failed to save service");
      }
  };

  const handleDeleteService = async (id: string) => {
      if (!confirm("Are you sure?")) return;
      await supabase.from('services').delete().eq('id', id);
      fetchData();
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
              category: service.category || ''
          });
      } else {
          setEditingService(null);
          setServiceForm({ title: '', description: '', base_price: 0, duration_minutes: 0, image_url: '', category: '' });
      }
      setIsServiceModalOpen(true);
  };

  // Render Content
  const renderContent = () => {
      switch(activeTab) {
          case 'overview':
              return (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                              <h3 className="text-stone-500 text-sm font-medium">Total Revenue</h3>
                              <div className="text-3xl font-bold text-stone-900">${stats.revenue}</div>
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

          case 'users':
              return (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
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
                                                  <button onClick={() => handleVerifyGuruba(u.id, true)} className="text-blue-600 hover:underline text-xs">Approve Verification</button>
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
                  <div className="space-y-6">
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
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <button onClick={() => openServiceModal(service)} className="p-2 bg-white rounded-full hover:scale-110 transition-transform"><Edit className="h-4 w-4" /></button>
                                          <button onClick={() => handleDeleteService(service.id)} className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform"><Trash className="h-4 w-4" /></button>
                                      </div>
                                  </div>
                                  <div className="p-4">
                                      <h3 className="font-bold text-stone-900">{service.title}</h3>
                                      <div className="flex justify-between mt-2 text-sm">
                                          <span className="text-stone-500">{service.duration_minutes} mins</span>
                                          <span className="font-bold text-saffron-600">${service.base_price}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          
          case 'financials':
              return (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-12 text-center">
                      <DollarSign className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-stone-900">Financial Reporting</h3>
                      <p className="text-stone-500">Transaction logs and export features would go here.</p>
                  </div>
              );
      }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex font-sans">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col sticky top-0 h-screen">
            <div className="p-6">
                <div className="flex items-center gap-2 text-white font-bold text-xl">
                    <div className="h-8 w-8 bg-saffron-600 rounded flex items-center justify-center">A</div>
                    Admin
                </div>
            </div>
            <nav className="flex-1 px-4 space-y-1">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <SidebarItem icon={Users} label="Users & Gurubas" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                <SidebarItem icon={Layers} label="Services" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
                <SidebarItem icon={DollarSign} label="Financials" active={activeTab === 'financials'} onClick={() => setActiveTab('financials')} />
            </nav>
            <div className="p-4 border-t border-stone-800">
                <div className="text-xs text-stone-500">v1.0.0 Admin Console</div>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto h-screen">
            {renderContent()}
        </main>

        {/* Service Modal */}
        {isServiceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                    <h3 className="text-lg font-bold mb-4">{editingService ? 'Edit Service' : 'New Service'}</h3>
                    <form onSubmit={handleServiceSubmit} className="space-y-4">
                        <input 
                            placeholder="Title" 
                            className="w-full border p-2 rounded" 
                            value={serviceForm.title} 
                            onChange={e => setServiceForm({...serviceForm, title: e.target.value})} 
                            required 
                        />
                        <input 
                            placeholder="Category (e.g. Pujas, Sanskaras, Astrology)" 
                            className="w-full border p-2 rounded" 
                            value={serviceForm.category} 
                            onChange={e => setServiceForm({...serviceForm, category: e.target.value})} 
                        />
                        <textarea 
                            placeholder="Description" 
                            className="w-full border p-2 rounded" 
                            value={serviceForm.description} 
                            onChange={e => setServiceForm({...serviceForm, description: e.target.value})} 
                            required 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                type="number" 
                                placeholder="Price ($)" 
                                className="w-full border p-2 rounded" 
                                value={serviceForm.base_price} 
                                onChange={e => setServiceForm({...serviceForm, base_price: parseInt(e.target.value)})} 
                                required 
                            />
                            <input 
                                type="number" 
                                placeholder="Duration (min)" 
                                className="w-full border p-2 rounded" 
                                value={serviceForm.duration_minutes} 
                                onChange={e => setServiceForm({...serviceForm, duration_minutes: parseInt(e.target.value)})} 
                                required 
                            />
                        </div>
                        <input 
                            placeholder="Image URL" 
                            className="w-full border p-2 rounded" 
                            value={serviceForm.image_url} 
                            onChange={e => setServiceForm({...serviceForm, image_url: e.target.value})} 
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
