import React from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';

export const ClientDashboard: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Welcome back, {profile?.email}</h1>
            <p className="text-stone-600">Manage your bookings and profile settings.</p>
          </div>
          <Button>Book New Service</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder Cards */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="font-semibold text-stone-900">Upcoming Bookings</h3>
            <p className="mt-2 text-sm text-stone-500">You have no upcoming rituals scheduled.</p>
          </div>
          
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="font-semibold text-stone-900">Past Services</h3>
            <p className="mt-2 text-sm text-stone-500">View history of performed pujas.</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="font-semibold text-stone-900">My Profile</h3>
            <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-stone-500">Gotra:</span>
                    <span className="font-medium">{profile?.gotra_id || 'Not Set'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-stone-500">Phone:</span>
                    <span className="font-medium">{profile?.phone || 'Not Set'}</span>
                </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">Edit Profile</Button>
          </div>
        </div>
      </div>
    </div>
  );
};