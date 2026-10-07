import{Platform}from'react-native';import * as Device from'expo-device';import * as Notifications from'expo-notifications';import Constants from'expo-constants';

Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:true,shouldShowBanner:true,shouldShowList:true})});

export async function registerForPushNotifications(options:{requestPermission?:boolean}={}):Promise<{token:string;projectId:string}|null>{
  if(Platform.OS==='web'||!Device.isDevice)return null;
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('default',{name:'Purohit notifications',importance:Notifications.AndroidImportance.DEFAULT});
  const permission=await Notifications.getPermissionsAsync();
  let status=permission.status;
  if(status!=='granted'&&options.requestPermission===true)status=(await Notifications.requestPermissionsAsync()).status;
  if(status!=='granted')return null;
  const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
  if(!projectId)return null;
  const token=await Notifications.getExpoPushTokenAsync({projectId});
  return token.data?{token:token.data,projectId}:null;
}

function getActionUrl(response:Notifications.NotificationResponse){const data=response.notification.request.content.data as Record<string,unknown>|undefined;const value=data?.action_url??data?.url;return typeof value==='string'&&value.startsWith('/')?value:null;}

export async function getInitialNotificationUrl(){if(Platform.OS==='web')return null;const response=await Notifications.getLastNotificationResponseAsync();return response?getActionUrl(response):null;}

export function subscribeToNotificationInteractions(onUrl:(url:string)=>void){if(Platform.OS==='web')return()=>{};const sub=Notifications.addNotificationResponseReceivedListener(response=>{const url=getActionUrl(response);if(url)onUrl(url);});return()=>sub.remove();}