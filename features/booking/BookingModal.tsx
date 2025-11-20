
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba } from '../../types';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, AlertTriangle, CheckCircle, X, MapPin } from 'lucide-react';

interface BookingModalProps {
  service: Service;
  guruba: Guruba;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ service, guruba, onClose }) => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived Data
  const userGotra = profile?.gotra_id;
  const gurubaGotra = guruba.profiles?.gotra_id;
  
  // Gotra Check Logic
  const isGotraConflict = userGotra && gurubaGotra && userGotra.toLowerCase() === gurubaGotra.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    // Construct a timestamp
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    try {
      const { error: dbError } = await supabase.from('bookings').insert({
        user_id: user.id,
        guruba_id: guruba.id,
        service_id: service.id,
        scheduled_at: scheduledAt,
        status: 'pending'
      });

      if (dbError) throw dbError;

      onClose();
      navigate('/booking-success');
    } catch (err: any) {
      setError(err.message || "Failed to book service");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <h2 className="text-xl font-bold text-stone-900">Confirm Your Booking</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
            <div className="flex flex-col md:flex-row gap-8 mb-8">
                {/* Summary Card */}
                <div className="flex-1 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">Service Details</h3>
                        <div className="flex gap-4">
                            <div className="h-20 w-20 rounded-lg bg-stone-200 overflow-hidden shrink-0">
                                <img src={service.image_url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-stone-900">{service.title}</h4>
                                <p className="text-sm text-stone-500 line-clamp-2">{service.description}</p>
                                <div className="mt-1 flex items-center gap-4 text-sm font-medium text-stone-700">
                                    <span>${service.base_price}</span>
                                    <span>•</span>
                                    <span>{service.duration_minutes} mins</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">Selected Guruba</h3>
                        <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-lg border border-stone-100">
                            <div className="h-10 w-10 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-700 font-bold text-sm overflow-hidden">
                                {guruba.profiles?.avatar_url ? <img src={guruba.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : (guruba.profiles?.full_name?.[0] || 'G')}
                            </div>
                            <div>
                                <p className="font-bold text-stone-900">{guruba.profiles?.full_name}</p>
                                <p className="text-xs text-stone-500 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" /> {guruba.location}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selection Form */}
                <div className="flex-1 border-l border-stone-100 md:pl-8">
                    <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Gotra Check */}
                        {isGotraConflict ? (
                            <div className="flex items-start gap-3 rounded-md bg-red-50 p-4 text-red-800 border border-red-200">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold">Gotra Conflict</p>
                                    <p className="mt-1 text-xs">
                                    You and the Guruba share the same Gotra ({userGotra}).
                                    </p>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100">
                                <CheckCircle className="h-3 w-3" />
                                <span>Gotra Compatibility Verified</span>
                             </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Select Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full rounded-md border border-stone-300 pl-9 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Select Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                                    <input
                                        type="time"
                                        required
                                        className="w-full rounded-md border border-stone-300 pl-9 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </form>
                </div>
            </div>
        </div>

        {/* Footer / Actions */}
        <div className="bg-stone-50 p-6 border-t border-stone-200 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
                type="submit" 
                form="booking-form"
                isLoading={loading}
                disabled={!!isGotraConflict}
                className="px-8"
            >
                Confirm Booking
            </Button>
        </div>
      </div>
    </div>
  );
};
