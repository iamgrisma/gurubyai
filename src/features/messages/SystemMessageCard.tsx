import React from 'react';
import { Booking, Message } from '../../types';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SystemMessageCardProps {
    message: Message;
    booking: Booking;
    isClient: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onProposeNewTime?: () => void;
}

export const SystemMessageCard: React.FC<SystemMessageCardProps> = ({ message, booking, isClient, onAccept, onDecline, onProposeNewTime }) => {
    
    // Determine the state based on the booking
    const isPending = booking.status === 'pending' || booking.status === 'awaiting_client_confirmation';
    const isConfirmed = booking.status === 'confirmed';
    const isCancelled = booking.status === 'cancelled';

    return (
        <div className="flex justify-center my-6 w-full">
            <div className="bg-white border-2 border-saffron-200 rounded-2xl p-5 shadow-lg max-w-sm w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-saffron-400 to-orange-500"></div>
                
                <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-stone-900 font-outfit">Booking Update</h4>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isPending ? 'bg-orange-100 text-orange-700' :
                        isConfirmed ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {booking.status.replace(/_/g, ' ')}
                    </span>
                </div>

                <div className="space-y-3 mb-5 text-sm text-stone-600">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-stone-400" />
                        <span>{booking.scheduled_at ? format(new Date(booking.scheduled_at), 'MMM dd, yyyy') : 'No Date Set'}</span>
                    </div>
                    {booking.proposed_time && (
                        <div className="flex items-center gap-2 text-saffron-700 font-medium">
                            <Clock className="h-4 w-4 text-saffron-500" />
                            <span>Proposed Time: {new Date(booking.proposed_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                </div>

                {isPending && (
                    <div className="pt-4 border-t border-stone-100 flex flex-col gap-2">
                        {isClient ? (
                            booking.status === 'awaiting_client_confirmation' ? (
                                <div className="flex gap-2 w-full">
                                    <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200" onClick={onDecline}>
                                        <XCircle className="h-4 w-4 mr-1" /> Decline
                                    </Button>
                                    <Button className="flex-1 bg-saffron-500 text-stone-900 hover:bg-saffron-400" onClick={onAccept}>
                                        <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center w-full text-xs text-stone-400 italic">
                                    Waiting for Guruba to accept...
                                </div>
                            )
                        ) : (
                            booking.status === 'pending' ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex gap-2 w-full">
                                        <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200" onClick={onDecline}>
                                            <XCircle className="h-4 w-4 mr-1" /> Decline
                                        </Button>
                                        <Button className="flex-1 bg-saffron-500 text-stone-900 hover:bg-saffron-400" onClick={onAccept}>
                                            <CheckCircle className="h-4 w-4 mr-1" /> Accept
                                        </Button>
                                    </div>
                                    {booking.is_custom_booking && onProposeNewTime && (
                                        <Button variant="outline" className="w-full text-saffron-700 border-saffron-200 hover:bg-saffron-50 flex items-center justify-center" onClick={onProposeNewTime}>
                                            <Clock className="h-4 w-4 mr-1" /> Propose New Time
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center w-full text-xs text-stone-400 italic">
                                    Waiting for client to confirm...
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
