import React from 'react';
import { Message } from '../../types';
import { Clock, CheckCheck, MapPin, Calendar, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const isSystem = message.is_system;

  if (isSystem) {
    return (
      <div className="flex justify-center my-6">
        <div className="bg-stone-100 text-stone-600 px-4 py-2 rounded-full text-xs font-medium border border-stone-200">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${
        isOwn 
          ? 'bg-saffron-500 text-stone-900 rounded-tr-sm shadow-md' 
          : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm'
      }`}>
        <p className="text-sm leading-relaxed">{message.content}</p>
        
        {message.booking_id && (
            <div className={`mt-3 p-3 rounded-xl border text-xs ${isOwn ? 'bg-saffron-400/20 border-saffron-600/20' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-center gap-1 font-bold mb-1">
                    <Calendar className="h-3 w-3" /> Booking Reference
                </div>
                <div className="opacity-80">ID: {message.booking_id.substring(0,8)}...</div>
            </div>
        )}

        <div className={`flex items-center justify-end gap-1 mt-2 text-[10px] ${isOwn ? 'text-saffron-900/60' : 'text-stone-400'}`}>
          <Clock className="h-3 w-3" />
          <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isOwn && (
            <CheckCheck className={`h-3 w-3 ml-1 ${message.is_read ? 'text-stone-800' : 'opacity-50'}`} />
          )}
        </div>
      </div>
    </div>
  );
};
