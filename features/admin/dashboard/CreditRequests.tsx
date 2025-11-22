// features/admin/dashboard/CreditRequests.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { useMessage } from '../../../components/ui/MessageContext';
import { CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface CreditRequest {
    id: string;
    user_id: string;
    requested_amount: number;
    status: string; // pending, approved, rejected
    admin_adjusted_amount: number | null;
    rejection_reason: string | null;
    created_at: string;
}

export const CreditRequests: React.FC = () => {
    const { showMessage } = useMessage();
    const queryClient = useQueryClient();

    // Fetch pending credit requests
    const { data: requests = [], isLoading } = useQuery<CreditRequest[]>({
        queryKey: ['creditRequests', 'pending'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('credit_requests')
                .select('*')
                .eq('status', 'pending');
            if (error) throw error;
            return data as CreditRequest[];
        },
        refetchOnWindowFocus: false,
    });

    // Approve mutation (calls RPC)
    const approveMutation = useMutation({
        mutationFn: async ({ requestId, newAmount }: { requestId: string; newAmount: number }) => {
            const { data, error } = await supabase.rpc('approve_credit_request', {
                p_request_id: requestId,
                p_new_amount: newAmount,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creditRequests', 'pending'] });
            showMessage({
                type: 'success',
                title: 'Credit Request Approved',
                content: 'The credit request has been approved.',
            });
        },
        onError: (err: any) => {
            showMessage({
                type: 'error',
                title: 'Approval Failed',
                content: err.message || 'Failed to approve credit request.',
            });
        },
    });

    // Reject mutation (calls RPC)
    const rejectMutation = useMutation({
        mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
            const { data, error } = await supabase.rpc('reject_credit_request', {
                p_request_id: requestId,
                p_reason: reason,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creditRequests', 'pending'] });
            showMessage({
                type: 'success',
                title: 'Credit Request Rejected',
                content: 'The credit request has been rejected.',
            });
        },
        onError: (err: any) => {
            showMessage({
                type: 'error',
                title: 'Rejection Failed',
                content: err.message || 'Failed to reject credit request.',
            });
        },
    });

    // Local UI state for modals
    const [approveId, setApproveId] = useState<string | null>(null);
    const [adjustedAmount, setAdjustedAmount] = useState<number>(0);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<string>('');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin h-6 w-6 text-saffron-600" /> Loading credit requests…
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Pending Credit Requests</h2>
            {requests.length === 0 ? (
                <p className="text-stone-500">No pending credit requests.</p>
            ) : (
                <table className="min-w-full bg-white border border-stone-200 rounded-lg overflow-hidden">
                    <thead className="bg-stone-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-stone-600">Requester</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-stone-600">Amount</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-stone-600">Created</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-stone-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.id} className="border-t border-stone-200">
                                <td className="px-4 py-2 text-sm text-stone-800">
                                    {req.user_id}
                                </td>
                                <td className="px-4 py-2 text-sm text-stone-800">
                                    {req.requested_amount} CR
                                </td>
                                <td className="px-4 py-2 text-sm text-stone-600">
                                    {new Date(req.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setApproveId(req.id);
                                            setAdjustedAmount(req.requested_amount);
                                        }}
                                        className="mr-2"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setRejectId(req.id);
                                            setRejectReason('');
                                        }}
                                    >
                                        <XCircle className="h-4 w-4 mr-1" /> Reject
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Approve Modal */}
            {approveId && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Approve Credit Request</h3>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            Adjusted Amount (CR)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={adjustedAmount}
                            onChange={(e) => setAdjustedAmount(Number(e.target.value))}
                            className="w-full rounded-md border border-stone-300 px-3 py-2 mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setApproveId(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    approveMutation.mutate({ requestId: approveId, newAmount: adjustedAmount });
                                    setApproveId(null);
                                }}
                                isLoading={approveMutation.isPending}
                            >
                                Approve
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectId && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Reject Credit Request</h3>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            Rejection Reason
                        </label>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full rounded-md border border-stone-300 px-3 py-2 mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setRejectId(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    rejectMutation.mutate({ requestId: rejectId, reason: rejectReason });
                                    setRejectId(null);
                                }}
                                isLoading={rejectMutation.isPending}
                            >
                                Reject
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
