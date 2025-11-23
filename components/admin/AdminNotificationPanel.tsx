// components/admin/AdminNotificationPanel.tsx
import React from 'react';
import { useNotifications, useMarkNotificationRead } from '../../hooks/useMessaging';
import { useAuth } from '../../features/auth/AuthProvider';
import { formatDistanceToNow } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Check, Bell } from 'lucide-react';

export const AdminNotificationPanel: React.FC = () => {
    const { user } = useAuth();
    const { data: notifications = [] } = useNotifications(user?.id);
    const markRead = useMarkNotificationRead();

    const unread = notifications.filter((n) => !n.is_read);

    return (
        <section className="p-6 bg-white rounded-lg shadow-md border border-stone-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                Admin Notifications
                {unread.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                        {unread.length}
                    </span>
                )}
            </h2>

            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-stone-400">
                    <Bell className="h-12 w-12 mb-4" />
                    <p className="text-sm">No notifications yet.</p>
                </div>
            ) : (
                <ul className="divide-y divide-stone-200">
                    {notifications.map((n) => (
                        <li
                            key={n.id}
                            className={`p-4 flex items-start gap-3 hover:bg-stone-50 transition-colors ${!n.is_read ? 'bg-blue-50' : ''
                                }`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-stone-900">{n.title}</h3>
                                    <span className="text-xs text-stone-400">
                                        {formatDistanceToNow(n.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-stone-600">{n.message}</p>
                                {n.action_url && (
                                    <a
                                        href={n.action_url}
                                        className="text-xs text-saffron-600 hover:underline mt-1 inline-block"
                                    >
                                        View details →
                                    </a>
                                )}
                            </div>
                            {!n.is_read && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markRead.mutate(n.id)}
                                    className="shrink-0"
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};
