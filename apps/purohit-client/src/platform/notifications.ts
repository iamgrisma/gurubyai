import{Platform}from'react-native';import * as Device from'expo-device';import * as Notifications from'expo-notifications';import Constants from'expo-constants';

Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowAlert:true,shouldPlaySound:true,shouldSetBadge:false})});

export async function registerForPushNotifications(){if(Platform.OS==='web'||!Device.isDevice)return null;const permission=await Notifications.getPermissionsAsync();let status=permission.status;if(status!=='granted'){status=(await Notifications.requestPermissionsAsync()).status}if(status!=='granted')return null;const projectId=Constants.expoConfig?.extra?.eas?.projectId;if(!projectId)return null;const token=await Notifications.getExpoPushTokenAsync({projectId});return token.data;}