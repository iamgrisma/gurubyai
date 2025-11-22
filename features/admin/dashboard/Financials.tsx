
import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Transaction } from '../../../types';
import { Pagination } from '../../../components/ui/Pagination';

const ITEMS_PER_PAGE = 15;

export const AdminFinancials: React.FC = () => {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useQuery({
      queryKey: ['adminTransactions', page],
      queryFn: async () => {
          const from = (page - 1) * ITEMS_PER_PAGE;
          const to = from + ITEMS_PER_PAGE - 1;

          const { data, count, error } = await supabase
            .from('transactions')
            .select('*, profiles:user_id(full_name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
          
          if (error) throw error;

          return { 
              transactions: (data || []) as (Transaction & { profiles: { full_name: string } })[],
              total: count || 0
          };
      },
      placeholderData: keepPreviousData
  });

  const transactions = data?.transactions || [];
  const totalItems = data?.total || 0;

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div>
              <h2 className="text-2xl font-bold text-stone-900">Financial Overview</h2>
              <p className="text-stone-500">Monitor platform credits and transactions.</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-stone-50 text-stone-600 font-semibold uppercase text-xs tracking-wider">
                          <tr>
                              <th className="px-6 py-4">Date</th>
                              <th className="px-6 py-4">User</th>
                              <th className="px-6 py-4">Description</th>
                              <th className="px-6 py-4 text-right">Amount</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                          {isLoading ? (
                              <tr><td colSpan={4} className="p-8 text-center text-stone-500">Loading...</td></tr>
                          ) : transactions.length === 0 ? (
                              <tr><td colSpan={4} className="p-8 text-center text-stone-500">No transactions found.</td></tr>
                          ) : (
                              transactions.map(t => (
                                  <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                                      <td className="px-6 py-4 text-stone-900 font-medium">{new Date(t.created_at).toLocaleDateString()}</td>
                                      <td className="px-6 py-4">
                                          <p className="text-stone-900 font-medium">{t.profiles?.full_name}</p>
                                          <p className="text-xs text-stone-500 font-mono">{t.user_id.split('-')[0]}...</p>
                                      </td>
                                      <td className="px-6 py-4 text-stone-600">{t.description}</td>
                                      <td className={`px-6 py-4 text-right font-bold font-mono ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                          {t.type === 'credit' ? '+' : '-'}{(t.amount || 0).toLocaleString()} CR
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
