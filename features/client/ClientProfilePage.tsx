// features/client/ClientProfilePage.tsx

import React from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useProfile } from '../../hooks/queries';
import { DashboardProfile } from './dashboard/Profile';

/**
 * Standalone Client Profile Page
 * This wraps the DashboardProfile component for use as a standalone page
 */
export const ClientProfilePage: React.FC = () => {
    const { user } = useAuth();
    const { data: profile } = useProfile(user?.id);

    return (
        <div className="min-h-screen bg-stone-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <DashboardProfile user={user} profile={profile || null} />
            </div>
        </div>
    );
};
