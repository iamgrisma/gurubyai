import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';

async function publicRpc<T>(name:string):Promise<T>{
  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) throw new Error('Static public RPC ' + name + ' failed: ' + response.status);
  return response.json() as Promise<T>;
}

export type StaticPublicService = { id:string };
export type StaticPublicGuruba = { guruba_id:string };

export const getStaticPublicServices = () => publicRpc<StaticPublicService[]>('get_public_services');
export const getStaticPublicGurubas = () => publicRpc<StaticPublicGuruba[]>('get_public_gurubas');
