import { Suspense } from 'react';
import { GurubaSelection } from '@/features/booking/GurubaSelection';
export default function Page() { return <Suspense fallback={null}><GurubaSelection /></Suspense>; }
