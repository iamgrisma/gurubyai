import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { Suspense } from 'react';

export default function Page() { return <Suspense fallback={null}><AdminDashboard /></Suspense>; }
