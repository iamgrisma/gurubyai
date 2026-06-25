import { Metadata } from 'next';
import { ServiceSelection } from '@/features/booking/ServiceSelection';
import { PAGE_SEO } from '@/lib/seo-config';

export const metadata: Metadata = {
  title: PAGE_SEO.services.title,
  description: PAGE_SEO.services.description,
  keywords: PAGE_SEO.services.keywords,
};

export default function Page() { return <ServiceSelection />; }
