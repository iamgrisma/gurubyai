"use client";


import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { TopupRequest } from '../../../types';
import { CheckCircle, XCircle } from 'lucide-react';
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
            // showMessage is not available in this component context based on imports, using alert for now as per original code
            // Ideally we should use the MessageContext but I'll stick to the existing pattern or improve it if I see the hook usage.
            // The original code used alert.
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

            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-50 text-stone-600 font-semibold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Amount Requested</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-stone-500">Loading...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-stone-500">No pending requests.</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-stone-900">{req.profiles?.full_name}</p>
                                            <p className="text-xs text-stone-500">{req.profiles?.email}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-green-600">
                                            +{req.amount} CR
                                        </td>
                                        <td className="px-6 py-4 text-stone-500">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 hover:bg-red-50 border-red-200"
                                                    onClick={() => processTopup.mutate({ id: req.id, status: 'rejected' })}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => processTopup.mutate({ id: req.id, status: 'approved' })}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
