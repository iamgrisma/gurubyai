"use client";

import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Transaction } from '../../../types';
import { Pagination } from '../../../components/ui/Pagination';
import { ArrowDownLeft, ArrowUpRight, Calendar, FileText } from 'lucide-react';

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
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                      <div className="p-8 space-y-4">
                          {Array(5).fill(0).map((_, i) => (
                              <div key={i} className="h-20 bg-stone-100 animate-pulse rounded-2xl w-full"></div>
                          ))}
                      </div>
                  ) : transactions.length === 0 ? (
                      <div className="p-8 text-center text-stone-500">No transactions found.</div>
                  ) : (
                      <div className="divide-y divide-stone-100">
                          {transactions.map(t => (
                              <div key={t.id} className="p-4 sm:p-6 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                                          t.type === 'credit' 
                                          ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700' 
                                          : 'bg-gradient-to-br from-red-100 to-rose-200 text-red-700'
                                      }`}>
                                          {t.type === 'credit' ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownLeft className="h-6 w-6" />}
                                      </div>
                                      <div>
                                          <p className="font-bold text-stone-900 text-lg">{t.profiles?.full_name || 'System / Unknown'}</p>
                                          <div className="flex items-center gap-2 text-sm text-stone-500">
                                              <span className="flex items-center gap-1 font-mono text-xs"><FileText className="h-3 w-3" /> {t.user_id.split('-')[0]}...</span>
                                              <span className="text-stone-300">•</span>
                                              <span className="flex items-center gap-1">
                                                  <Calendar className="h-3 w-3" />
                                                  {new Date(t.created_at).toLocaleDateString()}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-col sm:items-end border-t sm:border-0 pt-4 sm:pt-0 border-stone-100">
                                      <span className="text-sm text-stone-500 mb-1 line-clamp-1">{t.description}</span>
                                      <span className={`font-mono font-bold text-xl ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                          {t.type === 'credit' ? '+' : '-'}{(t.amount || 0).toLocaleString()} CR
                                      </span>
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
