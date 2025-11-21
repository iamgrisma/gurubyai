
import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { GurubaVerificationBadge } from '../../../components/shared/GurubaVerificationBadge';

export const AdminVerification: React.FC = () => {
  const queryClient = useQueryClient();

  // Re-fetch users here to ensure fresh data for this specific tab
  const { data: users = [], isLoading } = useQuery({
      queryKey: ['adminUsers'], // Share cache key
      queryFn: async () => {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
        const { data: gurubas } = await supabase.from('gurubas').select('user_id, is_verified, guruba_type');
        
        return profiles?.map(p => ({
            ...p,
            gurubas: gurubas?.filter(g => g.user_id === p.id) || []
        })) || [];
      }
  });

  const verifyGurubaMutation = useMutation({
      mutationFn: async ({ gurubaId, action }: { gurubaId: string, action: 'approve' | 'reject' }) => {
          if (action === 'approve') {
              const { error } = await supabase.from('gurubas').update({ is_verified: true }).eq('user_id', gurubaId);
              if (error) throw error;
          } else {
              // Reject logic
              const { error } = await supabase.from('gurubas').update({ is_verified: false }).eq('user_id', gurubaId);
              if (error) throw error;
          }
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
          queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      }
  });

  if (isLoading) return <div>Loading...</div>;

  const pendingGurubas = users.filter((u: any) => u.role === 'guruba' && u.gurubas?.[0] && !u.gurubas[0].is_verified);

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
                          <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-stone-900">{u.full_name}</td>
                              <td className="px-6 py-4 text-stone-600">{u.email}</td>
                              <td className="px-6 py-4">
                                  <GurubaVerificationBadge isVerified={true} gurubaType={u.gurubas[0].guruba_type} />
                                  <span className="text-xs ml-2 capitalize text-stone-500">{u.gurubas[0].guruba_type?.replace('_', ' ')}</span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                  <Button size="sm" variant="outline" onClick={() => verifyGurubaMutation.mutate({ gurubaId: u.id, action: 'reject' })} className="text-red-600 hover:bg-red-50 border-red-200">Reject</Button>
                                  <Button size="sm" onClick={() => verifyGurubaMutation.mutate({ gurubaId: u.id, action: 'approve' })} className="bg-green-600 hover:bg-green-700 border-none">Approve</Button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );
};
