"use client";

// components/messaging/MessageList.tsx

import React, { useEffect, useRef } from 'react';
import { Message } from '../../types/messaging';
import { useAuth } from '../../features/auth/AuthProvider';
import { formatDistanceToNow } from '../../lib/utils';

interface MessageListProps {
    messages: Message[];
    onMessageVisible?: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onMessageVisible }) => {
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getMessageTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            booking_created: '📅 Booking Created',
            booking_confirmed: '✅ Booking Confirmed',
            booking_cancelled: '❌ Booking Cancelled',
            booking_completed: '🎉 Booking Completed',
            time_proposed: '🕐 Time Proposed',
            time_accepted: '✓ Time Accepted',
            time_rejected: '✗ Time Rejected',
            credit_approved: '💰 Credits Approved',
            credit_rejected: '💳 Credits Rejected',
        };
        return labels[type] || '';
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-stone-400">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            ) : (
                messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    const typeLabel = getMessageTypeLabel(message.message_type);

                    return (
                        <div
                            key={message.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                {typeLabel && (
                                    <div className="text-xs text-stone-500 mb-1 px-2">{typeLabel}</div>
                                )}
                                <div
                                    className={`rounded-2xl px-4 py-2 ${isOwn
                                            ? 'bg-saffron-600 text-white rounded-br-sm'
                                            : 'bg-stone-100 text-stone-900 rounded-bl-sm'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-1 px-2">
                                    <span className="text-xs text-stone-400">
                                        {formatDistanceToNow(message.created_at)}
                                    </span>
                                    {isOwn && message.is_read && (
                                        <span className="text-xs text-blue-500">✓✓</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};
