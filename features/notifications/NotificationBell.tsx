
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from './NotificationContext';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      markAsRead(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden origin-top-right">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                <h3 className="font-bold text-stone-900">Notifications</h3>
                {unreadCount > 0 && (
                    <button onClick={() => markAllAsRead()} className="text-xs text-saffron-600 hover:text-saffron-700 font-medium">
                        Mark all read
                    </button>
                )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-sm">
                        No notifications yet.
                    </div>
                ) : (
                    <ul className="divide-y divide-stone-100">
                        {notifications.map((notification) => (
                            <li 
                                key={notification.id} 
                                className={`p-4 hover:bg-stone-50 transition-colors ${notification.is_read ? 'opacity-60' : 'bg-blue-50/30'}`}
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium text-stone-900 ${!notification.is_read ? 'font-bold' : ''}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-stone-400 mt-2">
                                            {new Date(notification.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <button 
                                            onClick={(e) => handleMarkRead(notification.id, e)}
                                            className="text-stone-300 hover:text-saffron-600 transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
