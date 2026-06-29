"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Gotra } from '../../../types';
import { Trash2, CheckCircle, XCircle, Search } from 'lucide-react';

export const AdminGotras: React.FC = () => {
  const queryClient = useQueryClient();
  const [newGotraName, setNewGotraName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: gotras = [], isLoading } = useQuery({
      queryKey: ['adminGotras'],
      queryFn: async () => {
          const { data } = await supabase.from('gotras').select('*').order('name');
          return (data || []) as Gotra[];
      }
  });

  const gotraMutation = useMutation({
      mutationFn: async ({ id, action, name }: { id?: string, action: 'approve' | 'reject' | 'add', name?: string }) => {
          if (action === 'add' && name) {
              await supabase.from('gotras').insert({ name, status: 'approved' });
          } else if (action === 'approve' && id) {
              await supabase.from('gotras').update({ status: 'approved' }).eq('id', id);
          } else if (action === 'reject' && id) {
              await supabase.from('gotras').delete().eq('id', id);
          }
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminGotras'] });
          setNewGotraName('');
      }
  });

  const filteredGotras = gotras.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-stone-900">Gotra Registry</h2>
                  <p className="text-stone-500">Manage approved Gotras for user profiles.</p>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); if (newGotraName.trim()) gotraMutation.mutate({ action: 'add', name: newGotraName.trim() }); }} className="flex w-full md:w-auto gap-2">
                  <input 
                      className="flex-1 md:w-64 border border-stone-200 rounded-xl px-4 py-2 text-sm bg-white/50 backdrop-blur text-stone-900 focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none shadow-sm transition-all" 
                      placeholder="Add new Gotra..." 
                      value={newGotraName} 
                      onChange={e => setNewGotraName(e.target.value)} 
                  />
                  <Button className="rounded-xl px-6 bg-stone-900 hover:bg-stone-800" type="submit">Add</Button>
              </form>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                  <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input 
                          className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-saffron-500 outline-none transition-all"
                          placeholder="Search gotras..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[600px] p-4 sm:p-6">
                  {isLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {Array(6).fill(0).map((_, i) => (
                              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-2xl w-full"></div>
                          ))}
                      </div>
                  ) : filteredGotras.length === 0 ? (
                      <div className="py-12 text-center text-stone-500">No Gotras found matching your criteria.</div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {filteredGotras.map(g => (
                              <div key={g.id} className="bg-white border border-stone-100 hover:border-saffron-200 hover:shadow-md transition-all rounded-2xl p-4 flex items-center justify-between group">
                                  <div className="flex flex-col">
                                      <span className="font-bold text-stone-900 text-lg group-hover:text-saffron-700 transition-colors">{g.name}</span>
                                      <span className={`text-[10px] font-black uppercase tracking-wider ${g.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                                          {g.status}
                                      </span>
                                  </div>
                                  
                                  <div>
                                      {g.status === 'pending' ? (
                                          <div className="flex items-center gap-1">
                                              <button onClick={() => gotraMutation.mutate({id: g.id, action: 'approve'})} className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-colors" title="Approve">
                                                  <CheckCircle className="h-5 w-5" />
                                              </button>
                                              <button onClick={() => gotraMutation.mutate({id: g.id, action: 'reject'})} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors" title="Reject">
                                                  <XCircle className="h-5 w-5" />
                                              </button>
                                          </div>
                                      ) : (
                                          <button onClick={() => gotraMutation.mutate({id: g.id, action: 'reject'})} className="p-2 text-stone-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors" title="Delete">
                                              <Trash2 className="h-5 w-5" />
                                          </button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};