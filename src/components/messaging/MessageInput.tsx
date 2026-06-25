"use client";

// components/messaging/MessageInput.tsx

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../ui/Button';

interface MessageInputProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend,
    disabled = false,
    placeholder = 'Type a message...',
}) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSend(message.trim());
            setMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="border-t border-stone-200 p-4 bg-white">
            <div className="flex items-end gap-2">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
                    style={{
                        minHeight: '40px',
                        height: 'auto',
                    }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                    }}
                />
                <Button
                    type="submit"
                    disabled={!message.trim() || disabled}
                    size="md"
                    className="shrink-0"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </form>
    );
};
