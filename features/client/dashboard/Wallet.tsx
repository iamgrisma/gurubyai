
// features/client/dashboard/Wallet.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthProvider';
import { Transaction, UserProfile } from '../../../types';
import { CreditCard, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface WalletProps {
    profile: UserProfile | null;
}

export const DashboardWallet: React.FC<WalletProps> = ({ profile }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            return data as Transaction[] || [];
        },
        enabled: !!user?.id
    });

    const topupMutation = useMutation({
        mutationFn: async (amount: number) => {
            if (!user) return;
            const { error } = await supabase.from('topup_requests').insert({
                user_id: user.id,
                amount: amount,
                status: 'pending'
            });
            if (error) throw error;
        },
        onSuccess: () => {
            alert("Top-up request sent! Admin will review shortly.");
            setIsTopupModalOpen(false);
            setTopupAmount('');
        },
        onError: (e: any) => {
            alert("Failed to send request: " + e.message);
        }
    });

    const handleTopup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topupAmount || isNaN(Number(topupAmount))) return;
        topupMutation.mutate(Number(topupAmount));
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-stone-900">Wallet</h2>
            <div className="w-full max-w-md h-56 bg-gradient-to-br from-stone-800 to-stone-950 rounded-3xl p-8 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-start relative z-10">
                    <span className="text-stone-400 font-medium tracking-wider">Available Credits</span>
                    <CreditCard className="h-8 w-8 opacity-80" />
                </div>
                <div className="relative z-10">
                    <span className="text-4xl font-bold tracking-tight">{profile?.credits || 0}</span>
                    <span className="text-sm text-stone-400 ml-2">CR</span>
                </div>
                <div className="flex justify-between items-end relative z-10">
                        <div className="flex flex-col">
                            <span className="text-xs text-stone-400 uppercase mb-1">Account</span>
                            <span className="font-medium tracking-wide uppercase">{displayName}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <button onClick={() => setIsTopupModalOpen(true)} className="text-xs bg-white/20 px-3 py-1.5 rounded hover:bg-white/30 transition-colors font-bold flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Request Top-up
                            </button>
                        </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                    <h3 className="font-bold text-lg">Transaction History</h3>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-500 font-medium text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Description</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-stone-500">No transactions yet.</td></tr>
                        ) : (
                            transactions.map(t => (
                                <tr key={t.id} className="border-b border-stone-100 last:border-0">
                                    <td className="px-6 py-4 text-stone-500">{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium">{t.description}</td>
                                    <td className={`px-6 py-4 text-right font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-stone-900'}`}>
                                        {t.type === 'credit' ? '+' : '-'}{t.amount} CR
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isTopupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-stone-900 mb-4">Request Credit Top-up</h3>
                        <p className="text-sm text-stone-500 mb-4">Enter the amount of credits you wish to purchase. An admin will review your request.</p>
                        <form onSubmit={handleTopup}>
                            <input 
                                type="number" 
                                className="w-full border border-stone-300 rounded-lg p-2.5 mb-4 focus:ring-2 focus:ring-saffron-500 outline-none"
                                placeholder="Amount (e.g. 500)"
                                value={topupAmount}
                                onChange={e => setTopupAmount(e.target.value)}
                                required
                                min={1}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsTopupModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={topupMutation.isPending}>Send Request</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
