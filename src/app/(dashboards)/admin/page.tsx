import type { Metadata } from 'next';
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
