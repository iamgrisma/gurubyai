
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { TopupRequest } from '../../../types';
import { CheckCircle, XCircle } from 'lucide-react';

export const AdminTopups: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
      queryKey: ['topupRequests'],
      queryFn: async () => {
          const { data } = await supabase
            .from('topup_requests')
            .select('*, profiles:user_id(full_name, email)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          return data as TopupRequest[] || [];
      }
  });

  const processTopup = useMutation({
      mutationFn: async ({ id, status, userId, amount }: { id: string, status: 'approved' | 'rejected', userId: string, amount: number }) => {
          // 1. Update Request Status
          const { error: reqError } = await supabase
            .from('topup_requests')
            .update({ status })
            .eq('id', id);
          if (reqError) throw reqError;

          if (status === 'approved') {
              // 2. Update User Balance
              const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
              const newBalance = (profile?.credits || 0) + amount;
              await supabase.from('profiles').update({ credits: newBalance }).eq('id', userId);

              // 3. Add Transaction Record
              await supabase.from('transactions').insert({
                  user_id: userId,
                  amount: amount,
                  type: 'credit',
                  description: 'Top-up Request Approved',
                  status: 'completed'
              });

              // 4. Notify User
              await supabase.from('notifications').insert({
                  user_id: userId,
                  title: 'Top-up Approved',
                  message: `Your request for ${amount} credits has been approved.`
              });
          } else {
              // Notify Rejection
              await supabase.from('notifications').insert({
                  user_id: userId,
                  title: 'Top-up Rejected',
                  message: `Your request for ${amount} credits was rejected.`
              });
          }
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['topupRequests'] });
          alert("Request processed successfully.");
      },
      onError: (e: any) => alert(e.message)
  });

  if (isLoading) return <div>Loading...</div>;

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div>
              <h2 className="text-2xl font-bold text-stone-900">Pending Top-up Requests</h2>
              <p className="text-stone-500">Approve or reject credit requests from users.</p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
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
                      {requests.length === 0 ? (
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
                                            onClick={() => processTopup.mutate({ id: req.id, status: 'rejected', userId: req.user_id, amount: req.amount })}
                                          >
                                              <XCircle className="h-4 w-4 mr-1" /> Reject
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => processTopup.mutate({ id: req.id, status: 'approved', userId: req.user_id, amount: req.amount })}
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
      </div>
  );
};
