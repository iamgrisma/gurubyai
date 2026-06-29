import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { GurubaVerificationBadge } from '../../../components/shared/GurubaVerificationBadge';
import { ChevronDown, ChevronUp, MapPin, Quote, Calendar as CalendarIcon } from 'lucide-react';

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

    const pendingGurubas = users;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Verification Requests</h2>
                <p className="text-stone-500">Review and approve Guruba profiles.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 space-y-4">
                            {Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-24 bg-stone-100 animate-pulse rounded-2xl w-full"></div>
                            ))}
                        </div>
                    ) : pendingGurubas.length === 0 ? (
                        <div className="p-8 text-center text-stone-500">No pending verifications.</div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {pendingGurubas.map((u: any) => (
                                <div key={u.id} className="transition-colors">
                                    {/* Main Row */}
                                    <div 
                                        className="p-4 sm:p-6 hover:bg-stone-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                                        onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center text-yellow-700 font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
                                                {u.full_name?.charAt(0) || 'G'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-stone-900 text-lg group-hover:text-saffron-600 transition-colors">{u.full_name}</span>
                                                    <GurubaVerificationBadge isVerified={false} gurubaType={u.gurubas[0].guruba_type} />
                                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">Pending Review</span>
                                                </div>
                                                <div className="text-sm text-stone-500 flex items-center gap-2">
                                                    <span>{u.email}</span>
                                                    <span className="text-stone-300">•</span>
                                                    <span className="capitalize">{u.gurubas[0].guruba_type?.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-0 pt-4 sm:pt-0 border-stone-100" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <Button size="sm" variant="outline" onClick={() => verifyGurubaMutation.mutate({ userId: u.id, action: 'reject' })} className="flex-1 sm:flex-none text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 rounded-xl font-bold h-10 px-6">Reject</Button>
                                                <Button size="sm" onClick={() => verifyGurubaMutation.mutate({ userId: u.id, action: 'approve' })} className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 border-none rounded-xl font-bold h-10 px-6">Approve</Button>
                                            </div>
                                            <div className="p-2 bg-stone-100 rounded-full text-stone-400 sm:hidden">
                                                {expandedUserId === u.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedUserId === u.id && (
                                        <div className="bg-stone-50/50 p-4 sm:p-6 border-t border-stone-100 animate-in slide-in-from-top-2 duration-200">
                                            <div className="max-w-4xl space-y-4">
                                                <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                                                    <CalendarIcon className="h-4 w-4 text-saffron-500" />
                                                    <span suppressHydrationWarning>Submitted: {u.gurubas?.[0]?.verification_requested_at ? new Date(u.gurubas[0].verification_requested_at).toLocaleString() : 'N/A'}</span>
                                                </div>
                                                
                                                <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                                                    <Quote className="absolute top-4 right-4 h-12 w-12 text-stone-100" />
                                                    <span className="font-bold text-stone-400 text-xs uppercase tracking-wider mb-2 block relative z-10">Biography</span>
                                                    <p className="text-stone-700 leading-relaxed relative z-10">
                                                        {u.gurubas?.[0]?.bio || 'No biography provided by this applicant.'}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                                                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg shrink-0"><MapPin className="h-5 w-5" /></div>
                                                        <div>
                                                            <span className="font-bold text-stone-400 text-[10px] uppercase tracking-wider mb-0.5 block">Location</span>
                                                            <span className="text-stone-900 font-medium">{u.gurubas[0].location || u.address || 'Not specified'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                                                        <div className="p-2 bg-purple-50 text-purple-500 rounded-lg shrink-0">
                                                            <span className="font-bold text-lg font-mono">G</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-stone-400 text-[10px] uppercase tracking-wider mb-0.5 block">Gotra</span>
                                                            <span className="text-stone-900 font-medium">{u.gotra_id || 'Not selected'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
