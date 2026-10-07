import { supabase } from './supabase';

export async function callRpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
  const {data,error}=await supabase.rpc(name,args);
  if(error) throw error;
  return data as T;
}

export const api={
  publicGurubas:()=>callRpc<unknown[]>('get_public_gurubas'),
  publicBookingOptions:(serviceId:string)=>callRpc<unknown>('get_public_booking_options',{p_service_id:serviceId}),
};
