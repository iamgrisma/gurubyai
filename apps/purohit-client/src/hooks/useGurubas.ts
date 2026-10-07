import { useQuery } from '@tanstack/react-query';
import { getPublicGurubas } from '../data/queries';

export function useGurubas() {
  return useQuery({ queryKey:['gurubas'], queryFn:getPublicGurubas, staleTime:60_000 });
}
