// features/messaging/MessagingPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useConversations, useMessages, useSendMessage, useMarkAllMessagesRead } from '../../hooks/useMessaging';
import { ConversationList } from '../../components/messaging/ConversationList';
import { MessageList } from '../../components/messaging/MessageList';
import { MessageInput } from '../../components/messaging/MessageInput';
import { ArrowLeft, User } from 'lucide-react';

export const MessagingPage: React.FC = () => {
    const { user } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isMobileView, setIsMobileView] = useState(false);

    const { data: conversations = [] } = useConversations(user?.id);
    const { data: messages = [] } = useMessages(selectedUserId || undefined);
    const sendMessage = useSendMessage();
    const markAllRead = useMarkAllMessagesRead();

    const selectedConversation = conversations.find(
        (c) => c.other_user_id === selectedUserId
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (selectedUserId && messages.length > 0) {
            const unreadMessages = messages.filter(
                (m) => m.receiver_id === user?.id && !m.is_read
            );
            if (unreadMessages.length > 0) {
                markAllRead.mutate(selectedUserId);
            }
        }
    }, [selectedUserId, messages, user?.id]);

    const handleSendMessage = (content: string) => {
        if (!selectedUserId) return;
        sendMessage.mutate({
            receiverId: selectedUserId,
            content,
        });
    };

    const handleSelectConversation = (userId: string) => {
        setSelectedUserId(userId);
        if (isMobileView) {
            // On mobile, show the conversation view
        }
    };

    const handleBack = () => {
        setSelectedUserId(null);
    };

    const showConversationList = !isMobileView || !selectedUserId;
    const showMessageView = !isMobileView || selectedUserId;

    return (
        <div className="h-screen flex flex-col bg-stone-50">
            {/* Header */}
            <div className="bg-white border-b border-stone-200 px-6 py-4">
                <h1 className="text-2xl font-bold text-stone-900">Messages</h1>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Conversation List */}
                {showConversationList && (
                    <div
                        className={`bg-white border-r border-stone-200 ${isMobileView ? 'w-full' : 'w-80'
                            }`}
                    >
                        <ConversationList
                            conversations={conversations}
                            selectedUserId={selectedUserId || undefined}
                            onSelectConversation={handleSelectConversation}
                        />
                    </div>
                )}

                {/* Message View */}
                {showMessageView && (
                    <div className="flex-1 flex flex-col bg-white">
                        {selectedUserId ? (
                            <>
                                {/* Chat Header */}
                                <div className="border-b border-stone-200 p-4 flex items-center gap-3">
                                    {isMobileView && (
                                        <button
                                            onClick={handleBack}
                                            className="p-2 hover:bg-stone-100 rounded-lg"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>
                                    )}
                                    <div className="flex items-center gap-3 flex-1">
                                        {selectedConversation?.other_user_avatar ? (
                                            <img
                                                src={selectedConversation.other_user_avatar}
                                                alt={selectedConversation.other_user_name}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center">
                                                <User className="h-5 w-5 text-stone-400" />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="font-semibold text-stone-900">
                                                {selectedConversation?.other_user_name || 'User'}
                                            </h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <MessageList messages={messages} />

                                {/* Input */}
                                <MessageInput
                                    onSend={handleSendMessage}
                                    disabled={sendMessage.isPending}
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-stone-400">
                                <div className="text-center">
                                    <User className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                                    <p className="text-lg font-medium">Select a conversation</p>
                                    <p className="text-sm mt-2">Choose a conversation to start messaging</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
