export const runtime = 'edge';
import { Metadata } from 'next';
import { ServiceDetailsPage } from '@/features/services/ServiceDetailsPage';
import { supabase } from '@/lib/supabaseClient';

export async function generateMetadata({ params }: { params: Promise<{ serviceId: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const { data: service } = await supabase
    .from('services')
    .select('title, description')
    .eq('id', resolvedParams.serviceId)
    .single();

  if (!service) {
    return { title: 'Service Not Found' };
  }

  return {
    title: `${service.title} | Guruba Services`,
    description: service.description,
    openGraph: {
      title: `${service.title} | Guruba Services`,
      description: service.description,
    }
  };
}

export default function Page() { return <ServiceDetailsPage />; }
