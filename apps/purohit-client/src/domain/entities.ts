export type AppRole = 'client' | 'guruba' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | string;

export type GurubaSummary = { id:string; name:string|null; location:string|null; avatar_url:string|null; };
export type ServiceSummary = { id:string; name:string|null; description:string|null; credits:number|null; };
export type BookingSummary = { id:string; status:BookingStatus; scheduled_at:string|null; service_name:string|null; guruba_name:string|null; total_credits:number|null; };
