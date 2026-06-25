"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MessageBanner, MessageType } from '../ui/MessageBanner';

interface Message {
    type: MessageType;
    title?: string;
    content: ReactNode;
    actions?: { label: string; onClick: () => void }[];
}

interface MessageContextProps {
    showMessage: (msg: Omit<Message, 'onClose'>) => void;
    hideMessage: () => void;
}

const MessageContext = createContext<MessageContextProps | undefined>(undefined);

export const useMessage = (): MessageContextProps => {
    const ctx = useContext(MessageContext);
    if (!ctx) throw new Error('useMessage must be used within a MessageProvider');
    return ctx;
};

export const MessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [message, setMessage] = useState<Message | null>(null);

    const showMessage = (msg: Omit<Message, 'onClose'>) => {
        setMessage({ ...msg });
    };

    const hideMessage = () => {
        setMessage(null);
    };

    return (
        <MessageContext.Provider value={{ showMessage, hideMessage }}>
            {/* Render banner at top of the app, just above the main content */}
            {message && (
                <div className="fixed top-4 inset-x-0 flex justify-center z-50 px-4">
                    <MessageBanner
                        type={message.type}
                        title={message.title}
                        actions={message.actions}
                        onClose={hideMessage}
                    >
                        {message.content}
                    </MessageBanner>
                </div>
            )}
            {children}
        </MessageContext.Provider>
    );
};
