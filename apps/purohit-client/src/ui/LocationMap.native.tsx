import{Platform,Pressable,StyleSheet,Text,View}from'react-native';import{Marker}from'react-native-maps';import MapView from'react-native-maps';import * as Linking from'expo-linking';

export function LocationMap({latitude,longitude,label}:{latitude:number;longitude:number;label?:string}){
  const region={latitude,longitude,latitudeDelta:0.008,longitudeDelta:0.008};
  const openMap=()=>Linking.openURL(`https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(latitude))}&mlon=${encodeURIComponent(String(longitude))}#map=16/${latitude}/${longitude}`).catch(()=>undefined);
  if(Platform.OS==='android'){
    return <View style={styles.fallback}><Text style={styles.title}>Location selected</Text><Text style={styles.coords}>{label??'Selected service location'}</Text><Text style={styles.coords}>{latitude.toFixed(5)}, {longitude.toFixed(5)}</Text><Pressable accessibilityRole="button" onPress={openMap} style={styles.button}><Text style={styles.buttonText}>Open map</Text></Pressable><Text style={styles.note}>Embedded Android maps require Google Maps API credentials. This build safely opens the selected location instead.</Text></View>;
  }
  return <MapView style={styles.map} initialRegion={region} scrollEnabled zoomEnabled rotateEnabled={false} pitchEnabled={false}><Marker coordinate={{latitude,longitude}} title={label??'Selected location'}/></MapView>;
}

const styles=StyleSheet.create({
  map:{width:'100%',height:220},
  fallback:{minHeight:180,borderRadius:14,borderWidth:1,borderColor:'#ddd',padding:16,gap:8,justifyContent:'center'},
  title:{fontSize:16,fontWeight:'800'},
  coords:{fontSize:13,color:'#555'},
  button:{minHeight:44,borderRadius:10,backgroundColor:'#111',alignItems:'center',justifyContent:'center',paddingHorizontal:14},
  buttonText:{color:'#fff',fontWeight:'800'},
  note:{fontSize:11,color:'#666',lineHeight:16}
});