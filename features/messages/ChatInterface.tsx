
// features/messages/ChatInterface.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { Message, UserProfile, Booking } from '../../types';
import { Send, User, CheckCheck, MessageSquare, Clock, EyeOff, Trash2, RefreshCw, Calendar, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { useBookings, useProfile, useUpdateBookingStatus } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';

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

  const { data: currentUserProfile } = useProfile(user?.id);
  const isClient = currentUserProfile?.role === 'client';

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
    if (!user || !activeConversation) return;
    const channel = supabase.channel(`chat:${activeConversation}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
           queryClient.invalidateQueries({ queryKey: ['messages', user.id, activeConversation] });
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

  const activeBooking = allBookings.find(b => {
      if (b.status === 'completed' || b.status === 'cancelled') return false;
      // Match conversation partner
      if (isClient) {
          return b.gurubas?.profiles?.id === activeConversation || b.gurubas?.user_id === activeConversation;
      } else {
          return b.user_id === activeConversation;
      }
  });

  const handleBookingAction = (bookingId: string, action: string, proposed?: string) => {
      if (action === 'propose_new_time') {
          // Logic handled by state
      } else if (action === 'confirm_proposal') {
          updateStatusMutation.mutate({ id: bookingId, status: 'confirmed' });
          // Need to update time? currently API doesn't support changing scheduled_at in status update mutation easily
          // We should use a custom update
          if (proposed) {
             supabase.from('bookings').update({ scheduled_at: proposed, status: 'confirmed' }).eq('id', bookingId).then(() => {
                 queryClient.invalidateQueries({ queryKey: ['bookings'] });
             });
          }
      } else {
          updateStatusMutation.mutate({ id: bookingId, status: action });
      }
  };

  const submitProposal = async () => {
      if (!activeBooking || !proposedTime) return;
      await supabase.from('bookings').update({ 
          status: 'awaiting_client_confirmation',
          proposed_time: proposedTime,
          confirmation_deadline: new Date(Date.now() + 3600000).toISOString()
      }).eq('id', activeBooking.id);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setIsProposing(false);
      setProposedTime('');
  };

  // --- Send Message ---
  const sendMessageMutation = useMutation({
      mutationFn: async () => {
          if (!user || !activeConversation || !newMessage.trim()) return;
          await supabase.from('messages').insert({
              sender_id: user.id,
              receiver_id: activeConversation,
              content: newMessage.trim(),
              retention_hours: retentionHours
          });
      },
      onSuccess: () => {
          setNewMessage('');
          queryClient.invalidateQueries({ queryKey: ['messages', user?.id, activeConversation] });
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
                        <div className="relative">
                            <button onClick={() => setShowRetentionMenu(!showRetentionMenu)} className={`p-2 rounded-full transition-colors flex items-center gap-2 ${retentionHours ? 'bg-red-50 text-red-600' : 'hover:bg-stone-100 text-stone-400'}`}>
                                {retentionHours ? <EyeOff className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                            </button>
                            {showRetentionMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-20">
                                    <p className="px-4 py-2 text-xs font-bold text-stone-400 uppercase">Vanish Mode</p>
                                    {[1, 24, 120].map(h => <button key={h} onClick={() => { setRetentionHours(h); setShowRetentionMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50">{h} Hours</button>)}
                                    <button onClick={() => { setRetentionHours(undefined); setShowRetentionMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 text-stone-500">Off</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Booking Action Card */}
                    {activeBooking && (
                        <div className="bg-saffron-50 border-b border-saffron-100 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-sm text-saffron-900 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    <strong>{activeBooking.services?.title}</strong>: 
                                    {activeBooking.status === 'pending' ? ' Requested for ' : 
                                     activeBooking.status === 'awaiting_client_confirmation' ? ' New Time Proposed: ' : 
                                     ' Scheduled: '}
                                    {activeBooking.status === 'awaiting_client_confirmation' 
                                      ? new Date(activeBooking.proposed_time!).toLocaleString()
                                      : new Date(activeBooking.scheduled_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {activeBooking.status === 'pending' && !isClient && (
                                    <>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-8" onClick={() => handleBookingAction(activeBooking.id, 'confirmed')}>Accept</Button>
                                        <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => setIsProposing(true)}>Propose Time</Button>
                                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8" onClick={() => handleBookingAction(activeBooking.id, 'cancelled')}>Decline</Button>
                                    </>
                                )}
                                {activeBooking.status === 'awaiting_client_confirmation' && isClient && (
                                    <>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-8" onClick={() => handleBookingAction(activeBooking.id, 'confirm_proposal', activeBooking.proposed_time)}>Confirm</Button>
                                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8" onClick={() => handleBookingAction(activeBooking.id, 'cancelled')}>Reject</Button>
                                    </>
                                )}
                                {activeBooking.status === 'confirmed' && (
                                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Confirmed</span>
                                )}
                            </div>
                        </div>
                    )}

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
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
                        {filteredMessages.map((msg, idx) => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <div key={msg.id || idx} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm relative ${isMe ? 'bg-saffron-600 text-white rounded-tr-none' : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'}`}>
                                        <p className="text-sm leading-relaxed pr-4">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-saffron-200' : 'text-stone-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            {isMe && <CheckCheck className={`h-3 w-3 ${msg.is_read ? 'text-blue-300' : 'opacity-70'}`} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
