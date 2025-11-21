// features/client/dashboard/Wallet.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthProvider';
import { Transaction, UserProfile } from '../../../types';
import { CreditCard } from 'lucide-react';

interface WalletProps {
    profile: UserProfile | null;
}

export const DashboardWallet: React.FC<WalletProps> = ({ profile }) => {
    const { user } = useAuth();
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            return data as Transaction[] || [];
        },
        enabled: !!user?.id
    });

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
                            <a href="mailto:admin@gurubaconnect.com" className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition-colors">
                                Request Top-up
                            </a>
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
        </div>
    );
}
