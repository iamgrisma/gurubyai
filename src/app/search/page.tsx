import { Metadata } from 'next';
import { AdvancedSearch } from '@/features/search/AdvancedSearch';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Search Services & Gurubas | Guruba',
  description: 'Search for the perfect spiritual guide. Filter by location, price, rating, and service type.',
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-500"></div></div>}>
        <AdvancedSearch />
      </Suspense>
    </div>
  );
}
