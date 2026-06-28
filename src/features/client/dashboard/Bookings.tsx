// features/client/dashboard/Bookings.tsx

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabaseClient';
import { Booking } from '../../../types';
import { User, Video } from 'lucide-react';

interface BookingsProps {
  bookings: Booking[];
  setReviewModalData: (data: {id: string, gurubaId: string, gurubaName: string} | null) => void;
}

export const DashboardBookings: React.FC<BookingsProps> = ({ bookings, setReviewModalData }) => {
  const queryClient = useQueryClient();

  const handleBookingNegotiation = async (bookingId: string, action: 'accept' | 'decline', proposedTime?: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.gurubas?.user_id) return;

    try {
        if (action === 'accept') {
            if (!proposedTime) return;
            await supabase.from('bookings').update({ 
                status: 'confirmed',
                scheduled_at: proposedTime
            }).eq('id', bookingId);
            
            // Insert chat message
            await supabase.from('messages').insert([{
                sender_id: booking.user_id,
                receiver_id: booking.gurubas.user_id,
                content: "I have confirmed the proposed time. Looking forward to our session!",
                booking_id: bookingId,
                message_type: 'time_accepted'
            }]);

            // Insert notification for Guruba
            await supabase.from('notifications').insert([{
                user_id: booking.gurubas.user_id,
                title: 'Time Proposal Accepted',
                message: `Client accepted the proposed time for ${booking.services?.title}.`,
                notification_type: 'booking',
                action_url: '/guruba?tab=overview',
                metadata: { booking_id: bookingId }
            }]);
        } else {
            await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
            
            // Insert chat message
            await supabase.from('messages').insert([{
                sender_id: booking.user_id,
                receiver_id: booking.gurubas.user_id,
                content: "I have declined the proposed time.",
                booking_id: bookingId,
                message_type: 'time_rejected'
            }]);

            // Insert notification for Guruba
            await supabase.from('notifications').insert([{
                user_id: booking.gurubas.user_id,
                title: 'Time Proposal Declined',
                message: `Client declined the proposed time for ${booking.services?.title}.`,
                notification_type: 'booking',
                action_url: '/guruba?tab=overview',
                metadata: { booking_id: bookingId }
            }]);
        }
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch(e) {
        alert("Action failed");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'confirmed': return 'bg-green-100 text-green-800 ring-green-600/20';
        case 'completed': return 'bg-blue-100 text-blue-800 ring-blue-600/20';
        case 'cancelled': return 'bg-red-100 text-red-800 ring-red-600/20';
        case 'awaiting_client_confirmation': return 'bg-purple-100 text-purple-800 ring-purple-600/20';
        default: return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <h2 className="text-2xl font-bold text-stone-900">All Bookings</h2>
        <div className="grid gap-4">
            {bookings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <p className="text-stone-500">You haven't made any bookings yet.</p>
                </div>
            ) : (
                bookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row gap-6">
                        <div className="w-full lg:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                            <img src={booking.services?.image_url} className="w-full h-full object-cover" alt={booking.services?.title} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-stone-900">{booking.services?.title}</h3>
                                    <p className="text-sm text-stone-500 mt-1 flex items-center gap-2">
                                        <User className="h-4 w-4" /> {booking.gurubas?.profiles?.full_name} ({booking.gurubas?.location})
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ring-1 ring-inset ${getStatusColor(booking.status)}`}>
                                    {booking.status === 'awaiting_client_confirmation' ? 'Action Required' : booking.status}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 py-4 border-t border-stone-50">
                                <div>
                                    <p className="text-xs text-stone-400 uppercase">Date</p>
                                    <p className="font-medium">
                                        {booking.scheduled_at || booking.proposed_time
                                            ? new Date(booking.scheduled_at || booking.proposed_time || '').toLocaleDateString()
                                            : 'Awaiting scheduling'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 uppercase">Time</p>
                                    <p className="font-medium">
                                        {booking.scheduled_at || booking.proposed_time
                                            ? new Date(booking.scheduled_at || booking.proposed_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 uppercase">Fee</p>
                                    <p className="font-bold text-stone-900">{booking.platform_fee ?? 0} Credits</p>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end items-center">
                                {/* Video Link Button */}
                                {booking.status === 'confirmed' && booking.meeting_link && (
                                    <a href={booking.meeting_link} target="_blank" rel="noreferrer">
                                        <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                                            <Video className="h-4 w-4" /> Join Call
                                        </Button>
                                    </a>
                                )}
                                
                                {booking.status === 'awaiting_client_confirmation' && (
                                    <Button size="sm" onClick={() => handleBookingNegotiation(booking.id, 'accept', booking.proposed_time)} className="bg-green-600 hover:bg-green-700">
                                        Confirm New Time
                                    </Button>
                                )}
                                {booking.status === 'completed' && !booking.is_reviewed && (
                                    <Button size="sm" onClick={() => setReviewModalData({ id: booking.id, gurubaId: booking.guruba_id ?? '', gurubaName: booking.gurubas?.profiles?.full_name ?? '' })}>
                                        Write Review
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}
