
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { Message } from '../../types';
import { Send, User, MoreVertical, CheckCheck, MessageSquare, Clock, EyeOff } from 'lucide-react';

interface ChatInterfaceProps {
  defaultReceiverId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ defaultReceiverId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(defaultReceiverId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [retentionHours, setRetentionHours] = useState<number | undefined>(undefined); // Vanish Mode
  const [showRetentionMenu, setShowRetentionMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
      // Realtime subscription
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user?.id}`
        }, (payload) => {
             // If the message is from the person we are currently chatting with, append it
             if (payload.new.sender_id === activeConversation) {
                setMessages(prev => [...prev, payload.new as Message]);
             }
             // Always refresh conversations to update unread indicators or move thread to top
             fetchConversations(); 
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); }
    }
  }, [activeConversation]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
        // Fetch all unique interactions. 
        const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id);
        const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id);
        
        const ids = new Set([
            ...(sent?.map(x => x.receiver_id) || []),
            ...(received?.map(x => x.sender_id) || [])
        ]);
        
        if (defaultReceiverId) ids.add(defaultReceiverId);

        const uniqueIds = Array.from(ids);

        if (uniqueIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', uniqueIds);
            setConversations(profiles || []);
            
            if (!activeConversation && profiles && profiles.length > 0) {
                setActiveConversation(profiles[0].id);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
      if (!user) return;
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);

      // Mark messages as read
      if (data && data.length > 0) {
        const unreadIds = data
            .filter((m: Message) => m.receiver_id === user.id && !m.is_read)
            .map((m: Message) => m.id);
            
        if (unreadIds.length > 0) {
            await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        }
      }
  };

  const sendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !activeConversation || !newMessage.trim()) return;

      const msgContent = newMessage.trim();
      const receiverId = activeConversation;
      
      setNewMessage('');

      // Optimistic UI update
      const optimisticMsg: Message = {
          id: 'temp-' + Date.now(),
          sender_id: user.id,
          receiver_id: receiverId,
          content: msgContent,
          is_read: false,
          created_at: new Date().toISOString(),
          retention_hours: retentionHours
      };
      setMessages(prev => [...prev, optimisticMsg]);

      const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: msgContent,
          retention_hours: retentionHours
      });

      if (error) {
          console.error("Send failed", error);
          // Remove optimistic message on failure or show error
          alert("Failed to send message");
      }
  };

  const getActiveUser = () => conversations.find(c => c.id === activeConversation);

  const isMessageExpired = (msg: Message) => {
      if (!msg.retention_hours) return false;
      const created = new Date(msg.created_at).getTime();
      const now = new Date().getTime();
      const expiryTime = created + (msg.retention_hours * 60 * 60 * 1000);
      return now > expiryTime;
  };

  const filteredMessages = messages.filter(m => !isMessageExpired(m));

  if (loading) return <div className="p-8 text-center text-stone-500">Loading chats...</div>;

  return (
    <div className="flex h-[600px] bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden">
        {/* Sidebar List */}
        <div className="w-80 border-r border-stone-100 flex flex-col bg-stone-50">
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
                            <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                                    {c.avatar_url ? <img src={c.avatar_url} className="h-full w-full object-cover" alt="" /> : <User className="h-5 w-5 text-stone-400" />}
                                </div>
                                {/* Online indicator mock */}
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></span>
                            </div>
                            <div className="text-left overflow-hidden flex-1">
                                <p className="font-bold text-sm text-stone-900 truncate">{c.full_name}</p>
                                <p className="text-xs text-stone-500 truncate">Click to view chat</p>
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
                    <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-white z-10 shadow-sm">
                        <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                                {getActiveUser().avatar_url ? <img src={getActiveUser().avatar_url} className="h-full w-full object-cover" alt="" /> : <User className="h-4 w-4 text-stone-400" />}
                             </div>
                             <div>
                                 <p className="font-bold text-sm text-stone-900">{getActiveUser().full_name}</p>
                                 <p className="text-xs text-green-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-600"></span> Online</p>
                             </div>
                        </div>
                        
                        {/* Vanish Mode Settings */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowRetentionMenu(!showRetentionMenu)}
                                className={`p-2 rounded-full transition-colors ${retentionHours ? 'bg-red-50 text-red-600' : 'hover:bg-stone-100 text-stone-400'}`}
                                title="Vanish Mode / Message Retention"
                            >
                                {retentionHours ? <EyeOff className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                            </button>
                            {showRetentionMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-20">
                                    <p className="px-4 py-2 text-xs font-bold text-stone-400 uppercase">Auto-Delete After</p>
                                    {[1, 3, 6, 12, 24, 48, 120].map(h => (
                                        <button 
                                            key={h}
                                            onClick={() => { setRetentionHours(h); setShowRetentionMenu(false); }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-50 ${retentionHours === h ? 'text-saffron-600 font-bold' : 'text-stone-700'}`}
                                        >
                                            {h >= 24 ? `${h/24} Days` : `${h} Hours`}
                                        </button>
                                    ))}
                                    <div className="border-t border-stone-100 my-1"></div>
                                    <button 
                                        onClick={() => { setRetentionHours(undefined); setShowRetentionMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 text-stone-500"
                                    >
                                        Off (Keep Forever)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
                        {filteredMessages.map((msg, idx) => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                                        isMe ? 'bg-saffron-600 text-white rounded-tr-none' : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
                                    }`}>
                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-saffron-200' : 'text-stone-400'}`}>
                                            {msg.retention_hours && <EyeOff className="h-3 w-3 mr-1" />}
                                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            {isMe && (
                                                <CheckCheck className={`h-3 w-3 ${msg.is_read ? 'text-blue-300' : 'opacity-70'}`} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-stone-100">
                        {retentionHours && (
                            <div className="mb-2 text-xs text-center text-red-500 bg-red-50 p-1 rounded">
                                Vanish Mode On: Messages auto-delete after {retentionHours >= 24 ? `${retentionHours/24} days` : `${retentionHours} hours`}
                            </div>
                        )}
                        <form onSubmit={sendMessage} className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 rounded-full border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-saffron-500 focus:ring-saffron-500 focus:bg-white transition-all"
                            />
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim()}
                                className="h-10 w-10 bg-saffron-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-saffron-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                            >
                                <Send className="h-4 w-4 ml-0.5" />
                            </button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-400 bg-stone-50/30">
                    <MessageSquare className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-medium text-stone-500">Select a conversation</p>
                    <p className="text-sm opacity-60">Choose a contact from the sidebar to start chatting.</p>
                </div>
            )}
        </div>
    </div>
  );
};
