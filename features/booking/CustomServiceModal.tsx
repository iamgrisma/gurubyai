import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, CheckCircle } from 'lucide-react';

interface CustomServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (customServiceId: string) => void;
}

export const CustomServiceModal: React.FC<CustomServiceModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(60);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title) {
            setError('Title is required');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('create_custom_service_request', {
                p_title: title,
                p_description: description || null,
                p_estimated_duration: duration,
            });
            if (rpcError) throw rpcError;
            if (data && onCreated) onCreated(data as string);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to create custom service');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
                    <h2 className="text-xl font-bold text-stone-900">Request Custom Service</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-800 p-2 rounded border border-red-200 text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Estimated Duration (minutes)</label>
                        <input
                            type="number"
                            min={1}
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="w-24 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500"
                        />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded hover:bg-stone-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-saffron-600 rounded hover:bg-saffron-700 transition flex items-center"
                        >
                            {loading ? (
                                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                </svg>
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Submit Request
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
