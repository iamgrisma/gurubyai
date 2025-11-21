
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Transaction } from '../../../types';

export const AdminFinancials: React.FC = () => {
  
  const { data: transactions = [] } = useQuery({
      queryKey: ['adminTransactions'],
      queryFn: async () => {
          const { data } = await supabase.from('transactions').select('*, profiles:user_id(full_name)').order('created_at', { ascending: false }).limit(50);
          return (data || []) as (Transaction & { profiles: { full_name: string } })[];
      }
  });

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div>
              <h2 className="text-2xl font-bold text-stone-900">Financial Overview</h2>
              <p className="text-stone-500">Monitor platform credits and transactions.</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
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
                      {transactions.map(t => (
                          <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                              <td className="px-6 py-4 text-stone-900 font-medium">{new Date(t.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4">
                                  <p className="text-stone-900 font-medium">{t.profiles?.full_name}</p>
                                  <p className="text-xs text-stone-500 font-mono">{t.user_id.split('-')[0]}...</p>
                              </td>
                              <td className="px-6 py-4 text-stone-600">{t.description}</td>
                              <td className={`px-6 py-4 text-right font-bold font-mono ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.type === 'credit' ? '+' : '-'}{t.amount} CR
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );
};