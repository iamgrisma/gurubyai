// components/messaging/ConversationList.tsx

import React from 'react';
import { Conversation } from '../../types/messaging';
import { MessageCircle, User } from 'lucide-react';
import { formatDistanceToNow } from '../../lib/utils';

interface ConversationListProps {
    conversations: Conversation[];
    selectedUserId?: string;
    onSelectConversation: (userId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    selectedUserId,
    onSelectConversation,
}) => {
    return (
        <div className="h-full overflow-y-auto">
            {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-400 p-8">
                    <MessageCircle className="h-12 w-12 mb-4" />
                    <p className="text-sm text-center">No conversations yet</p>
                </div>
            ) : (
                <div className="divide-y divide-stone-200">
                    {conversations.map((conversation) => (
                        <button
                            key={conversation.other_user_id}
                            onClick={() => onSelectConversation(conversation.other_user_id)}
                            className={`w-full p-4 hover:bg-stone-50 transition-colors text-left ${selectedUserId === conversation.other_user_id ? 'bg-saffron-50' : ''
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="shrink-0">
                                    {conversation.other_user_avatar ? (
                                        <img
                                            src={conversation.other_user_avatar}
                                            alt={conversation.other_user_name}
                                            className="h-12 w-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-stone-200 flex items-center justify-center">
                                            <User className="h-6 w-6 text-stone-400" />
                                        </div>
                                    )}
                                    {conversation.unread_count > 0 && (
                                        <div className="absolute -mt-10 ml-8 h-5 w-5 rounded-full bg-saffron-600 text-white text-xs flex items-center justify-center font-bold">
                                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-stone-900 truncate">
                                            {conversation.other_user_name}
                                        </h3>
                                        <span className="text-xs text-stone-400 shrink-0 ml-2">
                                            {formatDistanceToNow(conversation.last_message_at)}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-sm truncate ${conversation.unread_count > 0
                                                ? 'text-stone-900 font-medium'
                                                : 'text-stone-500'
                                            }`}
                                    >
                                        {conversation.last_message}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
