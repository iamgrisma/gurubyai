"use client";

// components/messaging/NotificationBell.tsx

import React, { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthProvider';
import { useNotifications } from '../../features/notifications/NotificationContext';
import { useMarkNotificationRead } from '../../hooks/useMessaging';
import { formatDistanceToNow } from '../../lib/utils';

import { useRouter, redirect } from "next/navigation";

export const NotificationBell: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const { notifications, unreadCount, markAsRead: markAsReadContext, markAllAsRead } = useNotifications();
    const markAsRead = useMarkNotificationRead();

    const handleNotificationClick = (notification: any) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }
        if (notification.action_url) {
            router.push(notification.action_url);
        }
        setIsOpen(false);
    };

    const getNotificationIcon = (type: string) => {
        const icons: Record<string, string> = {
            booking: '📅',
            payment: '💰',
            credit: '💳',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️',
            system: '🔔',
        };
        return icons[type] || '🔔';
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
                <Bell className="h-6 w-6 text-stone-600" />
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-stone-200 z-50 max-h-[600px] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-stone-200">
                            <h3 className="font-bold text-stone-900">Notifications</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-stone-100 rounded"
                            >
                                <X className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-stone-400">
                                    <Bell className="h-12 w-12 mb-4" />
                                    <p className="text-sm">No notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-100">
                                    {notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`w-full p-4 hover:bg-stone-50 transition-colors text-left ${!notification.is_read ? 'bg-blue-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-2xl shrink-0">
                                                    {getNotificationIcon(notification.notification_type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between mb-1">
                                                        <h4 className="font-semibold text-sm text-stone-900">
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.is_read && (
                                                            <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 ml-2 mt-1" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-stone-600 mb-2">
                                                        {notification.message}
                                                    </p>
                                                    <span className="text-xs text-stone-400">
                                                        {formatDistanceToNow(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-stone-200">
                            <button
                                onClick={() => {
                                    markAllAsRead();  // Use the optimized context method
                                    setIsOpen(false);
                                }}
                                className="w-full text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center justify-center gap-2"
                                disabled={unreadCount === 0}
                            >
                                <Check className="h-4 w-4" />
                                Mark all as read
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
