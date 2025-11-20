import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { Service, Guruba } from '../../types';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';

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
  // In many traditions, user and priest (if performing specific rituals) should not overlap 
  // OR if it's a marriage context, they shouldn't be same. 
  // For general rituals, this check might be informational or strict based on requirement.
  // Implementing Strict Check: If Same -> Warning/Block.
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
        status: 'pending' // Default status
      });

      if (dbError) throw dbError;

      onClose();
      navigate('/client'); // Redirect to dashboard
    } catch (err: any) {
      setError(err.message || "Failed to book service");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <h2 className="text-lg font-bold text-stone-900">Confirm Booking</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Summary */}
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-stone-500">Service</span>
                <span className="font-semibold text-stone-900">{service.title}</span>
              </div>
              <div>
                <span className="block text-stone-500">Guruba</span>
                <span className="font-semibold text-stone-900">{guruba.profiles?.full_name}</span>
              </div>
              <div>
                <span className="block text-stone-500">Price</span>
                <span className="font-semibold text-saffron-600">${service.base_price}</span>
              </div>
              <div>
                <span className="block text-stone-500">Duration</span>
                <span className="font-medium text-stone-900">{service.duration_minutes} mins</span>
              </div>
            </div>
          </div>

          {/* Gotra Check Alert */}
          {isGotraConflict ? (
            <div className="flex items-start gap-3 rounded-md bg-red-50 p-4 text-red-800 border border-red-200">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Gotra Conflict Detected</p>
                <p className="mt-1">
                  Your Gotra ({userGotra}) is the same as the Guruba's ({gurubaGotra}). 
                  According to tradition, this may not be permissible for certain rituals.
                </p>
              </div>
            </div>
          ) : (
             <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
                <CheckCircle className="h-4 w-4" />
                <span>Gotra Check Passed (You: {userGotra || 'N/A'}, Guru: {gurubaGotra || 'N/A'})</span>
             </div>
          )}

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Date</label>
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
              <label className="text-sm font-medium text-stone-700">Time</label>
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

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              isLoading={loading}
              disabled={!!isGotraConflict} // Disable if conflict
            >
              Confirm Booking
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};