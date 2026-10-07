import{Platform}from'react-native';import * as Location from'expo-location';import{supabase}from'../data/supabase';

export type CurrentLocationSelection={latitude:number;longitude:number;address:string};

export async function getCurrentLocationSelection():Promise<CurrentLocationSelection|null>{
  if(Platform.OS!=='ios'&&Platform.OS!=='android')return null;
  const permission=await Location.getForegroundPermissionsAsync();
  if(!permission.granted){
    const requested=await Location.requestForegroundPermissionsAsync();
    if(!requested.granted)return null;
  }
  if(!(await Location.hasServicesEnabledAsync()))throw new Error('Turn on device location services, then try again.');
  const current=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
  const latitude=current.coords.latitude;
  const longitude=current.coords.longitude;
  const{data,error}=await supabase.functions.invoke('location-provider',{body:{op:'reverse',lat:latitude,lon:longitude}});
  if(error)throw error;
  const address=typeof data?.display_name==='string'?data.display_name:String(latitude)+', '+String(longitude);
  return{latitude,longitude,address};
}