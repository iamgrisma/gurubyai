"use client";

// features/messages/ChatInterface.tsx

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { Message, UserProfile, Booking } from '../../types';
import { Send, User, CheckCheck, MessageSquare, Clock, EyeOff, Trash2, RefreshCw, Calendar, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { useBookings, useProfile, useUpdateBookingStatus } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { MessageBubble } from './MessageBubble';
import { SystemMessageCard } from './SystemMessageCard';
import { useCall } from '../video/CallProvider';
import { Video } from 'lucide-react';

interface ChatInterfaceProps {
  defaultReceiverId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ defaultReceiverId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<string | null>(defaultReceiverId || null);
  const [newMessage, setNewMessage] = useState('');
  const [retentionHours, setRetentionHours] = useState<number | undefined>(120); // Vanish Mode (5 days default)
  const [showRetentionMenu, setShowRetentionMenu] = useState(false);
  const [proposedTime, setProposedTime] = useState('');
  const [isProposing, setIsProposing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const { data: currentUserProfile } = useProfile(user?.id);
  const isClient = pathname.startsWith('/client') || (currentUserProfile?.role === 'client' && !pathname.startsWith('/guruba'));

  const { initiateCall } = useCall();

  // --- Query: Fetch Conversations ---
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
      queryKey: ['conversations', user?.id],
      queryFn: async () => {
          if (!user) return [];
          // Fetch distinct interactions
          const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id);
          const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id);
          
          const ids = new Set([
              ...(sent?.map(x => x.receiver_id) || []),
              ...(received?.map(x => x.sender_id) || [])
          ]);
          if (defaultReceiverId) ids.add(defaultReceiverId);
          
          const uniqueIds = Array.from(ids);
          if (uniqueIds.length === 0) return [];

          const { data: profiles } = await supabase.from('profiles').select('*').in('id', uniqueIds);
          return (profiles || []) as UserProfile[];
      },
      enabled: !!user
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
      if (!activeConversation && conversations.length > 0) {
          setActiveConversation(conversations[0].id);
      }
  }, [conversations, activeConversation]);

  // --- Query: Fetch Messages for Active Conversation ---
  const { data: messages = [] } = useQuery({
      queryKey: ['messages', user?.id, activeConversation],
      queryFn: async () => {
          if (!user || !activeConversation) return [];
          const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeConversation}),and(sender_id.eq.${activeConversation},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
            
          if (data && data.length > 0) {
              const lastMsg = data[data.length - 1];
              setRetentionHours(lastMsg.retention_hours ?? 120);
              // Side effect: Mark read
              const unreadIds = data.filter(m => m.receiver_id === user.id && !m.is_read).map(m => m.id);
              if (unreadIds.length > 0) {
                  await supabase.from('messages').update({ is_read: true, seen_at: new Date().toISOString() }).in('id', unreadIds);
              }
          }
          return (data || []) as Message[];
      },
      enabled: !!user && !!activeConversation,
      refetchInterval: 5000
  });

  // --- Realtime Subscription ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`chat:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
           queryClient.invalidateQueries({ queryKey: ['messages', user.id, activeConversation] });
           queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeConversation, queryClient]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Booking Context Integration ---
  const { data: allBookings = [] } = useBookings(user?.id, isClient ? 'client' : 'guruba');
  const updateStatusMutation = useUpdateBookingStatus();

  // Find booking related to the active conversation user
  const activeBooking = allBookings.find(b => {
      if (b.status === 'completed' || b.status === 'cancelled') return false;
      
      if (isClient) {
          // If I'm client, finding a booking where guruba's USER ID matches active convo
          return b.gurubas?.user_id === activeConversation;
      } else {
          // If I'm Guruba, finding a booking where booking.user_id (client) matches active convo
          return b.user_id === activeConversation;
      }
  });

  const handleBookingAction = async (bookingId: string, action: string, proposed?: string) => {
      if (action === 'confirm_proposal') {
          // Client confirming Guruba's proposed time
          const updatePayload: any = { id: bookingId, status: 'confirmed' };
          if (proposed) {
              updatePayload.scheduled_at = proposed;
          }
          updateStatusMutation.mutate(updatePayload, {
              onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['messages', user?.id, activeConversation] });
              }
          });
      } else if (action === 'confirmed') {
          // Guruba accepting client's request
          const updatePayload: any = { id: bookingId, status: 'confirmed' };
          if (activeBooking && !activeBooking.scheduled_at && activeBooking.proposed_time) {
              updatePayload.scheduled_at = activeBooking.proposed_time;
          }
          updateStatusMutation.mutate(updatePayload, {
              onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['messages', user?.id, activeConversation] });
              }
          });
      } else if (action === 'cancelled') {
          // Decline/reject
          updateStatusMutation.mutate({ id: bookingId, status: 'cancelled' }, {
              onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['messages', user?.id, activeConversation] });
              }
          });
      } else if (action === 'completed') {
          updateStatusMutation.mutate({ id: bookingId, status: 'completed' }, {
              onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['messages', user?.id, activeConversation] });
              }
          });
      }
  };

  const submitProposal = async () => {
      if (!activeBooking || !proposedTime) return;

      const propDate = new Date(proposedTime);
      const now = new Date();
      const isToday = propDate.toDateString() === now.toDateString();
      
      if (propDate < now) {
          alert('Cannot propose a time in the past.');
          return;
      }
      
      if (isToday) {
          const currentMins = now.getHours() * 60 + now.getMinutes();
          if (currentMins >= 20 * 60) {
              alert('Bookings for today are closed after 8 PM.');
              return;
          }
          const selMins = propDate.getHours() * 60 + propDate.getMinutes();
          if (selMins <= currentMins + 60) {
              alert('Please select a time at least 1 hour from now.');
              return;
          }
      }

      await supabase.from('bookings').update({ 
          status: 'awaiting_client_confirmation',
          proposed_time: proposedTime,
          confirmation_deadline: new Date(Date.now() + 3600000).toISOString()
      }).eq('id', activeBooking.id);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['messages', user?.id, activeConversation] });

      setIsProposing(false);
      setProposedTime('');
  };

  // --- Send Message ---
  const sendMessageMutation = useMutation({
      mutationFn: async () => {
          if (!user || !activeConversation || !newMessage.trim()) return;
          const { error } = await supabase.from('messages').insert([{
            sender_id: user.id,
            receiver_id: activeConversation,
            content: newMessage.trim(),
            booking_id: activeBooking?.id || null
          }]);
          if (error) throw error;
      },
      onSuccess: () => {
          setNewMessage('');
          queryClient.invalidateQueries({ queryKey: ['messages', user?.id, activeConversation] });
      },
      onError: (err: any) => {
          alert("Failed to send message: " + err.message);
      }
  });

  const getActiveUser = () => conversations.find(c => c.id === activeConversation);
  const isMessageExpired = (msg: Message) => {
      if (!msg.retention_hours || !msg.seen_at) return false;
      return new Date().getTime() > new Date(msg.seen_at).getTime() + (msg.retention_hours * 3600000);
  };
  const filteredMessages = messages.filter(m => !isMessageExpired(m));

  if (conversationsLoading) return <div className="flex h-[600px] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-stone-400"/></div>;

  return (
    <div className="flex h-[600px] bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-stone-100 flex flex-col bg-stone-50 hidden md:flex">
            <div className="p-4 border-b border-stone-100 bg-white">
                <h3 className="font-bold text-stone-900">Messages</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400 p-6 text-center">
                        <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm italic">No conversations yet.</p>
                    </div>
                ) : (
                    conversations.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveConversation(c.id)}
                            className={`w-full p-4 flex items-center gap-3 transition-colors ${
                                activeConversation === c.id ? 'bg-white border-l-4 border-l-saffron-500 shadow-sm' : 'hover:bg-stone-100 border-l-4 border-l-transparent'
                            }`}
                        >
                            <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                                {c.avatar_url ? <img src={c.avatar_url} className="h-full w-full object-cover" alt="" /> : <User className="h-5 w-5 text-stone-400" />}
                            </div>
                            <div className="text-left overflow-hidden flex-1">
                                <p className="font-bold text-sm text-stone-900 truncate">{c.full_name}</p>
                                <p className="text-xs text-stone-500 truncate">View chat</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white relative">
            {activeConversation && getActiveUser() ? (
                <>
                    {/* Header */}
                    <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-white z-10 shadow-sm">
                        <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                                {getActiveUser()?.avatar_url ? <img src={getActiveUser()?.avatar_url} className="h-full w-full object-cover" alt="" /> : <User className="h-4 w-4 text-stone-400" />}
                             </div>
                             <div>
                                 <p className="font-bold text-sm text-stone-900">{getActiveUser()?.full_name}</p>
                                 <p className="text-xs text-green-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-600"></span> Online</p>
                             </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                    const activeUser = getActiveUser();
                                    if (activeUser) {
                                        initiateCall(activeUser.id, activeUser.full_name || 'User', activeUser.avatar_url);
                                    }
                                }}
                             >
                                <Video className="h-4 w-4 mr-1.5" /> Call
                             </Button>
                        </div>
                    </div>

                    {/* Propose Time Modal Inline */}
                    {isProposing && (
                        <div className="absolute top-16 left-0 right-0 bg-white p-4 border-b shadow-md z-20 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4 text-saffron-600"/> <span className="text-sm font-bold">Propose New Time</span>
                            </div>
                            <input type="datetime-local" className="w-full border rounded p-2 text-sm mb-2" value={proposedTime} onChange={e => setProposedTime(e.target.value)} />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setIsProposing(false)}>Cancel</Button>
                                <Button size="sm" onClick={submitProposal}>Send Proposal</Button>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 bg-stone-50/50">
                        {/* Active Booking Action Card */}
                        {activeBooking && (
                            <div className="mb-4">
                                <SystemMessageCard 
                                    message={{ id: 'system', sender_id: 'system', receiver_id: user?.id || '', content: '', created_at: new Date().toISOString(), is_read: true, message_type: 'text' }}
                                    booking={activeBooking} 
                                    isClient={isClient}
                                    onAccept={() => handleBookingAction(activeBooking.id, activeBooking.status === 'awaiting_client_confirmation' ? 'confirm_proposal' : 'confirmed')}
                                    onDecline={() => handleBookingAction(activeBooking.id, 'cancelled')}
                                    onProposeNewTime={() => setIsProposing(true)}
                                    onComplete={() => handleBookingAction(activeBooking.id, 'completed')}
                                    onAddLink={async (link) => {
                                        const { error } = await supabase.from('bookings').update({ meeting_link: link }).eq('id', activeBooking.id);
                                        if (error) {
                                            alert("Failed to update meeting link");
                                        } else {
                                            queryClient.invalidateQueries({ queryKey: ['bookings'] });
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {filteredMessages.map((msg, idx) => (
                            <MessageBubble 
                                key={msg.id || idx} 
                                message={msg} 
                                isOwn={msg.sender_id === user?.id} 
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-stone-100">
                        <form onSubmit={(e) => { e.preventDefault(); sendMessageMutation.mutate(); }} className="flex items-center gap-2">
                            <input 
                                type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..."
                                className="flex-1 rounded-full border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-saffron-500 focus:ring-saffron-500 focus:bg-white transition-all"
                            />
                            <button type="submit" disabled={!newMessage.trim()} className="h-10 w-10 bg-saffron-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-saffron-700 disabled:opacity-50 transition-all">
                                <Send className="h-4 w-4 ml-0.5" />
                            </button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-400 bg-stone-50/30">
                    <MessageSquare className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-medium text-stone-500">Select a conversation</p>
                </div>
            )}
        </div>
    </div>
  );
};
