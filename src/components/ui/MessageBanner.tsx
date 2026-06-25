import React from 'react';
import { X } from 'lucide-react';

export type MessageType = 'info' | 'success' | 'error';

interface MessageBannerProps {
    type?: MessageType;
    title?: string;
    children: React.ReactNode;
    actions?: { label: string; onClick: () => void }[];
    onClose?: () => void;
}

export const MessageBanner: React.FC<MessageBannerProps> = ({
    type = 'info',
    title,
    children,
    actions = [],
    onClose,
}) => {
    const bgColors: Record<MessageType, string> = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
    };

    const icon = {
        info: <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
        success: <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>,
        error: <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
    }[type];

    return (
        <div className={`border-l-4 p-4 rounded-md flex items-start space-x-3 ${bgColors[type]} animate-fade-in`}>
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1">
                {title && <div className="font-medium mb-1">{title}</div>}
                <div className="text-sm">{children}</div>
                {actions.length > 0 && (
                    <div className="mt-2 flex space-x-2">
                        {actions.map((a, i) => (
                            <button
                                key={i}
                                onClick={a.onClick}
                                className="px-3 py-1 text-xs font-medium rounded bg-white border border-gray-300 hover:bg-gray-50"
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {onClose && (
                <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
