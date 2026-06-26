export const runtime = 'edge';
import { Suspense } from 'react';
import { BookingFlow } from '@/features/booking/BookingFlow';
import { supabase } from '@/lib/supabaseClient';

export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) {
  const resolvedParams = await params;
  const { data: service } = await supabase.from('services').select('*').eq('id', resolvedParams.serviceId).single();
  
  if (!service) return <div className="text-center py-20">Service not found</div>;

  return (
    <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-500"></div></div>}>
      <BookingFlow service={service} />
    </Suspense>
  );
}
