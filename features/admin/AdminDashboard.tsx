
import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Users, BookOpen, Settings, Activity, RefreshCw, AlertCircle, Search, Key, Mail, CheckCircle } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({ users: 0, gurubas: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
        const { count: userCount, error: e1 } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (e1) throw e1;
        
        const { count: gurubaCount } = await supabase.from('gurubas').select('*', { count: 'exact', head: true });
        const { count: bookingCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });

        setStats({
            users: userCount || 0,
            gurubas: gurubaCount || 0,
            bookings: bookingCount || 0
        });

        // Fetch Users for Management List (Limit 50 for now)
        const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (usersError) throw usersError;
        setUserList(usersData || []);

    } catch (e: any) {
        console.error("Stats error:", e);
        setError(e.message || "Failed to load system statistics.");
    } finally {
        setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) throw error;

        // Update local state
        setUserList(current => 
            current.map(u => u.id === userId ? { ...u, role: newRole } : u)
        );

    } catch (e: any) {
        console.error("Role update error:", e);
        alert("Failed to update role: " + e.message);
    } finally {
        setUpdatingId(null);
    }
  };

  const handlePasswordReset = async (email: string, userId: string) => {
    setActionLoadingId(userId);
    setActionMessage(null);
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/#/login',
        });

        if (error) throw error;
        setActionMessage({ type: 'success', text: `Password reset email sent to ${email}` });
    } catch (e: any) {
        setActionMessage({ type: 'error', text: e.message });
    } finally {
        setActionLoadingId(null);
    }
  };

  const handleMagicLink = async (email: string, userId: string) => {
    setActionLoadingId(userId);
    setActionMessage(null);
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin + '/#/client',
            }
        });

        if (error) throw error;
        setActionMessage({ type: 'success', text: `Magic login link sent to ${email}` });
    } catch (e: any) {
        setActionMessage({ type: 'error', text: e.message });
    } finally {
        setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    Admin Console
                </h1>
                <p className="text-stone-600">System overview and management.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={fetchSystemStats} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="secondary" className="bg-stone-200">System Settings</Button>
            </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800 border border-red-200 flex items-center gap-2">
             <AlertCircle className="h-5 w-5" />
             <span>{error}</span>
          </div>
        )}

        {actionMessage && (
          <div className={`mb-6 rounded-md p-4 border flex items-center gap-2 ${
              actionMessage.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
             {actionMessage.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
             <span>{actionMessage.text}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-stone-500 text-sm font-medium">Total Users</h3>
                    <Users className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold text-stone-900">{stats.users}</div>
                <p className="text-xs text-green-600 mt-1 flex items-center">Registered Accounts</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-stone-500 text-sm font-medium">Active Gurubas</h3>
                    <Activity className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold text-stone-900">{stats.gurubas}</div>
                <p className="text-xs text-green-600 mt-1">Verified Providers</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-stone-500 text-sm font-medium">Bookings</h3>
                    <BookOpen className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold text-stone-900">{stats.bookings}</div>
                <p className="text-xs text-stone-500 mt-1">Total all-time</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-stone-500 text-sm font-medium">System Health</h3>
                    <Settings className="h-5 w-5 text-stone-400" />
                </div>
                <div className="text-3xl font-bold text-green-600">99.9%</div>
                <p className="text-xs text-stone-500 mt-1">Uptime</p>
            </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">User Role & Recovery Management</h2>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="pl-9 pr-4 py-2 border border-stone-300 rounded-md text-sm focus:ring-saffron-500 focus:border-saffron-500"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-stone-700 uppercase bg-stone-50">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-stone-500">Loading users...</td>
                             </tr>
                        ) : userList.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-stone-500">No users found.</td>
                             </tr>
                        ) : (
                            userList.map((u) => (
                                <tr key={u.id} className="bg-white border-b hover:bg-stone-50">
                                    <td className="px-6 py-4 font-medium text-stone-900 whitespace-nowrap flex items-center gap-2">
                                        <div className="h-8 w-8 bg-stone-100 rounded-full flex items-center justify-center text-xs font-bold text-stone-600">
                                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span>{u.full_name || 'Unnamed User'}</span>
                                            <span className="text-xs text-stone-400">{new Date(u.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-stone-600">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                disabled={updatingId === u.id}
                                                className={`
                                                    block w-32 rounded-md border-0 py-1.5 pl-3 pr-8 text-stone-900 ring-1 ring-inset ring-stone-300 focus:ring-2 focus:ring-saffron-600 sm:text-sm sm:leading-6
                                                    ${u.role === 'admin' ? 'font-bold text-purple-700 bg-purple-50' : ''}
                                                    ${u.role === 'guruba' ? 'font-semibold text-saffron-700 bg-saffron-50' : ''}
                                                `}
                                            >
                                                <option value="client">Client</option>
                                                <option value="guruba">Guruba</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            {updatingId === u.id && <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                disabled={actionLoadingId === u.id} 
                                                onClick={() => handlePasswordReset(u.email, u.id)}
                                                title="Send Password Reset Email"
                                                className="px-2"
                                            >
                                                <Key className="h-4 w-4 text-stone-500" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                disabled={actionLoadingId === u.id}
                                                onClick={() => handleMagicLink(u.email, u.id)}
                                                title="Send One-Time Magic Link"
                                                className="px-2"
                                            >
                                                <Mail className="h-4 w-4 text-stone-500" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-stone-200 bg-stone-50 text-center">
                <Button variant="ghost" size="sm" onClick={fetchSystemStats}>Refresh List</Button>
            </div>
        </div>
      </div>
    </div>
  );
};
