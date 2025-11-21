
// features/admin/dashboard/Users.tsx

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Search, PlusCircle } from 'lucide-react';
import { GurubaVerificationBadge } from '../../../components/shared/GurubaVerificationBadge';

export const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users = [], isLoading: usersLoading } = useQuery({
      queryKey: ['adminUsers'],
      queryFn: async () => {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        const { data: gurubas } = await supabase.from('gurubas').select('user_id, is_verified, guruba_type');
        
        return profiles?.map(p => ({
            ...p,
            gurubas: gurubas?.filter(g => g.user_id === p.id) || []
        })) || [];
      }
  });

  const addCreditsMutation = useMutation({
      mutationFn: async ({ userId, amount }: { userId: string, amount: number }) => {
          const { data: current } = await supabase.from('profiles').select('credits').eq('id', userId).single();
          const newBalance = (current?.credits || 0) + amount;
          const { error } = await supabase.from('profiles').update({ credits: newBalance }).eq('id', userId);
          if (error) throw error;
          
          await supabase.from('transactions').insert({
              user_id: userId,
              amount: amount,
              type: 'credit',
              description: 'Admin Top-up',
              status: 'completed'
          });
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      }
  });

  const handleAddCredits = (userId: string) => {
      const amount = prompt("Enter amount of credits to add:");
      if (amount && !isNaN(Number(amount))) {
          addCreditsMutation.mutate({ userId, amount: Number(amount) });
      }
  };

  const filteredUsers = useMemo(() => {
      return users.filter((u: any) => 
          u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [users, searchTerm]);

  if (usersLoading) return <div>Loading...</div>;

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-stone-900">User Details</h2>
                  <p className="text-stone-500">Comprehensive list of all users and their details.</p>
              </div>
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input 
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none transition-all"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-stone-50 text-stone-600 font-semibold uppercase text-xs tracking-wider">
                          <tr>
                              <th className="px-6 py-4">User</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4">Credits</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                          {filteredUsers.map((u: any) => (
                              <tr key={u.id} className="hover:bg-stone-50 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                          <span className="font-bold text-stone-900">{u.full_name}</span>
                                          <span className="text-xs text-stone-500">{u.email}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`uppercase text-[10px] font-bold px-2 py-1 rounded border ${
                                          u.role === 'admin' ? 'bg-stone-800 text-white border-stone-900' :
                                          u.role === 'guruba' ? 'bg-saffron-50 text-saffron-700 border-saffron-200' :
                                          'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                          {u.role}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold text-stone-700">
                                      {u.credits.toLocaleString()} CR
                                  </td>
                                  <td className="px-6 py-4">
                                      {u.role === 'guruba' && (
                                          u.gurubas?.[0]?.is_verified 
                                          ? <div className="flex items-center gap-2">
                                              <GurubaVerificationBadge isVerified={true} gurubaType={u.gurubas?.[0]?.guruba_type} />
                                              <span className="text-xs font-medium text-stone-600 capitalize">{u.gurubas[0].guruba_type?.replace('_', ' ')}</span>
                                            </div>
                                          : <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">Pending</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <Button size="sm" variant="outline" onClick={() => handleAddCredits(u.id)} title="Add Credits" className="opacity-0 group-hover:opacity-100 transition-opacity border-stone-300 hover:bg-stone-100">
                                          <PlusCircle className="h-4 w-4 mr-1" /> Add Credit
                                      </Button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );
};
