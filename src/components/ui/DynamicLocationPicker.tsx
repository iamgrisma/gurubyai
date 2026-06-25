import dynamic from 'next/dynamic';

export const LocationPicker = dynamic(
  () => import('./LocationPicker').then((mod) => mod.LocationPicker),
  { ssr: false }
);
