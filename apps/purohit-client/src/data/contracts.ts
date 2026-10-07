import { supabase } from './supabase';

export type Profile={id:string;email?:string|null;full_name?:string|null;role:'client'|'guruba'|'admin';avatar_url?:string|null;phone?:string|null;gotra_id?:string|null;city?:string|null;languages?:string[]|null;latitude?:number|null;longitude?:number|null;address?:string|null;credits?:number|null};
export type Gotra={id:string;name:string};
export type Service={id:string;title:string;description?:string|null;duration_minutes:number;base_price:number;image_url?:string|null;category?:string|null;is_featured?:boolean|null;is_online_enabled?:boolean|null};
export type Guruba={guruba_id:string;user_id:string;full_name?:string|null;avatar_url?:string|null;bio?:string|null;years_experience?:number|null;rating?:number|null;location?:string|null;specialties?:string[]|null;languages?:string[]|null;guruba_type?:string|null;review_count?:number|null;is_verified?:boolean|null;gotra_id?:string|null};
export type Booking={id:string;user_id:string;guruba_id?:string|null;service_id?:string|null;scheduled_at?:string|null;status:string;proposed_time?:string|null;confirmation_deadline?:string|null;platform_fee?:number|null;meeting_link?:string|null;location_address?:string|null;is_online?:boolean|null;booking_note?:string|null;created_at?:string|null;is_reviewed?:boolean|null;services?:Service|null;gurubas?:Guruba|null;profiles?:Profile|null};
export type Transaction={id:string;user_id:string;amount:number;type:'credit'|'debit';description:string;status:'completed'|'pending'|'failed';created_at:string};
export type SavedLocation={id:string;user_id:string;name:string;latitude:number;longitude:number;address?:string|null;created_at:string};
export type LocationSearchResult={place_id?:string;display_name:string;lat:string;lon:string;type?:string;category?:string};
export type Message={id:string;sender_id:string;receiver_id:string;booking_id?:string|null;content:string;message_type:string;metadata?:Record<string,unknown>|null;is_system?:boolean|null;is_read:boolean;created_at:string};
export type Notification={id:string;user_id?:string|null;title:string;message:string;notification_type:string;action_url?:string|null;is_read:boolean;read_at?:string|null;created_at:string};
export type NotificationDevice={id:string;platform:'ios'|'android';device_id?:string|null;expo_project_id?:string|null;is_active:boolean;last_seen_at:string;created_at:string};
export type GurubaProfile={id:string;user_id:string;bio?:string|null;years_experience?:number|null;rating?:number|null;location?:string|null;specialties?:string[]|null;languages?:string[]|null;guruba_type?:string|null;review_count?:number|null;is_verified?:boolean|null;verification_requested_at?:string|null;profiles?:Profile|null};
export type Availability={id?:string;guruba_id:string;day_of_week:number;start_time:string;end_time:string};
export type GurubaService={guruba_id:string;service_id:string;is_online:boolean;custom_price?:number|null};
export type PublicBookingOption={guruba_id:string;service_id:string;is_online:boolean;custom_price?:number|null;guruba:{id:string;user_id:string;bio?:string|null;years_experience?:number|null;rating?:number|null;location?:string|null;specialties?:string[]|null;languages?:string[]|null;guruba_type?:string|null;review_count?:number|null;is_verified?:boolean|null;full_name?:string|null;avatar_url?:string|null};}
async function rpc<T>(name:string,args:Record<string,unknown>={}){const{data,error}=await supabase.rpc(name,args);if(error)throw error;return data as T;}

export const api={
getMyProfile:()=>rpc<Profile|null>('get_my_profile'),
getApprovedGotras:()=>rpc<Gotra[]>('get_approved_gotras'),
updateMyProfile:(i:{fullName?:string|null;phone?:string|null;gotraId?:string|null;city?:string|null;latitude?:number|null;longitude?:number|null;address?:string|null;languages?:string[]|null})=>rpc<unknown>('update_my_profile',{p_full_name:i.fullName??null,p_phone:i.phone??null,p_gotra_id:i.gotraId??null,p_avatar_url:null,p_city:i.city??null,p_latitude:i.latitude??null,p_longitude:i.longitude??null,p_address:i.address??null,p_languages:i.languages??null}),
requestGotra:(name:string)=>rpc<string>('request_gotra',{p_name:name}),
getPublicServices:()=>rpc<Service[]>('get_public_services'),
getPublicService:(serviceId:string)=>rpc<Service[]>('get_public_service',{p_service_id:serviceId}),
getPublicGurubas:()=>rpc<Guruba[]>('get_public_gurubas'),
getBookingOptions:(serviceId:string)=>rpc<PublicBookingOption[]>('get_public_booking_options',{p_service_id:serviceId}),
getMyBookings:(role:'client'|'guruba'='client')=>rpc<Booking[]>('get_my_bookings',{p_role:role}),
getMyTransactions:()=>rpc<Transaction[]>('get_my_transactions'),
getMySavedLocations:()=>rpc<SavedLocation[]>('get_my_saved_locations'),
searchLocations:async(query:string)=>{const q=query.trim();if(!q)return [];const{data,error}=await supabase.functions.invoke('location-provider',{body:{op:'search',q}});if(error)throw error;const rows=(data as {results?:unknown})?.results;return(Array.isArray(rows)?rows:[]) as LocationSearchResult[];},
getMessageUsers:()=>rpc<Profile[]>('get_my_message_users'),
getMessages:(otherUserId:string,bookingId?:string)=>rpc<Message[]>('get_my_messages',{p_other_user_id:otherUserId,p_booking_id:bookingId??null}),
getMyNotifications:async()=>{const{data,error}=await supabase.from('notifications').select('id,user_id,title,message,notification_type,action_url,is_read,read_at,created_at').order('created_at',{ascending:false}).limit(50);if(error)throw error;return(data??[]) as Notification[];},
getMyNotificationDevices:()=>rpc<NotificationDevice[]>('get_my_notification_devices'),
registerNotificationDevice:(i:{token:string;platform:'ios'|'android';deviceId?:string|null;projectId?:string|null})=>rpc<string>('register_my_notification_device',{p_token:i.token,p_platform:i.platform,p_device_id:i.deviceId??null,p_expo_project_id:i.projectId??null}),
removeNotificationDevice:(id:string)=>rpc<boolean>('remove_my_notification_device',{p_device_id:id}),
getAvailableSlots:(g:string,s:string,d:string)=>rpc<unknown[]>('get_available_booking_slots',{p_guruba_id:g,p_service_id:s,p_date:d}),
getMyGurubaProfile:()=>rpc<GurubaProfile[]>('get_my_guruba_profile'),
getMyGurubaServices:()=>rpc<GurubaService[]>('get_my_guruba_services'),
getMyAvailability:()=>rpc<Availability[]>('get_my_availability'),
bookService:(i:{userId:string;gurubaId:string;serviceId:string;scheduledAt?:string|null;platformFee:number;locationLat?:number|null;locationLng?:number|null;locationAddress?:string|null;proposedTime?:string|null;bookingNote?:string|null;isCustomBooking?:boolean;isOnline?:boolean;requestKey:string})=>rpc<unknown>('book_service_idempotent',{p_user_id:i.userId,p_guruba_id:i.gurubaId,p_service_id:i.serviceId,p_scheduled_at:i.scheduledAt??null,p_platform_fee:i.platformFee,p_location_lat:i.locationLat??null,p_location_lng:i.locationLng??null,p_location_address:i.locationAddress??null,p_proposed_time:i.proposedTime??null,p_booking_note:i.bookingNote??null,p_is_custom_booking:i.isCustomBooking??false,p_is_online:i.isOnline??false,p_request_key:i.requestKey}),
confirmBooking:(id:string)=>rpc<void>('confirm_booking',{p_booking_id:id}),
proposeBookingTime:(id:string,at:string,deadline?:string)=>rpc<void>('propose_booking_time',{p_booking_id:id,p_proposed_time:at,p_confirmation_deadline:deadline??null}),
respondBookingTime:(id:string,accept:boolean)=>rpc<void>('respond_booking_time',{p_booking_id:id,p_accept:accept}),
cancelBooking:(id:string)=>rpc<unknown>('cancel_booking',{p_booking_id:id}),
completeBooking:(id:string)=>rpc<boolean>('complete_booking',{p_booking_id:id}),
rescheduleBooking:(id:string,at:string)=>rpc<unknown>('reschedule_booking',{p_booking_id:id,p_new_scheduled_at:at}),
setBookingMeetingLink:(id:string,link:string)=>rpc<void>('set_booking_meeting_link',{p_booking_id:id,p_meeting_link:link}),
requestTopup:(amount:number)=>rpc<unknown>('request_topup',{p_amount:amount}),
saveLocation:(name:string,lat:number,lng:number,address?:string)=>rpc<unknown>('save_my_location',{p_name:name,p_latitude:lat,p_longitude:lng,p_address:address??null}),
deleteLocation:(id:string)=>rpc<unknown>('delete_my_location',{p_location_id:id}),
sendMessage:(receiverId:string,content:string,bookingId?:string)=>rpc<unknown>('send_message',{p_receiver_id:receiverId,p_content:content,p_booking_id:bookingId??null,p_message_type:'text',p_metadata:{}}),
markMessagesRead:(ids:string[])=>rpc<unknown>('mark_messages_read',{p_message_ids:ids}),
markNotificationRead:(id:string)=>rpc<void>('mark_notification_read',{notification_id:id}),
upsertGurubaProfile:(i:{bio:string;gurubaType:string;location:string;gotraId?:string|null;latitude?:number|null;longitude?:number|null;address?:string|null})=>rpc<unknown>('upsert_my_guruba_profile',{p_bio:i.bio,p_guruba_type:i.gurubaType,p_location:i.location,p_gotra_id:i.gotraId??null,p_latitude:i.latitude??null,p_longitude:i.longitude??null,p_address:i.address??null}),
setGurubaService:(serviceId:string,enabled:boolean,online:boolean)=>rpc<unknown>('set_my_guruba_service',{p_service_id:serviceId,p_enabled:enabled,p_online:online}),
setAvailability:(day:number,start:string,end:string)=>rpc<Availability>('set_my_availability_day',{p_day_of_week:day,p_start_time:start,p_end_time:end}),
deleteAvailability:(day:number)=>rpc<unknown>('delete_my_availability_day',{p_day_of_week:day})
};