import { Metadata } from 'next';
import { GurubaDirectory } from '@/features/public/GurubaDirectory';

export const metadata: Metadata = {
  title: 'Find a Guruba | Book verified Pandits and Lamas',
  description: 'Browse verified Gurubas, Pandits, and Lamas based on their expertise, location, and community ratings. Book authentic spiritual services instantly.',
  openGraph: {
    title: 'Find a Guruba | Book verified Pandits and Lamas',
    description: 'Browse verified Gurubas, Pandits, and Lamas based on their expertise, location, and community ratings.',
  }
};

export default function Page() { return <GurubaDirectory />; }
