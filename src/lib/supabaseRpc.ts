// src/lib/supabaseRpc.ts
import { supabase } from '@/lib/supabaseClient';

export type NotificationPayload = {
    user_id: string; // recipient user id
    title: string;
    message: string;
    notification_type?: string; // e.g., 'booking', 'credit', 'verification'
    action_url?: string; // optional link when clicking the notification
};

/**
 * Calls the Supabase RPC `create_notification` to insert a row into the `notifications` table.
 * Ensure the RPC exists in your Supabase DB (see README for SQL).
 */
export async function createNotification(payload: NotificationPayload) {
    const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: payload.user_id,
        p_title: payload.title,
        p_message: payload.message,
        p_type: payload.notification_type ?? '',
        p_action_url: payload.action_url ?? '',
    });

    if (error) {
        console.error('[Notification RPC] failed:', error);
        throw error;
    }
    return data;
}
