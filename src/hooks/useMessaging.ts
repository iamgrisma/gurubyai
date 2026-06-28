// hooks/useMessaging.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Message, Conversation, Notification } from '@/types/messaging';

// Fetch conversations
export const useConversations = (userId?: string) => {
    return useQuery({
        queryKey: ['conversations', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .order('last_message_at', { ascending: false });
            if (error) throw error;
            return data as Conversation[];
        },
        enabled: !!userId,
    });
};

// Fetch messages for a conversation
export const useMessages = (otherUserId?: string) => {
    return useQuery({
        queryKey: ['messages', otherUserId],
        queryFn: async () => {
            if (!otherUserId) return [];
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('messages')
                .select(`
          *,
          sender:sender_id(id, full_name, avatar_url),
          receiver:receiver_id(id, full_name, avatar_url)
        `)
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as Message[];
        },
        enabled: !!otherUserId,
        refetchInterval: 5000, // Poll every 5 seconds for new messages
    });
};

// Fetch messages for a booking
export const useBookingMessages = (bookingId?: string) => {
    return useQuery({
        queryKey: ['bookingMessages', bookingId],
        queryFn: async () => {
            if (!bookingId) return [];
            const { data, error } = await supabase
                .from('messages')
                .select(`
          *,
          sender:sender_id(id, full_name, avatar_url),
          receiver:receiver_id(id, full_name, avatar_url)
        `)
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as Message[];
        },
        enabled: !!bookingId,
        refetchInterval: 5000,
    });
};

// Fetch notifications
export const useNotifications = (userId?: string) => {
    return useQuery({
        queryKey: ['notifications', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as Notification[];
        },
        enabled: !!userId,
        refetchInterval: 10000, // Poll every 10 seconds
    });
};

// Fetch unread notification count
export const useUnreadNotificationCount = (userId?: string) => {
    return useQuery({
        queryKey: ['unreadNotifications', userId],
        queryFn: async () => {
            if (!userId) return 0;
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!userId,
        refetchInterval: 10000,
    });
};

// Send message mutation
export const useSendMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            receiverId,
            content,
            bookingId,
            messageType = 'text',
            metadata = {},
        }: {
            receiverId: string;
            content: string;
            bookingId?: string;
            messageType?: string;
            metadata?: Record<string, any>;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            const { data, error } = await supabase.from('messages').insert([{
                sender_id: user.id,
                receiver_id: receiverId,
                content: content,
                booking_id: bookingId || null,
                metadata: metadata || {}
            }]).select();
            
            if (error) {
                console.error("Message send error:", error);
                throw error;
            }
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['messages', variables.receiverId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            if (variables.bookingId) {
                queryClient.invalidateQueries({ queryKey: ['bookingMessages', variables.bookingId] });
            }
        },
    });
};

// Mark message as read
export const useMarkMessageRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (messageId: string) => {
            const { error } = await supabase.rpc('mark_message_read', {
                p_message_id: messageId,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
};

// Mark all messages from a sender as read
export const useMarkAllMessagesRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (senderId: string) => {
            const { error } = await supabase.rpc('mark_all_messages_read', {
                p_sender_id: senderId,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
};

// Mark notification as read
export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase.rpc('mark_notification_read', {
                p_notification_id: notificationId,
            });
            if (error) throw error;
        },
        onMutate: async (notificationId: string) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            await queryClient.cancelQueries({ queryKey: ['unreadNotifications'] });

            queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
                if (Array.isArray(old)) {
                    return old.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
                }
                return old;
            });
            
            queryClient.setQueriesData({ queryKey: ['unreadNotifications'] }, (old: any) => {
                if (typeof old === 'number' && old > 0) return old - 1;
                return old;
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
        },
    });
};

// Create booking message
export const useCreateBookingMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            bookingId,
            messageType,
            additionalData = {},
        }: {
            bookingId: string;
            messageType: string;
            additionalData?: Record<string, any>;
        }) => {
            const { data, error } = await supabase.rpc('create_booking_message', {
                p_booking_id: bookingId,
                p_message_type: messageType,
                p_additional_data: additionalData,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['bookingMessages', variables.bookingId] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

// Subscribe to new messages
export const useMessageSubscription = (userId: string, onNewMessage: (message: Message) => void) => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['messageSubscription', userId],
        queryFn: async () => {
            const channel = supabase
                .channel('messages')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `receiver_id=eq.${userId}`,
                    },
                    (payload) => {
                        onNewMessage(payload.new as Message);
                        queryClient.invalidateQueries({ queryKey: ['messages'] });
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        },
        enabled: !!userId,
    });
};

// Subscribe to new notifications
export const useNotificationSubscription = (userId: string, onNewNotification: (notification: Notification) => void) => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['notificationSubscription', userId],
        queryFn: async () => {
            const channel = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload) => {
                        onNewNotification(payload.new as Notification);
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });
                        queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        },
        enabled: !!userId,
    });
};
