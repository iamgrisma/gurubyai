
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { Button } from '../../../components/ui/Button';
import { Gotra } from '../../../types';
import { Trash2 } from 'lucide-react';

export const AdminGotras: React.FC = () => {
  const queryClient = useQueryClient();
  const [newGotraName, setNewGotraName] = useState('');

  const { data: gotras = [] } = useQuery({
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

  return (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-stone-900">Gotra Registry</h2>
                  <p className="text-stone-500">Manage approved Gotras for user profiles.</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (newGotraName.trim()) gotraMutation.mutate({ action: 'add', name: newGotraName.trim() }); }} className="flex gap-2">
                  <input 
                      className="border border-stone-300 rounded-lg px-4 py-2 text-sm bg-white text-stone-900 focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none shadow-sm" 
                      placeholder="Add new Gotra..." 
                      value={newGotraName} 
                      onChange={e => setNewGotraName(e.target.value)} 
                  />
                  <Button size="sm" type="submit">Add</Button>
              </form>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden max-w-3xl">
              <table className="w-full text-sm text-left">
                  <thead className="bg-stone-50 text-stone-600 font-semibold uppercase text-xs tracking-wider">
                      <tr>
                          <th className="px-6 py-4">Gotra Name</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                      {gotras.map(g => (
                          <tr key={g.id} className="hover:bg-stone-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-stone-900">{g.name}</td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${g.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {g.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  {g.status === 'pending' ? (
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => gotraMutation.mutate({id: g.id, action: 'approve'})} className="text-green-600 hover:text-green-800 font-bold text-xs">Approve</button>
                                          <button onClick={() => gotraMutation.mutate({id: g.id, action: 'reject'})} className="text-red-600 hover:text-red-800 font-bold text-xs">Reject</button>
                                      </div>
                                  ) : (
                                      <button onClick={() => gotraMutation.mutate({id: g.id, action: 'reject'})} className="text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );
};