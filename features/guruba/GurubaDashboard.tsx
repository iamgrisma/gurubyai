import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { Calendar, Clock, DollarSign, MapPin, Star, Zap, RefreshCw, AlertCircle } from 'lucide-react';

export const GurubaDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [rituals, setRituals] = useState<any[]>([]);
  const [stats, setStats] = useState({ earnings: 0, completed: 0, rating: 5.0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
        fetchGurubaData();
    }
  }, [user]);

  const fetchGurubaData = async () => {
    setLoading(true);
    setError(null);
    
    try {
        // 1. Get Guruba Details
        const { data: gurubaData, error: gurubaError } = await supabase
            .from('gurubas')
            .select('*')
            .eq('user_id', user?.id)
            .single();

        if (gurubaError) {
             throw new Error("Could not find Guruba profile details.");
        }

        setStats(prev => ({
            ...prev,
            rating: gurubaData.rating || 5.0,
            earnings: 0, // In a real app, calculate from bookings table
            completed: 0
        }));

        // 2. Get Bookings for this Guruba
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                *,
                services:service_id (title, base_price),
                profiles:user_id (full_name, phone)
            `)
            .eq('guruba_id', gurubaData.id)
            .order('scheduled_at', { ascending: true });
        
        if (bookingsError) throw bookingsError;

        if (bookings) {
            setRituals(bookings);
            setStats(prev => ({ 
                ...prev, 
                completed: bookings.filter(b => b.status === 'completed').length,
                // Simple earnings calculation example
                earnings: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.services?.base_price || 0), 0)
            }));
        }

    } catch (e: any) {
        console.error("Error loading guruba dash:", e);
        setError(e.message || "Failed to load dashboard data.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              Namaste, {profile?.full_name || 'Pandit Ji'}
            </h1>
            <p className="text-stone-600">Manage your rituals and availability.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchGurubaData} disabled={loading}>
                {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : 'Refresh'}
            </Button>
            <Button>Accept New Bookings</Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800 border border-red-200 flex items-center gap-2">
             <AlertCircle className="h-5 w-5" />
             <span>{error}</span>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <DollarSign className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-stone-500">Total Earnings</p>
                <p className="text-2xl font-bold text-stone-900">${stats.earnings}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 flex items-center gap-4">
            <div className="h-12 w-12 bg-saffron-100 rounded-full flex items-center justify-center text-saffron-600">
                <Calendar className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-stone-500">Completed Rituals</p>
                <p className="text-2xl font-bold text-stone-900">{stats.completed}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 flex items-center gap-4">
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                <Star className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-stone-500">Rating</p>
                <p className="text-2xl font-bold text-stone-900">{stats.rating}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
            {/* Main Column: Upcoming Rituals */}
            <div className="md:col-span-8 space-y-6">
                <h2 className="text-lg font-bold text-stone-900">Upcoming Rituals</h2>
                {loading ? (
                    <div className="p-8 text-center bg-white rounded-lg border border-stone-200 text-stone-500">
                        Loading schedule...
                    </div>
                ) : rituals.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-lg border border-stone-200 text-stone-500">
                        No upcoming rituals found.
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
                        {rituals.map((ritual) => (
                            <div key={ritual.id} className="p-6 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-stone-900">{ritual.services?.title || 'Custom Service'}</h3>
                                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                                        ritual.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {ritual.status}
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 text-sm text-stone-600 mt-3">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-stone-400" />
                                        {new Date(ritual.scheduled_at).toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-stone-400" />
                                        Client: {ritual.profiles?.full_name || 'Unknown'}
                                    </div>
                                    <div className="flex items-center gap-1 font-medium text-saffron-700">
                                        <DollarSign className="h-4 w-4" />
                                        ${ritual.services?.base_price}
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end gap-3">
                                    <Button variant="ghost" size="sm">View Details</Button>
                                    {ritual.status === 'pending' && <Button size="sm">Confirm</Button>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Column: Quick Actions */}
            <div className="md:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
                    <h3 className="font-semibold text-stone-900 mb-4">Profile Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-stone-600">Verification</span>
                            <span className="text-green-600 font-medium flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Verified
                            </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2">
                            <div className="bg-saffron-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <p className="text-xs text-stone-500">Your profile is 85% complete.</p>
                        <Button variant="outline" className="w-full">Edit Profile</Button>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};