import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fallback for display name if profile failed to load during login
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Fetch bookings and join with Service details and Guruba details
      // Note: For Guruba name, we join bookings -> gurubas -> profiles
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (title, duration_minutes, base_price),
          gurubas:guruba_id (
            location,
            profiles:user_id (full_name)
          )
        `)
        .eq('user_id', user?.id)
        .order('scheduled_at', { ascending: true });

      if (error) {
        throw error;
      } else {
        setBookings(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      let msg = err.message;
      // Friendly message for the specific schema cache error
      if (msg?.toLowerCase().includes('querying schema')) {
        msg = 'System Database Initializing. Please wait 30s and click Retry.';
      }
      setFetchError(msg || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Welcome back, {displayName}</h1>
            <p className="text-stone-600">Manage your upcoming rituals and profile.</p>
          </div>
          <Button onClick={() => navigate('/book')}>Book New Service</Button>
        </div>

        {/* Error Alert */}
        {fetchError && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-red-700 border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>System Notice: {fetchError}</span>
            </div>
            <Button size="sm" variant="outline" onClick={fetchBookings} className="bg-white border-red-200 text-red-700 hover:bg-red-50">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-12">
          
          {/* Left Column: Bookings */}
          <div className="md:col-span-8 space-y-6">
            <h2 className="text-lg font-bold text-stone-900">Your Bookings</h2>
            
            {loading ? (
              <div className="flex items-center justify-center p-12 bg-white rounded-lg border border-stone-200">
                <RefreshCw className="h-6 w-6 animate-spin text-saffron-600 mr-3" />
                <span className="text-stone-500">Loading your schedule...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow border border-stone-200">
                <Calendar className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-900">No Upcoming Rituals</h3>
                <p className="text-stone-500 mb-6 mt-2">You haven't booked any services yet.</p>
                <Button variant="outline" onClick={() => navigate('/book')}>Browse Services</Button>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="flex flex-col md:flex-row rounded-lg bg-white shadow border border-stone-200 overflow-hidden transition-shadow hover:shadow-md">
                  <div className="bg-saffron-50 p-6 flex flex-col items-center justify-center min-w-[120px] border-r border-stone-100">
                     <span className="text-sm font-bold text-saffron-700 uppercase">
                       {new Date(booking.scheduled_at).toLocaleString('default', { month: 'short' })}
                     </span>
                     <span className="text-3xl font-bold text-stone-900">
                       {new Date(booking.scheduled_at).getDate()}
                     </span>
                     <span className="text-xs text-stone-500">
                        {new Date(booking.scheduled_at).toLocaleString('default', { weekday: 'short' })}
                     </span>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-stone-900">{booking.services?.title || 'Custom Service'}</h3>
                        <p className="text-stone-600 text-sm mt-1">
                          with <span className="font-medium">{booking.gurubas?.profiles?.full_name || 'Unknown Guruba'}</span>
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-500">
                       <div className="flex items-center">
                         <Clock className="mr-1 h-4 w-4" />
                         {formatTime(booking.scheduled_at)} 
                         {booking.services?.duration_minutes && ` (${booking.services.duration_minutes} mins)`}
                       </div>
                       <div className="flex items-center">
                         <MapPin className="mr-1 h-4 w-4" />
                         {booking.gurubas?.location || 'Location TBD'}
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Profile & Stats */}
          <div className="md:col-span-4 space-y-6">
             <div className="rounded-lg bg-white p-6 shadow border border-stone-200">
                <h3 className="font-semibold text-stone-900 mb-4">My Profile</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-stone-100">
                        <span className="text-stone-500">Full Name:</span>
                        <span className="font-medium text-right">{profile?.full_name || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-100">
                        <span className="text-stone-500">Email:</span>
                        <span className="font-medium text-right truncate max-w-[180px]" title={user?.email}>{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-100">
                        <span className="text-stone-500">Phone:</span>
                        <span className="font-medium text-right">{profile?.phone || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-stone-500">Gotra:</span>
                        <span className="font-medium text-right text-saffron-700">{profile?.gotra_id || 'Not Set'}</span>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="mt-6 w-full">Edit Profile</Button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};