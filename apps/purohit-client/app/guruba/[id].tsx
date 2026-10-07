import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { theme } from '../../src/ui/theme';

export default function GurubaScreen() {
  const {id}=useLocalSearchParams<{id:string}>();
  return <ScrollView contentContainerStyle={s.container}><Text style={s.kicker}>GURUBA</Text><Text style={s.title}>Guruba profile</Text><Text style={s.muted}>Profile ID: {id}</Text><View style={s.card}><Text style={s.cardTitle}>Services</Text><Text style={s.muted}>Service catalog is loaded through backend projections as the next data slice is wired.</Text></View><Link href={{pathname:'/book/[serviceId]',params:{serviceId:'pending'}}} style={s.cta}>Continue to booking</Link></ScrollView>;
}
const s=StyleSheet.create({container:{padding:24,gap:16,backgroundColor:theme.colors.canvas,minHeight:'100%'},kicker:{fontSize:13,fontWeight:'800',letterSpacing:2,color:theme.colors.accent},title:{fontSize:32,fontWeight:'800',color:theme.colors.ink},muted:{color:theme.colors.muted},card:{padding:20,backgroundColor:theme.colors.surface,borderRadius:16,borderWidth:1,borderColor:theme.colors.line},cardTitle:{fontSize:20,fontWeight:'700',color:theme.colors.ink},cta:{backgroundColor:theme.colors.ink,color:'#fff',padding:16,borderRadius:14,fontWeight:'700',alignSelf:'stretch',textAlign:'center'}});
