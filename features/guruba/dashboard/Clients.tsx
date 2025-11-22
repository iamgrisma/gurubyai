
import React from 'react';
import { Booking } from '../../../types';

interface ClientsProps {
  bookings: Booking[];
}

export const GurubaClients: React.FC<ClientsProps> = ({ bookings }) => {
  
  const getUniqueClients = () => {
      const clients: {[key: string]: any} = {};
      bookings.forEach(b => {
          if (!b.profiles) return;
          if (!clients[b.profiles.id]) {
              clients[b.profiles.id] = {
                  ...b.profiles,
                  total_spend: 0,
                  booking_count: 0,
                  last_booking: b.scheduled_at
              };
          }
          clients[b.profiles.id].booking_count++;
          if (b.status === 'completed') {
             clients[b.profiles.id].total_spend += (b.services?.base_price || 0);
          }
          if (new Date(b.scheduled_at) > new Date(clients[b.profiles.id].last_booking)) {
              clients[b.profiles.id].last_booking = b.scheduled_at;
          }
      });
      return Object.values(clients);
  };

  const uniqueClients = getUniqueClients();

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <h2 className="text-2xl font-bold text-stone-900">My Clients</h2>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3 text-left">Client</th>
                        <th className="px-6 py-3 text-left">Last Booking</th>
                        <th className="px-6 py-3 text-right">Total Dakshina</th>
                    </tr>
                </thead>
                <tbody>
                    {uniqueClients.map(c => (
                        <tr key={c.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                            <td className="px-6 py-4">
                                <p className="font-bold text-stone-900">{c.full_name}</p>
                                <p className="text-xs text-stone-500">{c.email}</p>
                            </td>
                            <td className="px-6 py-4 text-stone-600">{new Date(c.last_booking).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right font-bold text-green-700">Rs. {(c.total_spend || 0).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
