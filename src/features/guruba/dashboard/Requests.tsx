"use client";


import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Booking } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Clock, DollarSign, Video, ListChecks, CheckCircle, Edit3, XCircle } from 'lucide-react';

interface RequestsProps {
  bookings: Booking[];
  handleBookingAction: (id: string, action: any) => void;
  handleAddLink: (id: string, link: string) => Promise<void>;
}

export const GurubaRequests: React.FC<RequestsProps> = ({ bookings, handleBookingAction, handleAddLink }) => {
  const queryClient = useQueryClient();
  
  // Local state for modals
  const [proposingBookingId, setProposingBookingId] = useState<string | null>(null);
  const [proposedTime, setProposedTime] = useState('');
  const [linkBookingId, setLinkBookingId] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState('');

  const handleProposeTime = async (bookingId: string) => {
      if (!proposedTime) return;
      try {
          const confirmationDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          await supabase.from('bookings').update({ 
              status: 'awaiting_client_confirmation',
              proposed_time: proposedTime,
              confirmation_deadline: confirmationDeadline
          }).eq('id', bookingId);
          
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          setProposingBookingId(null);
          setProposedTime('');
      } catch(e) {
          alert("Failed to propose time.");
      }
  };

  const saveLink = async () => {
      if (linkBookingId && meetingLink) {
          await handleAddLink(linkBookingId, meetingLink);
          setLinkBookingId(null);
          setMeetingLink('');
      }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <h2 className="text-2xl font-bold text-stone-900">Booking Requests & Schedule</h2>
        
        {/* Add Meeting Link Modal */}
        {linkBookingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4">Add Video Meeting Link</h3>
                    <p className="text-sm text-stone-500 mb-4">Paste your Google Meet or WhatsApp link here. The client will see a "Join" button.</p>
                    <input 
                        className="w-full border rounded-lg p-3 mb-4" 
                        placeholder="https://meet.google.com/..." 
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setLinkBookingId(null)}>Cancel</Button>
                        <Button onClick={saveLink}>Save Link</Button>
                    </div>
                </div>
            </div>
        )}

        {bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').length === 0 ? (
            <div className="bg-stone-50 rounded-2xl p-16 text-center border border-stone-200 border-dashed">
                <ListChecks className="h-12 w-12 mx-auto text-stone-300 mb-4" />
                <h3 className="text-lg font-medium text-stone-900">No Pending Requests</h3>
                <p className="text-stone-500 mt-2">New booking requests from clients will appear here.</p>
            </div>
        ) : (
            <div className="grid gap-6">
                {bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').map(b => (
                    <div key={b.id} className="bg-white rounded-2xl border border-stone-200 shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="flex flex-col md:flex-row justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm ${
                                        b.status === 'pending' ? 'bg-blue-600 shadow-blue-200' : 
                                        b.status === 'confirmed' ? 'bg-green-600 shadow-green-200' :
                                        'bg-purple-600 shadow-purple-200'
                                    }`}>
                                        {b.status === 'pending' ? 'New Request' : b.status === 'confirmed' ? 'Confirmed' : 'Negotiating'}
                                    </span>
                                    <span className="text-sm text-stone-500 font-medium">{new Date(b.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-stone-900 mb-2">{b.services?.title}</h3>
                                <div className="space-y-2 mt-4 bg-stone-50 p-4 rounded-xl">
                                    <div className="flex items-center gap-3">
                                       <div className="h-8 w-8 rounded-full bg-stone-200 overflow-hidden">
                                           <img src={b.profiles?.avatar_url || 'https://via.placeholder.com/40'} className="h-full w-full object-cover" />
                                       </div>
                                       <div className="flex-1">
                                           <p className="text-stone-900 font-bold">{b.profiles?.full_name}</p>
                                           {b.profiles?.phone && <p className="text-xs text-stone-500">{b.profiles.phone}</p>}
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                                        <p className="text-stone-600 flex items-center gap-2 col-span-2">
                                            <Clock className="h-4 w-4 text-stone-400" /> 
                                            {b.scheduled_at || b.proposed_time 
                                                ? new Date(b.scheduled_at || b.proposed_time || '').toLocaleString() 
                                                : 'Not scheduled'}
                                        </p>
                                        <p className="text-stone-600 flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-green-600" /> Pays <span className="font-bold text-green-700">{(b.platform_fee || b.services?.base_price || 0)} CR</span>
                                        </p>
                                        <p className="text-stone-600 flex items-center gap-2">
                                            <Video className="h-4 w-4 text-blue-500" /> Type: <span className="font-bold text-stone-700">{b.is_online ? 'Online' : 'Physical'}</span>
                                        </p>
                                    </div>
                                    {b.status === 'confirmed' && (
                                        <div className="mt-2 pt-2 border-t border-stone-200 flex items-center gap-2">
                                            <Video className="h-4 w-4 text-blue-500" />
                                            <span className="text-sm text-stone-600">Link: {b.meeting_link ? <a href={b.meeting_link} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">Open Link</a> : <span className="text-stone-400 italic">No link added</span>}</span>
                                            <button onClick={() => { setLinkBookingId(b.id); setMeetingLink(b.meeting_link || ''); }} className="ml-auto text-xs text-stone-500 hover:text-stone-900 border px-2 py-1 rounded">
                                                {b.meeting_link ? 'Edit' : 'Add'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {b.status === 'pending' ? (
                                <div className="flex flex-col justify-center gap-3 min-w-[180px]">
                                    <Button onClick={() => handleBookingAction(b.id, 'confirmed')} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base shadow-lg shadow-green-900/10">
                                        <CheckCircle className="h-5 w-5 mr-2" /> Accept
                                    </Button>
                                    
                                    {proposingBookingId === b.id ? (
                                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg animate-in fade-in">
                                            <label className="text-xs font-bold text-stone-500 mb-1 block">Proposed Time</label>
                                            <input 
                                                type="datetime-local" 
                                                className="w-full text-sm border rounded p-1 mb-2"
                                                value={proposedTime}
                                                onChange={e => setProposedTime(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleProposeTime(b.id)} className="flex-1 text-xs">Send</Button>
                                                <Button size="sm" variant="outline" onClick={() => setProposingBookingId(null)} className="flex-1 text-xs">Cancel</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button variant="secondary" onClick={() => setProposingBookingId(b.id)} className="w-full">
                                            <Edit3 className="h-4 w-4 mr-2" /> Propose Time
                                        </Button>
                                    )}

                                    <Button variant="outline" onClick={() => handleBookingAction(b.id, 'cancelled')} className="w-full border-red-200 text-red-600 hover:bg-red-50 py-3">
                                        <XCircle className="h-5 w-5 mr-2" /> Decline
                                    </Button>
                                </div>
                            ) : b.status === 'confirmed' ? (
                                <div className="flex flex-col justify-center gap-3 min-w-[180px]">
                                    <Button onClick={() => handleBookingAction(b.id, 'completed')} className="w-full">
                                        Mark Completed
                                    </Button>
                                    <Button variant="outline" onClick={() => handleBookingAction(b.id, 'cancelled')} className="w-full text-red-600">
                                        Cancel Booking
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col justify-center items-center min-w-[180px] bg-stone-50 rounded-xl p-4 text-center border border-stone-200 border-dashed">
                                    <Clock className="h-8 w-8 text-saffron-400 mb-2" />
                                    <p className="text-sm font-medium text-stone-600">Awaiting Client Confirmation</p>
                                    <p className="text-xs text-stone-400 mt-1">Proposed: {b.proposed_time ? new Date(b.proposed_time).toLocaleString() : 'N/A'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
