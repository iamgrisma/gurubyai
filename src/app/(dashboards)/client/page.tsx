import { ClientDashboard } from '@/features/client/ClientDashboard';
import { Suspense } from 'react';

export default function Page() { return <Suspense fallback={null}><ClientDashboard /></Suspense>; }
