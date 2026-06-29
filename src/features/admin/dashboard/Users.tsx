"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Search, PlusCircle, KeyRound } from 'lucide-react';
import { GurubaVerificationBadge } from '../../../components/shared/GurubaVerificationBadge';
import { Pagination } from '../../../components/ui/Pagination';

const ITEMS_PER_PAGE = 10;

export const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Handle Search Change (Reset Page)
  const handleSearch = (term: string) => {
      setSearchTerm(term);
      setPage(1);
  };

  // Server-side Pagination & Search Query
  const { data, isLoading: usersLoading } = useQuery({
      queryKey: ['adminUsers', page, searchTerm],
      queryFn: async () => {
        let query = supabase.from('profiles').select('*', { count: 'exact' });

        // Apply Search (Server-side)
        if (searchTerm) {
            // Search by email or name
            query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
        }

        // Apply Pagination
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        
        const { data: profiles, count, error } = await query
            .range(from, to)
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        // Fetch associated guruba details for ONLY the displayed profiles
        // This avoids fetching the entire guruba table
        const profileIds = profiles?.map(p => p.id) || [];
        const { data: gurubas } = await supabase
            .from('gurubas')
            .select('user_id, is_verified, guruba_type')
            .in('user_id', profileIds);
        
        const mappedUsers = profiles?.map(p => ({
            ...p,
            gurubas: gurubas?.filter(g => g.user_id === p.id) || []
        })) || [];

        return { users: mappedUsers, total: count || 0 };
      },
      placeholderData: keepPreviousData // Keep showing old data while fetching new page
  });

  const users = data?.users || [];
  const totalUsers = data?.total || 0;

  const addCreditsMutation = useMutation({
      mutationFn: async ({ userId, amount }: { userId: string, amount: number }) => {
          const { error } = await supabase.rpc('admin_add_credits', {
              target_user_id: userId,
              amount: amount
          });
          if (error) throw error;
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
          alert("Credits added successfully.");
      },
      onError: (e: any) => alert("Error adding credits: " + e.message)
  });

  const resetPasswordMutation = useMutation({
      mutationFn: async (email: string) => {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/login`
          });
          if (error) throw error;
      },
      onSuccess: () => {
          alert("Password reset email sent to user.");
      },
      onError: (e: any) => {
          alert("Failed to send reset email: " + e.message);
      }
  });

  const handleAddCredits = (userId: string) => {
      const amount = prompt("Enter amount of credits to add:");
      if (amount && !isNaN(Number(amount))) {
          addCreditsMutation.mutate({ userId, amount: Number(amount) });
      }
  };

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-stone-900">User Details</h2>
                  <p className="text-stone-500">Manage users and permissions.</p>
              </div>
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input 
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none transition-all"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                  />
              </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                  {usersLoading ? (
                      <div className="p-8 space-y-4">
                          {Array(4).fill(0).map((_, i) => (
                              <div key={i} className="h-20 bg-stone-100 animate-pulse rounded-2xl w-full"></div>
                          ))}
                      </div>
                  ) : users.length === 0 ? (
                      <div className="p-8 text-center text-stone-500">No users found.</div>
                  ) : (
                      <div className="divide-y divide-stone-100">
                          {users.map((u: any) => (
                              <div key={u.id} className="p-4 sm:p-6 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-royal-100 to-royal-200 flex items-center justify-center text-royal-700 font-bold text-lg shrink-0">
                                          {u.full_name?.charAt(0) || 'U'}
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-stone-900 text-lg">{u.full_name}</span>
                                              <span className={`uppercase text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                                  u.role === 'admin' ? 'bg-royal-900 text-white border-royal-950' :
                                                  u.role === 'guruba' ? 'bg-saffron-100 text-saffron-800 border-saffron-200' :
                                                  'bg-stone-100 text-stone-700 border-stone-200'
                                              }`}>
                                                  {u.role}
                                              </span>
                                          </div>
                                          <span className="text-sm text-stone-500">{u.email}</span>
                                      </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 pt-4 sm:pt-0 border-stone-100">
                                      <div className="flex flex-col sm:items-end">
                                          <span className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-0.5">Credits</span>
                                          <span className="font-mono font-bold text-stone-700 text-lg">
                                              {(u.credits || 0).toLocaleString()}
                                          </span>
                                      </div>
                                      
                                      {u.role === 'guruba' && (
                                          <div className="flex flex-col sm:items-end hidden sm:flex">
                                              <span className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-0.5">Verification</span>
                                              {u.gurubas?.[0]?.is_verified 
                                                  ? <GurubaVerificationBadge isVerified={true} gurubaType={u.gurubas?.[0]?.guruba_type} />
                                                  : <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-bold">Pending</span>
                                              }
                                          </div>
                                      )}

                                      <div className="flex items-center gap-2">
                                          <Button size="sm" variant="outline" onClick={() => resetPasswordMutation.mutate(u.email)} title="Reset Password" className="rounded-xl border-stone-200 hover:bg-stone-100 text-stone-500 w-10 h-10 p-0 flex items-center justify-center">
                                              <KeyRound className="h-4 w-4" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => handleAddCredits(u.id)} title="Add Credits" className="rounded-xl border-stone-200 hover:bg-stone-100 text-stone-700 font-bold px-4 h-10">
                                              <PlusCircle className="h-4 w-4 mr-2 text-saffron-500" /> Top-up
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
                  totalItems={totalUsers}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setPage}
              />
          </div>
      </div>
  );
};
