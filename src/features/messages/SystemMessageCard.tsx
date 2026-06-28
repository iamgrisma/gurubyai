import React, { useState } from 'react';
import { Booking, Message } from '../../types';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, CheckCircle, XCircle, Video, Save } from 'lucide-react';
import { format } from 'date-fns';

interface SystemMessageCardProps {
    message: Message;
    booking: Booking;
    isClient: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onProposeNewTime?: () => void;
    onComplete?: () => void;
    onAddLink?: (link: string) => Promise<void>;
}

export const SystemMessageCard: React.FC<SystemMessageCardProps> = ({ 
    message, 
    booking, 
    isClient, 
    onAccept, 
    onDecline, 
    onProposeNewTime,
    onComplete,
    onAddLink
}) => {
    const [isEditingLink, setIsEditingLink] = useState(false);
    const [linkInput, setLinkInput] = useState(booking.meeting_link || '');
    
    // Determine the state based on the booking
    const isPending = booking.status === 'pending' || booking.status === 'awaiting_client_confirmation';
    const isConfirmed = booking.status === 'confirmed';
    const isCancelled = booking.status === 'cancelled';
    const isCompleted = booking.status === 'completed';

    const handleSaveLink = async () => {
        if (!linkInput.startsWith('http') && !linkInput.startsWith('wa.me')) {
            alert("Please enter a valid URL (starting with http://, https://, or wa.me/)");
            return;
        }
        if (onAddLink) {
            await onAddLink(linkInput);
            setIsEditingLink(false);
        }
    };

    return (
        <div className="flex justify-center my-6 w-full">
            <div className="bg-white border-2 border-saffron-200 rounded-2xl p-5 shadow-lg max-w-sm w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-saffron-400 to-orange-500"></div>
                
                <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-stone-900 font-outfit">Booking Update</h4>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isPending ? 'bg-orange-100 text-orange-700' :
                        isConfirmed ? 'bg-green-100 text-green-700' :
                        isCompleted ? 'bg-blue-100 text-blue-700' :
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
                    {(booking.proposed_time || booking.scheduled_at) && (
                        <div className="flex items-center gap-2 text-saffron-700 font-medium">
                            <Clock className="h-4 w-4 text-saffron-500" />
                            <span>
                                Time: {new Date(booking.scheduled_at || booking.proposed_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
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
                                    {onProposeNewTime && (
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

                {isConfirmed && (
                    <div className="pt-4 border-t border-stone-100 flex flex-col gap-3">
                        {isClient ? (
                            booking.is_online ? (
                                <a href={`/room/${booking.id}`} className="w-full block">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                                        <Video className="h-4 w-4" /> Join Video Call
                                    </Button>
                                </a>
                            ) : null
                        ) : (
                            <div className="flex flex-col gap-3 w-full">
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200" onClick={onDecline}>
                                        <XCircle className="h-4 w-4 mr-1" /> Cancel
                                    </Button>
                                    {onComplete && (
                                        <Button 
                                            className="flex-1 bg-green-600 text-white hover:bg-green-500 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed" 
                                            onClick={onComplete}
                                            disabled={!!booking.scheduled_at && new Date(booking.scheduled_at) > new Date()}
                                            title={!!booking.scheduled_at && new Date(booking.scheduled_at) > new Date() ? "Cannot mark as completed before the scheduled time" : ""}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-1" /> Complete
                                        </Button>
                                    )}
                                </div>

                                {/* Meeting Link Manager - Native WebRTC */}
                                {booking.is_online && (
                                    <div className="mt-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                <span className="truncate text-stone-600 max-w-[180px] block">
                                                    Secure Native Video Call
                                                </span>
                                            </div>
                                            <a href={`/room/${booking.id}`} className="text-[10px] bg-blue-600 text-white hover:bg-blue-700 px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors">
                                                <Video className="h-3 w-3" /> Join Call
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
