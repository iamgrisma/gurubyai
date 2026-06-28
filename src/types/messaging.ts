// types/messaging.ts

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    booking_id?: string;
    content: string | null;
    message_type: 'text' | 'booking_created' | 'booking_confirmed' | 'booking_cancelled' |
    'booking_completed' | 'time_proposed' | 'time_accepted' | 'time_rejected' |
    'custom_service_requested' | 'payment_received' | 'credit_approved' | 'credit_rejected';
    metadata?: Record<string, any>;
    is_read: boolean;
    created_at: string;
    read_at?: string;
    sender?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    receiver?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

export interface Conversation {
    other_user_id: string;
    other_user_name: string;
    other_user_avatar?: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    notification_type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'payment' | 'credit' | 'system';
    action_url?: string;
    metadata?: Record<string, any>;
    is_read: boolean;
    created_at: string;
    read_at?: string;
}
