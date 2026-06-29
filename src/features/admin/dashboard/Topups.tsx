"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { TopupRequest } from '../../../types';
import { CheckCircle, XCircle, Calendar, ArrowUpRight } from 'lucide-react';
import { Pagination } from '../../../components/ui/Pagination';

const ITEMS_PER_PAGE = 10;

export const AdminTopups: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['topupRequests', page],
        queryFn: async () => {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, count, error } = await supabase
                .from('topup_requests')
                .select('*, profiles:user_id(full_name, email)', { count: 'exact' })
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return {
                requests: data as TopupRequest[] || [],
                total: count || 0
            };
        },
        placeholderData: keepPreviousData
    });

    const requests = data?.requests || [];
    const totalItems = data?.total || 0;

    const processTopup = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => {
            if (status === 'approved') {
                const { error } = await supabase.rpc('approve_topup_request', {
                    p_request_id: id
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.rpc('reject_topup_request', {
                    p_request_id: id
                });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['topupRequests'] });
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
        onError: (e: any) => {
            console.error(e);
            alert(e.message || "An error occurred");
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Pending Top-up Requests</h2>
                <p className="text-stone-500">Approve or reject credit requests from users.</p>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 space-y-4">
                            {Array(4).fill(0).map((_, i) => (
                                <div key={i} className="h-24 bg-stone-100 animate-pulse rounded-2xl w-full"></div>
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="p-8 text-center text-stone-500">No pending requests.</div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {requests.map(req => (
                                <div key={req.id} className="p-4 sm:p-6 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-green-700 font-bold shrink-0">
                                            <ArrowUpRight className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-900 text-lg">{req.profiles?.full_name}</p>
                                            <div className="flex items-center gap-2 text-sm text-stone-500">
                                                <span>{req.profiles?.email}</span>
                                                <span className="text-stone-300">•</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 pt-4 sm:pt-0 border-stone-100">
                                        <div className="flex flex-col sm:items-end">
                                            <span className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-0.5">Amount</span>
                                            <span className="font-mono font-bold text-green-600 text-xl">
                                                +{req.amount} CR
                                            </span>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 sm:flex-none text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 rounded-xl font-bold h-10 px-4"
                                                onClick={() => processTopup.mutate({ id: req.id, status: 'rejected' })}
                                            >
                                                <XCircle className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Reject</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 border-none rounded-xl font-bold h-10 px-4"
                                                onClick={() => processTopup.mutate({ id: req.id, status: 'approved' })}
                                            >
                                                <CheckCircle className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Approve</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <Pagination
                    currentPage={page}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setPage}
                />
            </div>
        </div>
    );
};
