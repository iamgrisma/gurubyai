import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { GurubaVerificationBadge } from '../../../components/shared/GurubaVerificationBadge';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const AdminVerification: React.FC = () => {
    const queryClient = useQueryClient();
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

    // Re-fetch pending verification requests directly from the database
    const { data: users = [], isLoading } = useQuery({
        queryKey: ['adminVerificationRequests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gurubas')
                .select(`
                    *,
                    profiles:user_id (
                        *
                    )
                `)
                .eq('is_verified', false)
                .not('verification_requested_at', 'is', null);

            if (error) throw error;

            return (data || []).map((g: any) => ({
                ...g.profiles,
                gurubas: [g]
            }));
        }
    });

    const verifyGurubaMutation = useMutation({
        mutationFn: async ({ userId, action }: { userId: string, action: 'approve' | 'reject' }) => {
            if (action === 'approve') {
                const { error } = await supabase.from('gurubas').update({ is_verified: true }).eq('user_id', userId);
                if (error) throw error;
            } else {
                // Reject logic - Reset is_verified and verification_requested_at to null so they can request again
                const { error } = await supabase.from('gurubas').update({ 
                    is_verified: false,
                    verification_requested_at: null 
                }).eq('user_id', userId);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminVerificationRequests'] });
            queryClient.invalidateQueries({ queryKey: ['adminStats'] });
            queryClient.invalidateQueries({ queryKey: ['gurubaProfile'] });
        }
    });

    if (isLoading) return <div>Loading...</div>;

    // Only show users who are gurubas, NOT verified, AND have requested verification (already filtered by query)
    const pendingGurubas = users;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Verification Requests</h2>
                <p className="text-stone-500">Review and approve Guruba profiles.</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-50 text-stone-500 font-semibold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Guruba Name</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {pendingGurubas.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-stone-500">No pending verifications.</td></tr>
                        ) : pendingGurubas.map((u: any) => (
                            <React.Fragment key={u.id}>
                                <tr 
                                    className="hover:bg-stone-50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                                >
                                    <td className="px-6 py-4 font-medium text-stone-900 flex items-center gap-2">
                                        {expandedUserId === u.id ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                                        {u.full_name}
                                    </td>
                                    <td className="px-6 py-4 text-stone-600">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <GurubaVerificationBadge isVerified={false} gurubaType={u.gurubas[0].guruba_type} />
                                        <span className="text-xs ml-2 capitalize text-stone-500">{u.gurubas[0].guruba_type?.replace('_', ' ')}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                        <Button size="sm" variant="outline" onClick={() => verifyGurubaMutation.mutate({ userId: u.id, action: 'reject' })} className="text-red-600 hover:bg-red-50 border-red-200">Reject</Button>
                                        <Button size="sm" onClick={() => verifyGurubaMutation.mutate({ userId: u.id, action: 'approve' })} className="bg-green-600 hover:bg-green-700 border-none">Approve</Button>
                                    </td>
                                </tr>
                                {expandedUserId === u.id && (
                                    <tr className="bg-stone-50/50">
                                        <td colSpan={4} className="px-8 py-6 border-b border-stone-200">
                                            <div className="space-y-4 max-w-3xl">
                                                <div>
                                                    <h4 className="font-bold text-stone-800 text-sm">Guruba Profile Overview</h4>
                                                    <p suppressHydrationWarning className="text-xs text-stone-400 mt-0.5">Submitted: {u.gurubas?.[0]?.verification_requested_at ? new Date(u.gurubas[0].verification_requested_at).toLocaleString() : 'N/A'}</p>
                                                </div>
                                                
                                                <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                                                    <span className="font-bold text-stone-500 text-xs block uppercase tracking-wider mb-1">Biography</span>
                                                    <p className="text-stone-700 text-sm leading-relaxed italic">
                                                        {u.gurubas?.[0]?.bio ? `"${u.gurubas[0].bio}"` : 'No biography provided.'}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                                                        <span className="font-bold text-stone-500 text-xs block uppercase tracking-wider mb-1">Service Location</span>
                                                        <span className="text-stone-700 text-sm font-medium">{u.gurubas[0].location || u.address || 'Not specified'}</span>
                                                    </div>
                                                    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                                                        <span className="font-bold text-stone-500 text-xs block uppercase tracking-wider mb-1">Gotra</span>
                                                        <span className="text-stone-700 text-sm font-medium">{u.gotra_id || 'Not selected'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
