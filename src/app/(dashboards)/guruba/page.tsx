import { Suspense } from 'react';
import { GurubaDashboard } from '@/features/guruba/GurubaDashboard';
export default function Page() { return <Suspense fallback={null}><GurubaDashboard /></Suspense>; }
