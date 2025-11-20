
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { ReviewModal } from './ReviewModal';
import { Calendar, Clock, MapPin, AlertCircle, RefreshCw, Save, X, Camera, User } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Review State
  const [reviewModalData, setReviewModalData] = useState<{id: string, gurubaId: string, gurubaName: string} | null>(null);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    gotra_id: '',
    avatar_url: ''
  });

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
      // Get reviews to check which bookings are already reviewed
      const { data: reviews } = await supabase.from('reviews').select('booking_id').eq('user_id', user?.id);
      const reviewedBookingIds = new Set(reviews?.map(r => r.booking_id));

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (title, duration_minutes, base_price),
          gurubas:guruba_id (
            id,
            location,
            profiles:user_id (full_name)
          )
        `)
        .eq('user_id', user?.id)
        .order('scheduled_at', { ascending: false }); // Show newest first

      if (error) {
        throw error;
      } else {
        const bookingsWithReviewStatus = data?.map(b => ({
            ...b,
            is_reviewed: reviewedBookingIds.has(b.id)
        }));
        setBookings(bookingsWithReviewStatus || []);
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setFetchError('Failed to load bookings. Please verify your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setProfileForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      gotra_id: profile?.gotra_id || '',
      avatar_url: profile?.avatar_url || ''
    });
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setFetchError(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 500000) { // 500KB limit for Base64
            alert("Image too large. Please select an image under 500KB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileForm(prev => ({ ...prev, avatar_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setUpdateLoading(true);
    setFetchError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          gotra_id: profileForm.gotra_id,
          avatar_url: profileForm.avatar_url
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setFetchError(err.message || "Failed to update profile details.");
    } finally {
      setUpdateLoading(false);
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
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                Welcome back, {displayName}
            </h1>
            <p className="text-stone-600">Manage your upcoming rituals and profile.</p>
          </div>
          <Button onClick={() => navigate('/book')}>Book New Service</Button>
        </div>

        {fetchError && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800 border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{fetchError}</span>
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
                        booking.status === 'completed' ? 'bg-stone-100 text-stone-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-500 items-center">
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

                    {/* Review Button */}
                    {booking.status === 'completed' && !booking.is_reviewed && (
                        <div className="mt-4 pt-3 border-t border-stone-100 text-right">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setReviewModalData({
                                    id: booking.id,
                                    gurubaId: booking.guruba_id,
                                    gurubaName: booking.gurubas?.profiles?.full_name
                                })}
                            >
                                ★ Rate & Review
                            </Button>
                        </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Profile & Stats */}
          <div className="md:col-span-4 space-y-6">
             <div className="rounded-lg bg-white p-6 shadow border border-stone-200">
                <h3 className="font-semibold text-stone-900 mb-4 flex items-center justify-between">
                  My Profile
                  {isEditingProfile && <span className="text-xs font-normal text-stone-500">Editing</span>}
                </h3>

                {/* Avatar Display */}
                <div className="flex justify-center mb-6">
                    <div className="relative h-24 w-24">
                        <div className="h-24 w-24 rounded-full bg-stone-200 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                            {isEditingProfile && profileForm.avatar_url ? (
                                <img src={profileForm.avatar_url} className="h-full w-full object-cover" />
                            ) : profile?.avatar_url ? (
                                <img src={profile?.avatar_url} className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-10 w-10 text-stone-400" />
                            )}
                        </div>
                        {isEditingProfile && (
                            <label className="absolute bottom-0 right-0 bg-saffron-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-saffron-700 shadow-sm">
                                <Camera className="h-4 w-4" />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </label>
                        )}
                    </div>
                </div>
                
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Full Name</label>
                      <input 
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                        placeholder="Your Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Phone Number</label>
                      <input 
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                        placeholder="555-0123"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Gotra</label>
                      <input 
                        type="text"
                        value={profileForm.gotra_id}
                        onChange={(e) => setProfileForm({...profileForm, gotra_id: e.target.value})}
                        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                        placeholder="e.g. Kashyap"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSaveProfile} isLoading={updateLoading} className="flex-1">
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={updateLoading} className="flex-1">
                         <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
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
                    <Button variant="outline" size="sm" className="mt-6 w-full" onClick={handleEditClick}>Edit Profile</Button>
                  </>
                )}
             </div>
          </div>

        </div>
      </div>

      {reviewModalData && (
        <ReviewModal
            bookingId={reviewModalData.id}
            gurubaId={reviewModalData.gurubaId}
            gurubaName={reviewModalData.gurubaName}
            onClose={() => setReviewModalData(null)}
            onSuccess={() => {
                setReviewModalData(null);
                fetchBookings();
            }}
        />
      )}
    </div>
  );
};
